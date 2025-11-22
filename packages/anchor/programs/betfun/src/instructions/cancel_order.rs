use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Arena, OrderBook, LimitOrder, OrderSide, OrderStatus};
use crate::error::BetFunError;

/// Cancel a limit order
#[derive(Accounts)]
pub struct CancelOrder<'info> {
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
            b"order_book",
            arena.key().as_ref(),
            &order_book.outcome_index.to_le_bytes()
        ],
        bump = order_book.bump,
        constraint = order_book.arena == arena.key() @ BetFunError::InvalidConfiguration,
    )]
    pub order_book: Account<'info, OrderBook>,

    #[account(
        mut,
        seeds = [
            b"limit_order",
            arena.key().as_ref(),
            &limit_order.outcome_index.to_le_bytes(),
            &limit_order.order_id.to_le_bytes()
        ],
        bump = limit_order.bump,
        constraint = limit_order.arena == arena.key() @ BetFunError::InvalidConfiguration,
        constraint = limit_order.owner == owner.key() @ BetFunError::Unauthorized,
        constraint = limit_order.is_active() @ BetFunError::InvalidConfiguration,
    )]
    pub limit_order: Account<'info, LimitOrder>,

    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key() @ BetFunError::Unauthorized,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    /// Escrow account holding tokens/SOL for the order
    #[account(
        mut,
        seeds = [
            b"order_escrow",
            limit_order.key().as_ref()
        ],
        bump
    )]
    /// CHECK: PDA for holding escrow
    pub order_escrow: AccountInfo<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CancelOrder>) -> Result<()> {
    let order_book = &mut ctx.accounts.order_book;
    let limit_order = &mut ctx.accounts.limit_order;
    let owner = &ctx.accounts.owner;
    let current_time = Clock::get()?.unix_timestamp;

    // Calculate refund amount (remaining unfilled size)
    let refund_amount = match limit_order.side {
        OrderSide::Buy => {
            // Refund SOL (price * remaining_size)
            limit_order.price
                .checked_mul(limit_order.remaining_size)
                .ok_or(BetFunError::ArithmeticOverflow)?
        }
        OrderSide::Sell => {
            // Refund tokens (remaining_size)
            limit_order.remaining_size
        }
    };

    // Return funds from escrow to owner
    if refund_amount > 0 {
        match limit_order.side {
            OrderSide::Buy => {
                // Return SOL from escrow to owner
                **ctx.accounts.order_escrow.try_borrow_mut_lamports()? = ctx.accounts.order_escrow.lamports()
                    .checked_sub(refund_amount)
                    .ok_or(BetFunError::ArithmeticOverflow)?;

                **owner.to_account_info().try_borrow_mut_lamports()? = owner.lamports()
                    .checked_add(refund_amount)
                    .ok_or(BetFunError::ArithmeticOverflow)?;
            }
            OrderSide::Sell => {
                // Return tokens from escrow to owner
                let _limit_order_key = limit_order.key();
                let seeds = &[
                    b"limit_order",
                    limit_order.arena.as_ref(),
                    &[limit_order.outcome_index],
                    &limit_order.order_id.to_le_bytes(),
                    &[limit_order.bump],
                ];
                let signer_seeds = &[&seeds[..]];

                token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.order_escrow.to_account_info(),
                            to: ctx.accounts.owner_token_account.to_account_info(),
                            authority: limit_order.to_account_info(),
                        },
                        signer_seeds,
                    ),
                    refund_amount,
                )?;
            }
        }
    }

    // Update order status
    limit_order.status = OrderStatus::Cancelled;
    limit_order.updated_at = current_time;

    // Update order book statistics
    order_book.active_orders = order_book.active_orders.saturating_sub(1);
    match limit_order.side {
        OrderSide::Buy => {
            order_book.total_buy_orders = order_book.total_buy_orders.saturating_sub(1);
        }
        OrderSide::Sell => {
            order_book.total_sell_orders = order_book.total_sell_orders.saturating_sub(1);
        }
    }

    msg!("Limit order cancelled: {}", limit_order.key());
    msg!("Order ID: {}", limit_order.order_id);
    msg!("Owner: {}", owner.key());
    msg!("Refund amount: {}", refund_amount);
    msg!("Filled: {} / {}", limit_order.filled_size, limit_order.size);

    emit!(LimitOrderCancelled {
        order_book: order_book.key(),
        order_id: limit_order.order_id,
        owner: owner.key(),
        outcome_index: limit_order.outcome_index,
        side: limit_order.side,
        refund_amount,
        filled_size: limit_order.filled_size,
        total_size: limit_order.size,
    });

    Ok(())
}

#[event]
pub struct LimitOrderCancelled {
    pub order_book: Pubkey,
    pub order_id: u64,
    pub owner: Pubkey,
    pub outcome_index: u8,
    pub side: OrderSide,
    pub refund_amount: u64,
    pub filled_size: u64,
    pub total_size: u64,
}

