use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::state::{Arena, OutcomeShare};
use crate::error::BetFunError;

/// Create SPL token mints for each outcome in an arena
/// This enables secondary market trading of outcome shares
#[derive(Accounts)]
#[instruction(outcome_index: u8)]
pub struct CreateShareTokens<'info> {
    #[account(
        seeds = [
            b"arena",
            arena.creator.as_ref(),
            arena.title.as_bytes()
        ],
        bump = arena.bump
    )]
    pub arena: Account<'info, Arena>,
    
    /// Creator must sign to create share tokens
    #[account(
        mut,
        constraint = creator.key() == arena.creator @ BetFunError::UnauthorizedResolver
    )]
    pub creator: Signer<'info>,
    
    /// Outcome share account (one per outcome)
    #[account(
        init,
        payer = creator,
        space = OutcomeShare::SIZE,
        seeds = [
            b"outcome_share",
            arena.key().as_ref(),
            &[outcome_index]
        ],
        bump
    )]
    pub outcome_share: Account<'info, OutcomeShare>,
    
    /// SPL token mint for this outcome
    #[account(
        init,
        payer = creator,
        mint::decimals = 9,
        mint::authority = outcome_share,
        seeds = [
            b"share_mint",
            arena.key().as_ref(),
            &[outcome_index]
        ],
        bump
    )]
    pub share_mint: Account<'info, Mint>,
    
    /// Token program
    pub token_program: Program<'info, Token>,
    
    /// System program
    pub system_program: Program<'info, System>,
    
    /// Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateShareTokens>,
    outcome_index: u8,
    initial_price: u64,
) -> Result<()> {
    let arena = &ctx.accounts.arena;
    let outcome_share = &mut ctx.accounts.outcome_share;
    let current_time = Clock::get()?.unix_timestamp;
    
    // ========== VALIDATION ==========
    
    // Validate outcome index
    require!(
        (outcome_index as usize) < arena.outcomes.len(),
        BetFunError::InvalidOutcome
    );
    
    // Validate initial price (must be between 0.01 and 0.99 SOL)
    const MIN_PRICE: u64 = 10_000_000; // 0.01 SOL
    const MAX_PRICE: u64 = 990_000_000; // 0.99 SOL
    require!(
        initial_price >= MIN_PRICE && initial_price <= MAX_PRICE,
        BetFunError::InvalidConfiguration
    );
    
    // Arena must not be resolved
    require!(
        !arena.resolved,
        BetFunError::AlreadyResolved
    );
    
    // ========== INITIALIZE OUTCOME SHARE ==========
    
    outcome_share.arena = arena.key();
    outcome_share.outcome_index = outcome_index;
    outcome_share.token_mint = ctx.accounts.share_mint.key();
    outcome_share.total_supply = 0;
    outcome_share.current_price = initial_price;
    outcome_share.volume_24h = 0;
    outcome_share.trade_count = 0;
    outcome_share.last_trade_at = current_time;
    outcome_share.high_24h = initial_price;
    outcome_share.low_24h = initial_price;
    outcome_share.price_24h_ago = initial_price;
    outcome_share.bump = ctx.bumps.outcome_share;
    
    // ========== LOGGING ==========
    
    msg!("Share tokens created successfully");
    msg!("Arena: {}", arena.key());
    msg!("Outcome: {} ({})", outcome_index, arena.outcomes[outcome_index as usize]);
    msg!("Token mint: {}", ctx.accounts.share_mint.key());
    msg!("Initial price: {} lamports ({:.4} SOL)", 
        initial_price, 
        initial_price as f64 / 1e9
    );
    
    // ========== EMIT EVENT ==========
    
    emit!(ShareTokensCreated {
        arena: arena.key(),
        outcome_index,
        token_mint: ctx.accounts.share_mint.key(),
        initial_price,
        outcome_name: arena.outcomes[outcome_index as usize].clone(),
    });
    
    Ok(())
}

#[event]
pub struct ShareTokensCreated {
    pub arena: Pubkey,
    pub outcome_index: u8,
    pub token_mint: Pubkey,
    pub initial_price: u64,
    pub outcome_name: String,
}

