use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Arena, OrderBook, LimitOrder, Trade, OrderSide, OrderStatus};
use crate::error::BetFunError;

/// Settle a matched order (called by matching engine)
#[derive(Accounts)]
pub struct SettleMatch<'info> {
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
            &order_book.outcome_index.to_le_bytes()
        ],
        bump = order_book.bump,
        constraint = order_book.arena == arena.key() @ BetFunError::InvalidConfiguration,
    )]
    pub order_book: Account<'info, OrderBook>,

    #[account(
        mut,
        constraint = buy_order.arena == arena.key() @ BetFunError::InvalidConfiguration,
        constraint = buy_order.side == OrderSide::Buy @ BetFunError::InvalidConfiguration,
        constraint = buy_order.is_active() @ BetFunError::InvalidConfiguration,
    )]
    pub buy_order: Account<'info, LimitOrder>,

    #[account(
        mut,
        constraint = sell_order.arena == arena.key() @ BetFunError::InvalidConfiguration,
        constraint = sell_order.side == OrderSide::Sell @ BetFunError::InvalidConfiguration,
        constraint = sell_order.is_active() @ BetFunError::InvalidConfiguration,
    )]
    pub sell_order: Account<'info, LimitOrder>,

    #[account(
        init,
        payer = matcher,
        space = Trade::SIZE,
        seeds = [
            b"trade",
            arena.key().as_ref(),
            &order_book.outcome_index.to_le_bytes(),
            &order_book.trade_count.to_le_bytes()
        ],
        bump
    )]
    pub trade: Account<'info, Trade>,

    /// Buy order escrow (holds SOL)
    #[account(
        mut,
        seeds = [
            b"order_escrow",
            buy_order.key().as_ref()
        ],
        bump
    )]
    /// CHECK: PDA for holding escrow
    pub buy_order_escrow: AccountInfo<'info>,

    /// Sell order escrow (holds tokens)
    #[account(
        mut,
        seeds = [
            b"order_escrow",
            sell_order.key().as_ref()
        ],
        bump
    )]
    /// CHECK: PDA for holding escrow
    pub sell_order_escrow: AccountInfo<'info>,

    /// Buyer's token account (receives tokens)
    #[account(
        mut,
        constraint = buyer_token_account.owner == buy_order.owner @ BetFunError::Unauthorized,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// Seller (receives SOL)
    #[account(
        mut,
        constraint = seller.key() == sell_order.owner @ BetFunError::Unauthorized,
    )]
    /// CHECK: Seller account
    pub seller: AccountInfo<'info>,

    /// Protocol fee recipient
    #[account(mut)]
    /// CHECK: Protocol fee recipient
    pub protocol_fee_recipient: AccountInfo<'info>,

    /// Matching engine authority (off-chain service)
    #[account(mut)]
    pub matcher: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<SettleMatch>,
    match_size: u64,
    match_price: u64,
    fee_bps: u16, // e.g., 30 = 0.3%
) -> Result<()> {
    let order_book = &mut ctx.accounts.order_book;
    let buy_order = &mut ctx.accounts.buy_order;
    let sell_order = &mut ctx.accounts.sell_order;
    let trade = &mut ctx.accounts.trade;
    let current_time = Clock::get()?.unix_timestamp;

    // Validate match
    require!(match_size > 0, BetFunError::InvalidAmount);
    require!(match_size <= buy_order.remaining_size, BetFunError::InvalidAmount);
    require!(match_size <= sell_order.remaining_size, BetFunError::InvalidAmount);
    require!(buy_order.price >= match_price, BetFunError::InvalidConfiguration);
    require!(sell_order.price <= match_price, BetFunError::InvalidConfiguration);

    // Calculate amounts
    let total_value = match_price
        .checked_mul(match_size)
        .ok_or(BetFunError::ArithmeticOverflow)?;

    let buyer_fee = (total_value as u128)
        .checked_mul(fee_bps as u128)
        .ok_or(BetFunError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(BetFunError::ArithmeticOverflow)? as u64;

    let seller_fee = (total_value as u128)
        .checked_mul(fee_bps as u128)
        .ok_or(BetFunError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(BetFunError::ArithmeticOverflow)? as u64;

    let seller_proceeds = total_value
        .checked_sub(seller_fee)
        .ok_or(BetFunError::ArithmeticOverflow)?;

    // Transfer tokens from sell order escrow to buyer
    let _sell_order_key = sell_order.key();
    let sell_seeds = &[
        b"limit_order",
        sell_order.arena.as_ref(),
        &[sell_order.outcome_index],
        &sell_order.order_id.to_le_bytes(),
        &[sell_order.bump],
    ];
    let sell_signer_seeds = &[&sell_seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sell_order_escrow.to_account_info(),
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: sell_order.to_account_info(),
            },
            sell_signer_seeds,
        ),
        match_size,
    )?;

    // Transfer SOL from buy order escrow to seller
    **ctx.accounts.buy_order_escrow.try_borrow_mut_lamports()? = ctx.accounts.buy_order_escrow.lamports()
        .checked_sub(seller_proceeds)
        .ok_or(BetFunError::ArithmeticOverflow)?;

    **ctx.accounts.seller.try_borrow_mut_lamports()? = ctx.accounts.seller.lamports()
        .checked_add(seller_proceeds)
        .ok_or(BetFunError::ArithmeticOverflow)?;

    // Transfer fees to protocol
    let total_fees = buyer_fee
        .checked_add(seller_fee)
        .ok_or(BetFunError::ArithmeticOverflow)?;

    if total_fees > 0 {
        **ctx.accounts.buy_order_escrow.try_borrow_mut_lamports()? = ctx.accounts.buy_order_escrow.lamports()
            .checked_sub(total_fees)
            .ok_or(BetFunError::ArithmeticOverflow)?;

        **ctx.accounts.protocol_fee_recipient.try_borrow_mut_lamports()? = ctx.accounts.protocol_fee_recipient.lamports()
            .checked_add(total_fees)
            .ok_or(BetFunError::ArithmeticOverflow)?;
    }

    // Update buy order
    buy_order.update_fill(match_size, match_price, buyer_fee);
    buy_order.updated_at = current_time;

    // Update sell order
    sell_order.update_fill(match_size, match_price, seller_fee);
    sell_order.updated_at = current_time;

    // Record trade
    trade.trade_id = order_book.trade_count;
    trade.arena = ctx.accounts.arena.key();
    trade.outcome_index = order_book.outcome_index;
    trade.buy_order_id = buy_order.order_id;
    trade.sell_order_id = sell_order.order_id;
    trade.buyer = buy_order.owner;
    trade.seller = sell_order.owner;
    trade.price = match_price;
    trade.size = match_size;
    trade.buyer_fee = buyer_fee;
    trade.seller_fee = seller_fee;
    trade.executed_at = current_time;
    trade.bump = ctx.bumps.trade;

    // Update order book statistics
    order_book.update_trade_stats(match_price, total_value, current_time);

    // Update active orders count if orders are filled
    if buy_order.status == OrderStatus::Filled {
        order_book.active_orders = order_book.active_orders.saturating_sub(1);
    }
    if sell_order.status == OrderStatus::Filled {
        order_book.active_orders = order_book.active_orders.saturating_sub(1);
    }

    msg!("Trade settled in order book: {}", order_book.key());
    msg!("Trade ID: {}", trade.trade_id);
    msg!("Buy order: {} ({}% filled)", buy_order.order_id, buy_order.fill_percentage());
    msg!("Sell order: {} ({}% filled)", sell_order.order_id, sell_order.fill_percentage());
    msg!("Match size: {}, Price: {}", match_size, match_price);
    msg!("Buyer fee: {}, Seller fee: {}", buyer_fee, seller_fee);

    emit!(TradeSettled {
        order_book: order_book.key(),
        trade_id: trade.trade_id,
        buy_order_id: buy_order.order_id,
        sell_order_id: sell_order.order_id,
        buyer: buy_order.owner,
        seller: sell_order.owner,
        price: match_price,
        size: match_size,
        buyer_fee,
        seller_fee,
    });

    Ok(())
}

#[event]
pub struct TradeSettled {
    pub order_book: Pubkey,
    pub trade_id: u64,
    pub buy_order_id: u64,
    pub sell_order_id: u64,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub price: u64,
    pub size: u64,
    pub buyer_fee: u64,
    pub seller_fee: u64,
}

