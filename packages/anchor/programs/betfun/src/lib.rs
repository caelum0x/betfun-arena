use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("HrS1KpYRWfg9xUom8jnGqoRAayVCxHxukeb18C4WKAkE");

#[program]
pub mod betfun {
    use super::*;

    /// Create a new prediction arena
    pub fn create_arena(
        ctx: Context<CreateArena>,
        title: String,
        description: String,
        question: String,
        outcomes: Vec<String>,
        tags: Vec<String>,
        entry_fee: u64,
        end_time: i64,
        manual_resolve: bool,
        oracle: Option<Pubkey>,
        token_mint: Option<Pubkey>,
    ) -> Result<()> {
        instructions::create_arena::handler(
            ctx,
            title,
            description,
            question,
            outcomes,
            tags,
            entry_fee,
            end_time,
            manual_resolve,
            oracle,
            token_mint,
        )
    }

    /// Join an arena by betting on an outcome
    pub fn join_arena(
        ctx: Context<JoinArena>,
        outcome_chosen: u8,
    ) -> Result<()> {
        instructions::join_arena::handler(ctx, outcome_chosen)
    }

    /// Resolve an arena (creator or oracle only)
    pub fn resolve_arena(
        ctx: Context<ResolveArena>,
        winner_outcome: u8,
    ) -> Result<()> {
        instructions::resolve_arena::handler(ctx, winner_outcome)
    }

    /// Claim winnings after arena is resolved
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        instructions::claim_winnings::handler(ctx)
    }

    /// Record trophy mint for winner
    pub fn mint_trophy(
        ctx: Context<MintTrophy>,
        trophy_mint: Pubkey,
    ) -> Result<()> {
        instructions::mint_trophy::handler(ctx, trophy_mint)
    }

    /// Create SPL token mints for each outcome of an arena
    pub fn create_share_tokens(
        ctx: Context<CreateShareTokens>,
        outcome_index: u8,
        initial_price: u64,
    ) -> Result<()> {
        instructions::create_share_tokens::handler(ctx, outcome_index, initial_price)
    }

    /// Buy outcome shares using SOL
    pub fn buy_shares(
        ctx: Context<BuyShares>,
        _outcome_index: u8,
        amount_sol: u64,
    ) -> Result<()> {
        instructions::buy_shares::handler(ctx, amount_sol)
    }

    /// Sell outcome shares for SOL
    pub fn sell_shares(
        ctx: Context<SellShares>,
        _outcome_index: u8,
        shares_to_sell: u64,
    ) -> Result<()> {
        instructions::sell_shares::handler(ctx, shares_to_sell)
    }

    /// Redeem winning outcome shares for SOL after arena resolution
    pub fn redeem_shares(
        ctx: Context<RedeemShares>,
        outcome_index: u8,
    ) -> Result<()> {
        instructions::redeem_shares::handler(ctx, outcome_index as u64)
    }

    /// Initialize an AMM pool for an outcome
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        outcome_index: u8,
        fee_bps: u16,
        protocol_fee_bps: u16,
    ) -> Result<()> {
        instructions::initialize_pool::handler(ctx, outcome_index, fee_bps, protocol_fee_bps)
    }

    /// Add liquidity to an AMM pool
    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        token_amount: u64,
        sol_amount: u64,
        min_lp_tokens: u64,
    ) -> Result<()> {
        instructions::add_liquidity::handler(ctx, token_amount, sol_amount, min_lp_tokens)
    }

    /// Remove liquidity from an AMM pool
    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        lp_tokens_to_burn: u64,
        min_token_amount: u64,
        min_sol_amount: u64,
    ) -> Result<()> {
        instructions::remove_liquidity::handler(ctx, lp_tokens_to_burn, min_token_amount, min_sol_amount)
    }

    /// Swap tokens using the AMM pool
    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        min_amount_out: u64,
        is_token_to_sol: bool,
    ) -> Result<()> {
        instructions::swap::handler(ctx, amount_in, min_amount_out, is_token_to_sol)
    }

    /// Place a limit order in the order book
    pub fn place_limit_order(
        ctx: Context<PlaceLimitOrder>,
        outcome_index: u8,
        params: PlaceOrderParams,
    ) -> Result<()> {
        instructions::place_limit_order::handler(ctx, outcome_index, params)
    }

    /// Cancel a limit order
    pub fn cancel_order(
        ctx: Context<CancelOrder>,
    ) -> Result<()> {
        instructions::cancel_order::handler(ctx)
    }

    /// Settle a matched order (called by matching engine)
    pub fn settle_match(
        ctx: Context<SettleMatch>,
        match_size: u64,
        match_price: u64,
        fee_bps: u16,
    ) -> Result<()> {
        instructions::settle_match::handler(ctx, match_size, match_price, fee_bps)
    }
}

