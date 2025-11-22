use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};
use crate::state::{Arena, AMMPool, LiquidityPosition};
use crate::error::BetFunError;

/// Remove liquidity from an AMM pool
#[derive(Accounts)]
#[instruction(lp_tokens_to_burn: u64)]
pub struct RemoveLiquidity<'info> {
    #[account(
        seeds = [
            b"arena",
            arena.creator.as_ref(),
            arena.title.as_bytes()
        ],
        bump = arena.bump,
    )]
    pub arena: Account<'info, Arena>,

    #[account(
        mut,
        seeds = [
            b"amm_pool",
            arena.key().as_ref(),
            &pool.outcome_index.to_le_bytes()
        ],
        bump = pool.bump,
        constraint = pool.arena == arena.key() @ BetFunError::InvalidConfiguration,
    )]
    pub pool: Account<'info, AMMPool>,

    #[account(mut)]
    pub lp_token_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = pool_token_vault.mint == pool.share_mint @ BetFunError::InvalidConfiguration,
    )]
    pub pool_token_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = provider_token_account.mint == pool.share_mint @ BetFunError::InvalidConfiguration,
        constraint = provider_token_account.owner == provider.key() @ BetFunError::Unauthorized,
    )]
    pub provider_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = provider_lp_token_account.mint == lp_token_mint.key() @ BetFunError::InvalidConfiguration,
        constraint = provider_lp_token_account.owner == provider.key() @ BetFunError::Unauthorized,
        constraint = provider_lp_token_account.amount >= lp_tokens_to_burn @ BetFunError::InsufficientFunds,
    )]
    pub provider_lp_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [
            b"liquidity_position",
            pool.key().as_ref(),
            provider.key().as_ref()
        ],
        bump = liquidity_position.bump,
        constraint = liquidity_position.pool == pool.key() @ BetFunError::InvalidConfiguration,
        constraint = liquidity_position.provider == provider.key() @ BetFunError::Unauthorized,
        constraint = liquidity_position.lp_tokens >= lp_tokens_to_burn @ BetFunError::InsufficientFunds,
    )]
    pub liquidity_position: Account<'info, LiquidityPosition>,

    #[account(mut)]
    pub provider: Signer<'info>,

    /// Pool PDA that holds SOL
    #[account(
        mut,
        seeds = [
            b"pool_sol_vault",
            pool.key().as_ref()
        ],
        bump
    )]
    /// CHECK: PDA for holding SOL
    pub pool_sol_vault: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RemoveLiquidity>,
    lp_tokens_to_burn: u64,
    min_token_amount: u64,
    min_sol_amount: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let liquidity_position = &mut ctx.accounts.liquidity_position;
    let provider = &ctx.accounts.provider;

    // Validate LP tokens
    require!(lp_tokens_to_burn > 0, BetFunError::InvalidAmount);
    require!(
        lp_tokens_to_burn <= pool.total_lp_tokens,
        BetFunError::InsufficientLiquidity
    );

    // Calculate amounts to withdraw
    let token_amount = (pool.token_reserve as u128)
        .checked_mul(lp_tokens_to_burn as u128)
        .ok_or(BetFunError::ArithmeticOverflow)?
        .checked_div(pool.total_lp_tokens as u128)
        .ok_or(BetFunError::ArithmeticOverflow)? as u64;

    let sol_amount = (pool.sol_reserve as u128)
        .checked_mul(lp_tokens_to_burn as u128)
        .ok_or(BetFunError::ArithmeticOverflow)?
        .checked_div(pool.total_lp_tokens as u128)
        .ok_or(BetFunError::ArithmeticOverflow)? as u64;

    // Check minimum amounts (slippage protection)
    require!(
        token_amount >= min_token_amount,
        BetFunError::SlippageToleranceExceeded
    );
    require!(
        sol_amount >= min_sol_amount,
        BetFunError::SlippageToleranceExceeded
    );

    // Verify pool has enough reserves
    require!(
        pool.token_reserve >= token_amount,
        BetFunError::InsufficientLiquidity
    );
    require!(
        pool.sol_reserve >= sol_amount,
        BetFunError::InsufficientLiquidity
    );

    // Burn LP tokens from provider
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.lp_token_mint.to_account_info(),
                from: ctx.accounts.provider_lp_token_account.to_account_info(),
                authority: provider.to_account_info(),
            },
        ),
        lp_tokens_to_burn,
    )?;

    // Transfer tokens from pool vault to provider
    let _pool_key = pool.key();
    let seeds = &[
        b"amm_pool",
        pool.arena.as_ref(),
        &[pool.outcome_index],
        &[pool.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_token_vault.to_account_info(),
                to: ctx.accounts.provider_token_account.to_account_info(),
                authority: pool.to_account_info(),
            },
            signer_seeds,
        ),
        token_amount,
    )?;

    // Transfer SOL from pool vault to provider
    **ctx.accounts.pool_sol_vault.try_borrow_mut_lamports()? = ctx.accounts.pool_sol_vault.lamports()
        .checked_sub(sol_amount)
        .ok_or(BetFunError::ArithmeticOverflow)?;

    **provider.to_account_info().try_borrow_mut_lamports()? = provider.lamports()
        .checked_add(sol_amount)
        .ok_or(BetFunError::ArithmeticOverflow)?;

    // Update pool reserves
    pool.token_reserve = pool.token_reserve
        .checked_sub(token_amount)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    pool.sol_reserve = pool.sol_reserve
        .checked_sub(sol_amount)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    pool.k = (pool.token_reserve as u128)
        .checked_mul(pool.sol_reserve as u128)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    pool.total_lp_tokens = pool.total_lp_tokens
        .checked_sub(lp_tokens_to_burn)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    pool.last_price = pool.get_price();

    // Update liquidity position
    liquidity_position.lp_tokens = liquidity_position.lp_tokens
        .checked_sub(lp_tokens_to_burn)
        .ok_or(BetFunError::ArithmeticOverflow)?;

    // Calculate proportional reduction in deposited amounts
    let tokens_withdrawn_from_deposit = (liquidity_position.tokens_deposited as u128)
        .checked_mul(lp_tokens_to_burn as u128)
        .ok_or(BetFunError::ArithmeticOverflow)?
        .checked_div((liquidity_position.lp_tokens + lp_tokens_to_burn) as u128)
        .ok_or(BetFunError::ArithmeticOverflow)? as u64;

    let sol_withdrawn_from_deposit = (liquidity_position.sol_deposited as u128)
        .checked_mul(lp_tokens_to_burn as u128)
        .ok_or(BetFunError::ArithmeticOverflow)?
        .checked_div((liquidity_position.lp_tokens + lp_tokens_to_burn) as u128)
        .ok_or(BetFunError::ArithmeticOverflow)? as u64;

    liquidity_position.tokens_deposited = liquidity_position.tokens_deposited
        .checked_sub(tokens_withdrawn_from_deposit)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    liquidity_position.sol_deposited = liquidity_position.sol_deposited
        .checked_sub(sol_withdrawn_from_deposit)
        .ok_or(BetFunError::ArithmeticOverflow)?;

    // Calculate fees earned (difference between withdrawn and deposited)
    let _token_gain = token_amount.saturating_sub(tokens_withdrawn_from_deposit);
    let sol_gain = sol_amount.saturating_sub(sol_withdrawn_from_deposit);
    
    if sol_gain > 0 {
        liquidity_position.fees_earned = liquidity_position.fees_earned
            .checked_add(sol_gain)
            .ok_or(BetFunError::ArithmeticOverflow)?;
    }

    msg!("Liquidity removed from pool: {}", pool.key());
    msg!("Provider: {}", provider.key());
    msg!("LP tokens burned: {}", lp_tokens_to_burn);
    msg!("Tokens withdrawn: {}", token_amount);
    msg!("SOL withdrawn: {} ({:.4} SOL)", sol_amount, sol_amount as f64 / 1e9);
    msg!("Fees earned: {} SOL", sol_gain as f64 / 1e9);
    msg!("New reserves: {} tokens, {} SOL", pool.token_reserve, pool.sol_reserve);

    emit!(LiquidityRemoved {
        pool: pool.key(),
        provider: provider.key(),
        lp_tokens_burned: lp_tokens_to_burn,
        token_amount,
        sol_amount,
        fees_earned: sol_gain,
    });

    Ok(())
}

#[event]
pub struct LiquidityRemoved {
    pub pool: Pubkey,
    pub provider: Pubkey,
    pub lp_tokens_burned: u64,
    pub token_amount: u64,
    pub sol_amount: u64,
    pub fees_earned: u64,
}

