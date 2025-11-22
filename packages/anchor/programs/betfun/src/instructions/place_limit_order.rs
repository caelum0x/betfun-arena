use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Arena, OrderBook, LimitOrder, OrderType, OrderSide, OrderStatus};
use crate::error::BetFunError;

/// Place a limit order in the order book
#[derive(Accounts)]
#[instruction(outcome_index: u8)]
pub struct PlaceLimitOrder<'info> {
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
            b"order_book",
            arena.key().as_ref(),
            &[outcome_index]
        ],
        bump = order_book.bump,
        constraint = order_book.arena == arena.key() @ BetFunError::InvalidConfiguration,
        constraint = order_book.outcome_index == outcome_index @ BetFunError::InvalidConfiguration,
    )]
    pub order_book: Account<'info, OrderBook>,

    #[account(
        init,
        payer = owner,
        space = LimitOrder::SIZE,
        seeds = [
            b"limit_order",
            arena.key().as_ref(),
            &[outcome_index],
            &order_book.next_order_id.to_le_bytes()
        ],
        bump
    )]
    pub limit_order: Account<'info, LimitOrder>,

    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key() @ BetFunError::Unauthorized,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    /// Escrow account to hold tokens/SOL for the order
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
    pub rent: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct PlaceOrderParams {
    pub order_type: OrderType,
    pub side: OrderSide,
    pub price: u64,
    pub size: u64,
    pub expires_at: i64, // 0 = no expiration
    pub stop_price: Option<u64>,
    pub visible_size: Option<u64>,
    pub twap_interval: Option<u64>,
}

pub fn handler(
    ctx: Context<PlaceLimitOrder>,
    outcome_index: u8,
    params: PlaceOrderParams,
) -> Result<()> {
    let order_book = &mut ctx.accounts.order_book;
    let limit_order = &mut ctx.accounts.limit_order;
    let owner = &ctx.accounts.owner;
    let current_time = Clock::get()?.unix_timestamp;

    // Validate params
    require!(params.price > 0, BetFunError::InvalidAmount);
    require!(params.size > 0, BetFunError::InvalidAmount);
    
    if let Some(visible) = params.visible_size {
        require!(visible <= params.size, BetFunError::InvalidConfiguration);
    }
    
    if params.expires_at > 0 {
        require!(params.expires_at > current_time, BetFunError::InvalidConfiguration);
    }

    // Calculate escrow amount
    let escrow_amount = match params.side {
        OrderSide::Buy => {
            // For buy orders, escrow SOL (price * size)
            params.price
                .checked_mul(params.size)
                .ok_or(BetFunError::ArithmeticOverflow)?
        }
        OrderSide::Sell => {
            // For sell orders, escrow tokens (size)
            params.size
        }
    };

    // Transfer to escrow
    match params.side {
        OrderSide::Buy => {
            // Transfer SOL from owner to escrow
            require!(
                owner.lamports() >= escrow_amount,
                BetFunError::InsufficientFunds
            );

            let cpi_context = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: owner.to_account_info(),
                    to: ctx.accounts.order_escrow.to_account_info(),
                },
            );
            anchor_lang::system_program::transfer(cpi_context, escrow_amount)?;
        }
        OrderSide::Sell => {
            // Transfer tokens from owner to escrow
            require!(
                ctx.accounts.owner_token_account.amount >= escrow_amount,
                BetFunError::InsufficientFunds
            );

            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.owner_token_account.to_account_info(),
                        to: ctx.accounts.order_escrow.to_account_info(),
                        authority: owner.to_account_info(),
                    },
                ),
                escrow_amount,
            )?;
        }
    }

    // Get order ID
    let order_id = order_book.get_next_order_id();

    // Initialize limit order
    limit_order.order_id = order_id;
    limit_order.arena = ctx.accounts.arena.key();
    limit_order.outcome_index = outcome_index;
    limit_order.owner = owner.key();
    limit_order.order_type = params.order_type;
    limit_order.side = params.side;
    limit_order.price = params.price;
    limit_order.size = params.size;
    limit_order.remaining_size = params.size;
    limit_order.filled_size = 0;
    limit_order.stop_price = params.stop_price;
    limit_order.visible_size = params.visible_size;
    limit_order.twap_interval = params.twap_interval;
    limit_order.twap_last_execution = if params.twap_interval.is_some() {
        Some(current_time)
    } else {
        None
    };
    limit_order.status = OrderStatus::Open;
    limit_order.created_at = current_time;
    limit_order.expires_at = params.expires_at;
    limit_order.updated_at = current_time;
    limit_order.fees_paid = 0;
    limit_order.avg_fill_price = 0;
    limit_order.bump = ctx.bumps.limit_order;

    // Update order book statistics
    order_book.active_orders += 1;
    match params.side {
        OrderSide::Buy => {
            order_book.total_buy_orders += 1;
            if params.price > order_book.best_bid {
                order_book.best_bid = params.price;
            }
        }
        OrderSide::Sell => {
            order_book.total_sell_orders += 1;
            if order_book.best_ask == 0 || params.price < order_book.best_ask {
                order_book.best_ask = params.price;
            }
        }
    }

    // Update spread and mid price
    if order_book.best_bid > 0 && order_book.best_ask > 0 {
        order_book.spread = order_book.best_ask.saturating_sub(order_book.best_bid);
        order_book.mid_price = (order_book.best_bid + order_book.best_ask) / 2;
    }

    msg!("Limit order placed in order book: {}", order_book.key());
    msg!("Order ID: {}", order_id);
    msg!("Owner: {}", owner.key());
    msg!("Side: {:?}, Type: {:?}", params.side, params.order_type);
    msg!("Price: {} lamports", params.price);
    msg!("Size: {}", params.size);
    msg!("Escrow amount: {}", escrow_amount);

    emit!(LimitOrderPlaced {
        order_book: order_book.key(),
        order_id,
        owner: owner.key(),
        outcome_index,
        order_type: params.order_type,
        side: params.side,
        price: params.price,
        size: params.size,
        expires_at: params.expires_at,
    });

    Ok(())
}

#[event]
pub struct LimitOrderPlaced {
    pub order_book: Pubkey,
    pub order_id: u64,
    pub owner: Pubkey,
    pub outcome_index: u8,
    pub order_type: OrderType,
    pub side: OrderSide,
    pub price: u64,
    pub size: u64,
    pub expires_at: i64,
}

