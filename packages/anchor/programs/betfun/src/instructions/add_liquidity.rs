use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{Arena, AMMPool, LiquidityPosition};
use crate::error::BetFunError;

/// Add liquidity to an AMM pool
#[derive(Accounts)]
pub struct AddLiquidity<'info> {
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
        init_if_needed,
        payer = provider,
        associated_token::mint = lp_token_mint,
        associated_token::authority = provider,
    )]
    pub provider_lp_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = provider,
        space = LiquidityPosition::SIZE,
        seeds = [
            b"liquidity_position",
            pool.key().as_ref(),
            provider.key().as_ref()
        ],
        bump
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
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<AddLiquidity>,
    token_amount: u64,
    sol_amount: u64,
    min_lp_tokens: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let liquidity_position = &mut ctx.accounts.liquidity_position;
    let provider = &ctx.accounts.provider;
    let current_time = Clock::get()?.unix_timestamp;

    // Validate amounts
    require!(token_amount > 0, BetFunError::InvalidAmount);
    require!(sol_amount > 0, BetFunError::InvalidAmount);

    // Check provider has enough tokens
    require!(
        ctx.accounts.provider_token_account.amount >= token_amount,
        BetFunError::InsufficientFunds
    );

    // Check provider has enough SOL
    require!(
        provider.lamports() >= sol_amount,
        BetFunError::InsufficientFunds
    );

    // Calculate LP tokens to mint
    let lp_tokens = if pool.total_lp_tokens == 0 {
        // First liquidity provider
        let product = (token_amount as u128)
            .checked_mul(sol_amount as u128)
            .ok_or(BetFunError::ArithmeticOverflow)?;
        
        let lp = (product as f64).sqrt() as u64;
        require!(lp > 0, BetFunError::InsufficientLiquidityMinted);
        
        // Set initial reserves
        pool.token_reserve = token_amount;
        pool.sol_reserve = sol_amount;
        pool.k = product;
        
        lp
    } else {
        // Subsequent liquidity providers
        // Must maintain price ratio
        let expected_sol = (token_amount as u128)
            .checked_mul(pool.sol_reserve as u128)
            .ok_or(BetFunError::ArithmeticOverflow)?
            .checked_div(pool.token_reserve as u128)
            .ok_or(BetFunError::ArithmeticOverflow)? as u64;

        let expected_tokens = (sol_amount as u128)
            .checked_mul(pool.token_reserve as u128)
            .ok_or(BetFunError::ArithmeticOverflow)?
            .checked_div(pool.sol_reserve as u128)
            .ok_or(BetFunError::ArithmeticOverflow)? as u64;

        // Allow 1% slippage
        let sol_tolerance = expected_sol / 100;
        let token_tolerance = expected_tokens / 100;

        require!(
            sol_amount >= expected_sol.saturating_sub(sol_tolerance) &&
            sol_amount <= expected_sol.saturating_add(sol_tolerance),
            BetFunError::SlippageToleranceExceeded
        );

        require!(
            token_amount >= expected_tokens.saturating_sub(token_tolerance) &&
            token_amount <= expected_tokens.saturating_add(token_tolerance),
            BetFunError::SlippageToleranceExceeded
        );

        // Calculate LP tokens
        let lp_from_tokens = (pool.total_lp_tokens as u128)
            .checked_mul(token_amount as u128)
            .ok_or(BetFunError::ArithmeticOverflow)?
            .checked_div(pool.token_reserve as u128)
            .ok_or(BetFunError::ArithmeticOverflow)? as u64;

        let lp_from_sol = (pool.total_lp_tokens as u128)
            .checked_mul(sol_amount as u128)
            .ok_or(BetFunError::ArithmeticOverflow)?
            .checked_div(pool.sol_reserve as u128)
            .ok_or(BetFunError::ArithmeticOverflow)? as u64;

        let lp = lp_from_tokens.min(lp_from_sol);
        require!(lp > 0, BetFunError::InsufficientLiquidityMinted);

        // Update reserves
        pool.token_reserve = pool.token_reserve
            .checked_add(token_amount)
            .ok_or(BetFunError::ArithmeticOverflow)?;
        pool.sol_reserve = pool.sol_reserve
            .checked_add(sol_amount)
            .ok_or(BetFunError::ArithmeticOverflow)?;
        pool.k = (pool.token_reserve as u128)
            .checked_mul(pool.sol_reserve as u128)
            .ok_or(BetFunError::ArithmeticOverflow)?;

        lp
    };

    // Check minimum LP tokens
    require!(lp_tokens >= min_lp_tokens, BetFunError::SlippageToleranceExceeded);

    // Transfer tokens from provider to pool vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.provider_token_account.to_account_info(),
                to: ctx.accounts.pool_token_vault.to_account_info(),
                authority: provider.to_account_info(),
            },
        ),
        token_amount,
    )?;

    // Transfer SOL from provider to pool vault
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: provider.to_account_info(),
            to: ctx.accounts.pool_sol_vault.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, sol_amount)?;

    // Mint LP tokens to provider
    let _pool_key = pool.key();
    let seeds = &[
        b"amm_pool",
        pool.arena.as_ref(),
        &[pool.outcome_index],
        &[pool.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.lp_token_mint.to_account_info(),
                to: ctx.accounts.provider_lp_token_account.to_account_info(),
                authority: pool.to_account_info(),
            },
            signer_seeds,
        ),
        lp_tokens,
    )?;

    // Update pool statistics
    pool.total_lp_tokens = pool.total_lp_tokens
        .checked_add(lp_tokens)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    pool.last_price = pool.get_price();

    // Update liquidity position
    if liquidity_position.lp_tokens == 0 {
        // New position
        liquidity_position.pool = pool.key();
        liquidity_position.provider = provider.key();
        liquidity_position.lp_tokens = lp_tokens;
        liquidity_position.tokens_deposited = token_amount;
        liquidity_position.sol_deposited = sol_amount;
        liquidity_position.created_at = current_time;
        liquidity_position.fees_earned = 0;
        liquidity_position.bump = ctx.bumps.liquidity_position;
    } else {
        // Add to existing position
        liquidity_position.lp_tokens = liquidity_position.lp_tokens
            .checked_add(lp_tokens)
            .ok_or(BetFunError::ArithmeticOverflow)?;
        liquidity_position.tokens_deposited = liquidity_position.tokens_deposited
            .checked_add(token_amount)
            .ok_or(BetFunError::ArithmeticOverflow)?;
        liquidity_position.sol_deposited = liquidity_position.sol_deposited
            .checked_add(sol_amount)
            .ok_or(BetFunError::ArithmeticOverflow)?;
    }

    msg!("Liquidity added to pool: {}", pool.key());
    msg!("Provider: {}", provider.key());
    msg!("Tokens deposited: {}", token_amount);
    msg!("SOL deposited: {} ({:.4} SOL)", sol_amount, sol_amount as f64 / 1e9);
    msg!("LP tokens minted: {}", lp_tokens);
    msg!("New reserves: {} tokens, {} SOL", pool.token_reserve, pool.sol_reserve);

    emit!(LiquidityAdded {
        pool: pool.key(),
        provider: provider.key(),
        token_amount,
        sol_amount,
        lp_tokens_minted: lp_tokens,
        total_lp_tokens: pool.total_lp_tokens,
    });

    Ok(())
}

#[event]
pub struct LiquidityAdded {
    pub pool: Pubkey,
    pub provider: Pubkey,
    pub token_amount: u64,
    pub sol_amount: u64,
    pub lp_tokens_minted: u64,
    pub total_lp_tokens: u64,
}

