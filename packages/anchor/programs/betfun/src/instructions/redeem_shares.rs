use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};
use crate::state::{Arena, OutcomeShare, ShareBalance};
use crate::error::BetFunError;

/// Redeem winning shares for SOL after arena resolution
/// Each winning share is worth 1 SOL
#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct RedeemShares<'info> {
    #[account(
        seeds = [
            b"arena",
            arena.creator.as_ref(),
            arena.title.as_bytes()
        ],
        bump = arena.bump,
        constraint = arena.resolved @ BetFunError::NotResolved
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
            redeemer.key().as_ref()
        ],
        bump = share_balance.bump,
        constraint = share_balance.owner == redeemer.key() @ BetFunError::NotParticipant
    )]
    pub share_balance: Account<'info, ShareBalance>,
    
    /// User's token account holding shares
    #[account(
        mut,
        associated_token::mint = share_mint,
        associated_token::authority = redeemer,
        constraint = redeemer_token_account.amount >= amount @ BetFunError::InsufficientEntryFee
    )]
    pub redeemer_token_account: Account<'info, TokenAccount>,
    
    /// Redeemer receives SOL
    #[account(mut)]
    pub redeemer: Signer<'info>,
    
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
    ctx: Context<RedeemShares>,
    amount: u64, // Number of shares to redeem
) -> Result<()> {
    let arena = &ctx.accounts.arena;
    let outcome_share = &mut ctx.accounts.outcome_share;
    let share_balance = &mut ctx.accounts.share_balance;
    
    // ========== VALIDATION ==========
    
    // Arena must be resolved
    require!(
        arena.resolved,
        BetFunError::NotResolved
    );
    
    // This must be the winning outcome
    let winner_outcome = arena.winner_outcome
        .ok_or(BetFunError::InvalidOutcome)?;
    
    require!(
        outcome_share.outcome_index == winner_outcome,
        BetFunError::NotWinner
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
    
    // Calculate redemption value (1 SOL per share)
    const REDEMPTION_PRICE: u64 = 1_000_000_000; // 1 SOL
    let redemption_value = amount
        .checked_mul(REDEMPTION_PRICE)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    // Check escrow has sufficient balance
    let escrow_balance = ctx.accounts.arena_escrow.lamports();
    require!(
        escrow_balance >= redemption_value,
        BetFunError::InsufficientEntryFee
    );
    
    // ========== BURN SHARE TOKENS ==========
    
    // Burn shares from redeemer's token account
    let cpi_accounts = Burn {
        mint: ctx.accounts.share_mint.to_account_info(),
        from: ctx.accounts.redeemer_token_account.to_account_info(),
        authority: ctx.accounts.redeemer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    token::burn(cpi_ctx, amount)?;
    
    // ========== TRANSFER SOL TO REDEEMER ==========
    
    // Transfer SOL from escrow to redeemer
    **ctx.accounts.arena_escrow.to_account_info().try_borrow_mut_lamports()? -= redemption_value;
    **ctx.accounts.redeemer.to_account_info().try_borrow_mut_lamports()? += redemption_value;
    
    // ========== UPDATE STATISTICS ==========
    
    // Update outcome share stats
    outcome_share.total_supply = outcome_share.total_supply
        .checked_sub(amount)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    // Update user's share balance
    share_balance.balance = share_balance.balance
        .checked_sub(amount)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    // Calculate final realized P&L
    let cost = (amount as u128 * share_balance.avg_cost_basis as u128) / 1_000_000_000;
    let final_pnl = redemption_value as i64 - cost as i64;
    share_balance.realized_pnl += final_pnl;
    
    // ========== LOGGING ==========
    
    msg!("Shares redeemed successfully");
    msg!("Redeemer: {}", ctx.accounts.redeemer.key());
    msg!("Outcome: {} ({})", 
        outcome_share.outcome_index,
        arena.outcomes[outcome_share.outcome_index as usize]
    );
    msg!("Amount: {} shares", amount);
    msg!("Redemption value: {} lamports ({:.4} SOL)", 
        redemption_value, 
        redemption_value as f64 / 1e9
    );
    msg!("Final P&L: {} lamports ({:.4} SOL)", 
        final_pnl, 
        final_pnl as f64 / 1e9
    );
    msg!("Total realized P&L: {} lamports", share_balance.realized_pnl);
    msg!("Remaining balance: {} shares", share_balance.balance);
    
    // ========== EMIT EVENT ==========
    
    emit!(SharesRedeemed {
        arena: arena.key(),
        redeemer: ctx.accounts.redeemer.key(),
        outcome_index: outcome_share.outcome_index,
        amount,
        redemption_value,
        final_pnl,
        total_realized_pnl: share_balance.realized_pnl,
    });
    
    Ok(())
}

#[event]
pub struct SharesRedeemed {
    pub arena: Pubkey,
    pub redeemer: Pubkey,
    pub outcome_index: u8,
    pub amount: u64,
    pub redemption_value: u64,
    pub final_pnl: i64,
    pub total_realized_pnl: i64,
}

