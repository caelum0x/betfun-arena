use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};
use crate::state::{Arena, OutcomeShare, ShareBalance};
use crate::error::BetFunError;

/// Sell outcome shares for SOL
/// Burns share tokens and returns SOL to seller
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct SellShares<'info> {
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
        mut,
        seeds = [
            b"share_balance",
            outcome_share.key().as_ref(),
            seller.key().as_ref()
        ],
        bump = share_balance.bump,
        constraint = share_balance.owner == seller.key() @ BetFunError::NotParticipant
    )]
    pub share_balance: Account<'info, ShareBalance>,
    
    /// User's token account holding shares
    #[account(
        mut,
        associated_token::mint = share_mint,
        associated_token::authority = seller,
        constraint = seller_token_account.amount >= amount @ BetFunError::InsufficientEntryFee
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    
    /// Seller receives SOL
    #[account(mut)]
    pub seller: Signer<'info>,
    
    /// Arena escrow pays SOL
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
}

pub fn handler(
    ctx: Context<SellShares>,
    amount: u64, // Number of shares to sell
) -> Result<()> {
    let arena = &ctx.accounts.arena;
    let outcome_share = &mut ctx.accounts.outcome_share;
    let share_balance = &mut ctx.accounts.share_balance;
    let current_time = Clock::get()?.unix_timestamp;
    
    // ========== VALIDATION ==========
    
    // Arena must not be resolved (can't sell after resolution)
    require!(
        !arena.resolved,
        BetFunError::AlreadyResolved
    );
    
    // Amount must be positive
    require!(
        amount > 0,
        BetFunError::InvalidConfiguration
    );
    
    // User must have sufficient shares
    require!(
        share_balance.balance >= amount,
        BetFunError::InsufficientEntryFee
    );
    
    // Calculate proceeds in SOL
    let price = outcome_share.current_price;
    let proceeds = (amount as u128 * price as u128) / 1_000_000_000;
    require!(
        proceeds <= u64::MAX as u128,
        BetFunError::ArithmeticOverflow
    );
    let proceeds = proceeds as u64;
    
    // Check escrow has sufficient balance
    let escrow_balance = ctx.accounts.arena_escrow.lamports();
    require!(
        escrow_balance >= proceeds,
        BetFunError::InsufficientEntryFee
    );
    
    // ========== BURN SHARE TOKENS ==========
    
    // Burn shares from seller's token account
    let cpi_accounts = Burn {
        mint: ctx.accounts.share_mint.to_account_info(),
        from: ctx.accounts.seller_token_account.to_account_info(),
        authority: ctx.accounts.seller.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    token::burn(cpi_ctx, amount)?;
    
    // ========== TRANSFER SOL TO SELLER ==========
    
    // Transfer SOL from escrow to seller
    **ctx.accounts.arena_escrow.to_account_info().try_borrow_mut_lamports()? -= proceeds;
    **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += proceeds;
    
    // ========== UPDATE STATISTICS ==========
    
    // Update outcome share stats
    outcome_share.total_supply = outcome_share.total_supply
        .checked_sub(amount)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    outcome_share.update_price_stats(price, current_time);
    outcome_share.add_volume(proceeds);
    
    // Update user's share balance and P&L
    share_balance.sell_shares(amount, price)?;
    
    // ========== LOGGING ==========
    
    msg!("Shares sold successfully");
    msg!("Seller: {}", ctx.accounts.seller.key());
    msg!("Outcome: {} ({})", 
        outcome_share.outcome_index,
        arena.outcomes[outcome_share.outcome_index as usize]
    );
    msg!("Amount: {} shares", amount);
    msg!("Price: {} lamports ({:.4} SOL) per share", price, price as f64 / 1e9);
    msg!("Total proceeds: {} lamports ({:.4} SOL)", proceeds, proceeds as f64 / 1e9);
    msg!("New balance: {} shares", share_balance.balance);
    msg!("Realized P&L: {} lamports", share_balance.realized_pnl);
    msg!("Total supply: {} shares", outcome_share.total_supply);
    
    // ========== EMIT EVENT ==========
    
    emit!(SharesSold {
        arena: arena.key(),
        seller: ctx.accounts.seller.key(),
        outcome_index: outcome_share.outcome_index,
        amount,
        price,
        total_proceeds: proceeds,
        new_balance: share_balance.balance,
        realized_pnl: share_balance.realized_pnl,
    });
    
    Ok(())
}

#[event]
pub struct SharesSold {
    pub arena: Pubkey,
    pub seller: Pubkey,
    pub outcome_index: u8,
    pub amount: u64,
    pub price: u64,
    pub total_proceeds: u64,
    pub new_balance: u64,
    pub realized_pnl: i64,
}

