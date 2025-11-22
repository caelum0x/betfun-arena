use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::state::{Arena, OutcomeShare, AMMPool};
use crate::error::BetFunError;

/// Initialize an AMM pool for an outcome
#[derive(Accounts)]
#[instruction(outcome_index: u8)]
pub struct InitializePool<'info> {
    #[account(
        seeds = [
            b"arena",
            arena.creator.as_ref(),
            arena.title.as_bytes()
        ],
        bump = arena.bump,
        constraint = !arena.resolved @ BetFunError::AlreadyResolved,
    )]
    pub arena: Account<'info, Arena>,

    #[account(
        seeds = [
            b"outcome_share",
            arena.key().as_ref(),
            &[outcome_index]
        ],
        bump = outcome_share.bump,
        constraint = outcome_share.arena == arena.key() @ BetFunError::InvalidConfiguration,
        constraint = outcome_share.outcome_index == outcome_index @ BetFunError::InvalidConfiguration,
    )]
    pub outcome_share: Account<'info, OutcomeShare>,

    #[account(
        init,
        payer = creator,
        space = AMMPool::SIZE,
        seeds = [
            b"amm_pool",
            arena.key().as_ref(),
            &[outcome_index]
        ],
        bump
    )]
    pub pool: Account<'info, AMMPool>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 9,
        mint::authority = pool,
        seeds = [
            b"lp_token",
            pool.key().as_ref()
        ],
        bump
    )]
    pub lp_token_mint: Account<'info, Mint>,

    /// The share mint account (must match outcome_share.token_mint)
    #[account(
        constraint = share_mint.key() == outcome_share.token_mint @ BetFunError::InvalidConfiguration
    )]
    pub share_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        token::mint = share_mint,
        token::authority = pool,
        seeds = [
            b"pool_token_vault",
            pool.key().as_ref()
        ],
        bump
    )]
    pub pool_token_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializePool>,
    outcome_index: u8,
    fee_bps: u16,
    protocol_fee_bps: u16,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let outcome_share = &ctx.accounts.outcome_share;
    let arena = &ctx.accounts.arena;
    let current_time = Clock::get()?.unix_timestamp;

    // Validate fees (max 10% total, 1% protocol)
    require!(fee_bps <= 1000, BetFunError::InvalidConfiguration); // Max 10%
    require!(protocol_fee_bps <= 100, BetFunError::InvalidConfiguration); // Max 1%
    require!(fee_bps >= protocol_fee_bps, BetFunError::InvalidConfiguration);

    // Initialize pool
    pool.arena = arena.key();
    pool.outcome_index = outcome_index;
    pool.share_mint = outcome_share.token_mint;
    pool.token_reserve = 0;
    pool.sol_reserve = 0;
    pool.k = 0;
    pool.lp_token_mint = ctx.accounts.lp_token_mint.key();
    pool.total_lp_tokens = 0;
    pool.fee_bps = fee_bps;
    pool.protocol_fee_bps = protocol_fee_bps;
    pool.fees_collected = 0;
    pool.volume_24h = 0;
    pool.swap_count = 0;
    pool.last_swap_at = current_time;
    pool.last_price = 0;
    pool.price_24h_ago = 0;
    pool.bump = ctx.bumps.pool;

    msg!("AMM Pool initialized for arena: {}", arena.key());
    msg!("Outcome index: {}", outcome_index);
    msg!("Share mint: {}", pool.share_mint);
    msg!("LP token mint: {}", pool.lp_token_mint);
    msg!("Fee: {} bps, Protocol fee: {} bps", fee_bps, protocol_fee_bps);

    emit!(PoolInitialized {
        pool: pool.key(),
        arena: arena.key(),
        outcome_index,
        share_mint: pool.share_mint,
        lp_token_mint: pool.lp_token_mint,
        fee_bps,
        protocol_fee_bps,
    });

    Ok(())
}

#[event]
pub struct PoolInitialized {
    pub pool: Pubkey,
    pub arena: Pubkey,
    pub outcome_index: u8,
    pub share_mint: Pubkey,
    pub lp_token_mint: Pubkey,
    pub fee_bps: u16,
    pub protocol_fee_bps: u16,
}

