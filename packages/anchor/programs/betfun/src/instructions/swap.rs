use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::state::{Arena, AMMPool};
use crate::error::BetFunError;

/// Swap tokens using the AMM pool
#[derive(Accounts)]
pub struct Swap<'info> {
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

    #[account(
        mut,
        constraint = pool_token_vault.mint == pool.share_mint @ BetFunError::InvalidConfiguration,
    )]
    pub pool_token_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_token_account.mint == pool.share_mint @ BetFunError::InvalidConfiguration,
        constraint = user_token_account.owner == user.key() @ BetFunError::Unauthorized,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

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

    /// Protocol fee recipient
    #[account(mut)]
    /// CHECK: Protocol fee recipient
    pub protocol_fee_recipient: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Swap>,
    amount_in: u64,
    min_amount_out: u64,
    is_token_to_sol: bool,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let user = &ctx.accounts.user;
    let current_time = Clock::get()?.unix_timestamp;

    // Validate amount
    require!(amount_in > 0, BetFunError::InvalidAmount);

    // Calculate output amount
    let (reserve_in, reserve_out) = if is_token_to_sol {
        (pool.token_reserve, pool.sol_reserve)
    } else {
        (pool.sol_reserve, pool.token_reserve)
    };

    require!(reserve_in > 0 && reserve_out > 0, BetFunError::InsufficientLiquidity);

    // Calculate amount out with fee
    let amount_in_with_fee = (amount_in as u128)
        .checked_mul((10000 - pool.fee_bps) as u128)
        .ok_or(BetFunError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(BetFunError::ArithmeticOverflow)?;

    let numerator = amount_in_with_fee
        .checked_mul(reserve_out as u128)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    let denominator = (reserve_in as u128)
        .checked_add(amount_in_with_fee)
        .ok_or(BetFunError::ArithmeticOverflow)?;

    let amount_out = numerator
        .checked_div(denominator)
        .ok_or(BetFunError::ArithmeticOverflow)? as u64;

    // Check slippage
    require!(
        amount_out >= min_amount_out,
        BetFunError::SlippageToleranceExceeded
    );

    require!(amount_out > 0, BetFunError::InsufficientOutputAmount);
    require!(amount_out < reserve_out, BetFunError::InsufficientLiquidity);

    // Calculate fees
    let fee_amount = (amount_in as u128)
        .checked_mul(pool.fee_bps as u128)
        .ok_or(BetFunError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(BetFunError::ArithmeticOverflow)? as u64;

    let protocol_fee = (fee_amount as u128)
        .checked_mul(pool.protocol_fee_bps as u128)
        .ok_or(BetFunError::ArithmeticOverflow)?
        .checked_div(pool.fee_bps as u128)
        .ok_or(BetFunError::ArithmeticOverflow)? as u64;

    // Calculate price impact
    let price_before = pool.get_price();
    let price_impact = pool.calculate_price_impact(amount_in, is_token_to_sol)?;

    // Perform swap
    let _pool_key = pool.key();
    let seeds = &[
        b"amm_pool",
        pool.arena.as_ref(),
        &[pool.outcome_index],
        &[pool.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    if is_token_to_sol {
        // Token -> SOL swap
        
        // Verify user has enough tokens
        require!(
            ctx.accounts.user_token_account.amount >= amount_in,
            BetFunError::InsufficientFunds
        );

        // Transfer tokens from user to pool
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.pool_token_vault.to_account_info(),
                    authority: user.to_account_info(),
                },
            ),
            amount_in,
        )?;

        // Transfer SOL from pool to user
        **ctx.accounts.pool_sol_vault.try_borrow_mut_lamports()? = ctx.accounts.pool_sol_vault.lamports()
            .checked_sub(amount_out)
            .ok_or(BetFunError::ArithmeticOverflow)?;

        **user.to_account_info().try_borrow_mut_lamports()? = user.lamports()
            .checked_add(amount_out)
            .ok_or(BetFunError::ArithmeticOverflow)?;

        // Transfer protocol fee to recipient
        if protocol_fee > 0 {
            **ctx.accounts.pool_sol_vault.try_borrow_mut_lamports()? = ctx.accounts.pool_sol_vault.lamports()
                .checked_sub(protocol_fee)
                .ok_or(BetFunError::ArithmeticOverflow)?;

            **ctx.accounts.protocol_fee_recipient.try_borrow_mut_lamports()? = ctx.accounts.protocol_fee_recipient.lamports()
                .checked_add(protocol_fee)
                .ok_or(BetFunError::ArithmeticOverflow)?;
        }

        // Update reserves
        pool.token_reserve = pool.token_reserve
            .checked_add(amount_in)
            .ok_or(BetFunError::ArithmeticOverflow)?;
        pool.sol_reserve = pool.sol_reserve
            .checked_sub(amount_out)
            .ok_or(BetFunError::ArithmeticOverflow)?
            .checked_sub(protocol_fee)
            .ok_or(BetFunError::ArithmeticOverflow)?;

    } else {
        // SOL -> Token swap
        
        // Verify user has enough SOL
        require!(
            user.lamports() >= amount_in,
            BetFunError::InsufficientFunds
        );

        // Transfer SOL from user to pool
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: user.to_account_info(),
                to: ctx.accounts.pool_sol_vault.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, amount_in)?;

        // Transfer tokens from pool to user
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_token_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: pool.to_account_info(),
                },
                signer_seeds,
            ),
            amount_out,
        )?;

        // Transfer protocol fee to recipient
        if protocol_fee > 0 {
            **ctx.accounts.pool_sol_vault.try_borrow_mut_lamports()? = ctx.accounts.pool_sol_vault.lamports()
                .checked_sub(protocol_fee)
                .ok_or(BetFunError::ArithmeticOverflow)?;

            **ctx.accounts.protocol_fee_recipient.try_borrow_mut_lamports()? = ctx.accounts.protocol_fee_recipient.lamports()
                .checked_add(protocol_fee)
                .ok_or(BetFunError::ArithmeticOverflow)?;
        }

        // Update reserves
        pool.sol_reserve = pool.sol_reserve
            .checked_add(amount_in)
            .ok_or(BetFunError::ArithmeticOverflow)?
            .checked_sub(protocol_fee)
            .ok_or(BetFunError::ArithmeticOverflow)?;
        pool.token_reserve = pool.token_reserve
            .checked_sub(amount_out)
            .ok_or(BetFunError::ArithmeticOverflow)?;
    }

    // Update k
    pool.k = (pool.token_reserve as u128)
        .checked_mul(pool.sol_reserve as u128)
        .ok_or(BetFunError::ArithmeticOverflow)?;

    // Update statistics
    let volume_sol = if is_token_to_sol { amount_out } else { amount_in };
    pool.update_swap_stats(volume_sol, current_time);
    pool.fees_collected = pool.fees_collected
        .checked_add(fee_amount)
        .ok_or(BetFunError::ArithmeticOverflow)?;

    let price_after = pool.get_price();

    msg!("Swap executed in pool: {}", pool.key());
    msg!("User: {}", user.key());
    msg!("Direction: {}", if is_token_to_sol { "Token -> SOL" } else { "SOL -> Token" });
    msg!("Amount in: {}", amount_in);
    msg!("Amount out: {}", amount_out);
    msg!("Fee: {} ({:.2}%)", fee_amount, pool.fee_bps as f64 / 100.0);
    msg!("Protocol fee: {}", protocol_fee);
    msg!("Price impact: {:.2}%", price_impact as f64 / 100.0);
    msg!("Price: {:.6} -> {:.6} SOL", price_before as f64 / 1e9, price_after as f64 / 1e9);
    msg!("New reserves: {} tokens, {} SOL", pool.token_reserve, pool.sol_reserve);

    emit!(SwapExecuted {
        pool: pool.key(),
        user: user.key(),
        is_token_to_sol,
        amount_in,
        amount_out,
        fee_amount,
        protocol_fee,
        price_impact,
        price_before,
        price_after,
    });

    Ok(())
}

#[event]
pub struct SwapExecuted {
    pub pool: Pubkey,
    pub user: Pubkey,
    pub is_token_to_sol: bool,
    pub amount_in: u64,
    pub amount_out: u64,
    pub fee_amount: u64,
    pub protocol_fee: u64,
    pub price_impact: u16,
    pub price_before: u64,
    pub price_after: u64,
}

