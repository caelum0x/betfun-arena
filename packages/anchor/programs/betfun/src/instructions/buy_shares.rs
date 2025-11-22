use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use crate::state::{Arena, OutcomeShare, ShareBalance};
use crate::error::BetFunError;

/// Buy outcome shares with SOL
/// Mints new share tokens to the buyer
#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(
        seeds = [
            b"arena",
            arena.creator.as_ref(),
            arena.title.as_bytes()
        ],
        bump = arena.bump
    )]
    pub arena: Account<'info, Arena>,
    
    #[account(
        mut,
        seeds = [
            b"outcome_share",
            arena.key().as_ref(),
            &[outcome_share.outcome_index]
        ],
        bump = outcome_share.bump,
        constraint = outcome_share.arena == arena.key() @ BetFunError::InvalidConfiguration
    )]
    pub outcome_share: Account<'info, OutcomeShare>,
    
    #[account(
        mut,
        constraint = share_mint.key() == outcome_share.token_mint @ BetFunError::InvalidConfiguration
    )]
    pub share_mint: Account<'info, Mint>,
    
    /// User's share balance account
    #[account(
        init_if_needed,
        payer = buyer,
        space = ShareBalance::SIZE,
        seeds = [
            b"share_balance",
            outcome_share.key().as_ref(),
            buyer.key().as_ref()
        ],
        bump
    )]
    pub share_balance: Account<'info, ShareBalance>,
    
    /// User's token account to receive shares
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = share_mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    /// Buyer pays SOL
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    /// Arena escrow receives SOL
    /// CHECK: Arena PDA validated by seeds
    #[account(
        mut,
        seeds = [
            b"arena",
            arena.creator.as_ref(),
            arena.title.as_bytes()
        ],
        bump = arena.bump
    )]
    pub arena_escrow: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<BuyShares>,
    amount: u64, // Number of shares to buy
) -> Result<()> {
    let arena = &ctx.accounts.arena;
    let outcome_share = &mut ctx.accounts.outcome_share;
    let share_balance = &mut ctx.accounts.share_balance;
    let current_time = Clock::get()?.unix_timestamp;
    
    // ========== VALIDATION ==========
    
    // Arena must not be resolved
    require!(
        !arena.resolved,
        BetFunError::AlreadyResolved
    );
    
    // Arena must not have ended
    require!(
        !arena.has_ended(current_time),
        BetFunError::ArenaEnded
    );
    
    // Amount must be positive
    require!(
        amount > 0,
        BetFunError::InvalidConfiguration
    );
    
    // Calculate cost in SOL
    let price = outcome_share.current_price;
    let cost = (amount as u128 * price as u128) / 1_000_000_000;
    require!(
        cost <= u64::MAX as u128,
        BetFunError::ArithmeticOverflow
    );
    let cost = cost as u64;
    
    // Check buyer has sufficient balance
    let buyer_balance = ctx.accounts.buyer.lamports();
    let rent_exempt = Rent::get()?.minimum_balance(0);
    require!(
        buyer_balance >= cost + rent_exempt,
        BetFunError::InsufficientEntryFee
    );
    
    // ========== TRANSFER SOL TO ESCROW ==========
    
    // Transfer SOL from buyer to arena escrow
    **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= cost;
    **ctx.accounts.arena_escrow.to_account_info().try_borrow_mut_lamports()? += cost;
    
    // ========== MINT SHARE TOKENS ==========
    
    // Mint shares to buyer's token account
    let arena_key = arena.key();
    let outcome_index_bytes = [outcome_share.outcome_index];
    let seeds = &[
        b"outcome_share",
        arena_key.as_ref(),
        outcome_index_bytes.as_ref(),
        &[outcome_share.bump],
    ];
    let signer = &[&seeds[..]];
    
    let cpi_accounts = MintTo {
        mint: ctx.accounts.share_mint.to_account_info(),
        to: ctx.accounts.buyer_token_account.to_account_info(),
        authority: outcome_share.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    
    token::mint_to(cpi_ctx, amount)?;
    
    // ========== UPDATE STATISTICS ==========
    
    // Update outcome share stats
    outcome_share.total_supply = outcome_share.total_supply
        .checked_add(amount)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    outcome_share.update_price_stats(price, current_time);
    outcome_share.add_volume(cost);
    
    // Initialize share balance if needed
    if share_balance.owner == Pubkey::default() {
        share_balance.owner = ctx.accounts.buyer.key();
        share_balance.outcome_share = outcome_share.key();
        share_balance.balance = 0;
        share_balance.avg_cost_basis = 0;
        share_balance.total_invested = 0;
        share_balance.realized_pnl = 0;
        share_balance.bump = ctx.bumps.share_balance;
    }
    
    // Update user's share balance
    share_balance.buy_shares(amount, price);
    
    // ========== LOGGING ==========
    
    msg!("Shares purchased successfully");
    msg!("Buyer: {}", ctx.accounts.buyer.key());
    msg!("Outcome: {} ({})", 
        outcome_share.outcome_index,
        arena.outcomes[outcome_share.outcome_index as usize]
    );
    msg!("Amount: {} shares", amount);
    msg!("Price: {} lamports ({:.4} SOL) per share", price, price as f64 / 1e9);
    msg!("Total cost: {} lamports ({:.4} SOL)", cost, cost as f64 / 1e9);
    msg!("New balance: {} shares", share_balance.balance);
    msg!("Total supply: {} shares", outcome_share.total_supply);
    
    // ========== EMIT EVENT ==========
    
    emit!(SharesPurchased {
        arena: arena.key(),
        buyer: ctx.accounts.buyer.key(),
        outcome_index: outcome_share.outcome_index,
        amount,
        price,
        total_cost: cost,
        new_balance: share_balance.balance,
    });
    
    Ok(())
}

#[event]
pub struct SharesPurchased {
    pub arena: Pubkey,
    pub buyer: Pubkey,
    pub outcome_index: u8,
    pub amount: u64,
    pub price: u64,
    pub total_cost: u64,
    pub new_balance: u64,
}

