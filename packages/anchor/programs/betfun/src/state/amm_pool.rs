use anchor_lang::prelude::*;

/// Automated Market Maker (AMM) pool for outcome shares
/// Uses constant product formula: x * y = k
#[account]
pub struct AMMPool {
    /// Parent arena
    pub arena: Pubkey,
    
    /// Which outcome this pool is for
    pub outcome_index: u8,
    
    /// Outcome share token mint
    pub share_mint: Pubkey,
    
    // ========== RESERVES ==========
    
    /// Reserve of outcome share tokens
    pub token_reserve: u64,
    
    /// Reserve of SOL (in lamports)
    pub sol_reserve: u64,
    
    /// Constant product (k = x * y)
    pub k: u128,
    
    // ========== LIQUIDITY ==========
    
    /// LP token mint for this pool
    pub lp_token_mint: Pubkey,
    
    /// Total LP tokens issued
    pub total_lp_tokens: u64,
    
    // ========== FEES ==========
    
    /// Trading fee in basis points (e.g., 30 = 0.3%)
    pub fee_bps: u16,
    
    /// Protocol fee in basis points (e.g., 10 = 0.1%)
    pub protocol_fee_bps: u16,
    
    /// Total fees collected (in SOL)
    pub fees_collected: u64,
    
    // ========== STATISTICS ==========
    
    /// 24-hour trading volume (in SOL)
    pub volume_24h: u64,
    
    /// Total number of swaps
    pub swap_count: u64,
    
    /// Last swap timestamp
    pub last_swap_at: i64,
    
    /// Last price (SOL per token)
    pub last_price: u64,
    
    /// Price 24h ago
    pub price_24h_ago: u64,
    
    /// Bump seed
    pub bump: u8,
}

impl AMMPool {
    pub const SIZE: usize = 8 + // discriminator
        32 + // arena
        1 +  // outcome_index
        32 + // share_mint
        8 +  // token_reserve
        8 +  // sol_reserve
        16 + // k
        32 + // lp_token_mint
        8 +  // total_lp_tokens
        2 +  // fee_bps
        2 +  // protocol_fee_bps
        8 +  // fees_collected
        8 +  // volume_24h
        8 +  // swap_count
        8 +  // last_swap_at
        8 +  // last_price
        8 +  // price_24h_ago
        1;   // bump
    
    /// Get current price (SOL per token)
    pub fn get_price(&self) -> u64 {
        if self.token_reserve == 0 {
            return 0;
        }
        // Price = sol_reserve / token_reserve
        ((self.sol_reserve as u128 * 1_000_000_000) / self.token_reserve as u128) as u64
    }
    
    /// Calculate output amount for a swap
    /// Uses formula: dy = (y * dx) / (x + dx)
    /// With fee: dy = (y * dx * (10000 - fee)) / ((x + dx) * 10000)
    pub fn get_amount_out(
        &self,
        amount_in: u64,
        reserve_in: u64,
        reserve_out: u64,
    ) -> Result<u64> {
        require!(amount_in > 0, ErrorCode::InvalidAmount);
        require!(reserve_in > 0 && reserve_out > 0, ErrorCode::InsufficientLiquidity);
        
        // Apply fee
        let amount_in_with_fee = (amount_in as u128 * (10000 - self.fee_bps) as u128) / 10000;
        
        // Calculate output
        let numerator = amount_in_with_fee * reserve_out as u128;
        let denominator = (reserve_in as u128) + amount_in_with_fee;
        
        let amount_out = numerator / denominator;
        
        require!(amount_out > 0, ErrorCode::InsufficientOutputAmount);
        require!(amount_out <= u64::MAX as u128, ErrorCode::ArithmeticOverflow);
        
        Ok(amount_out as u64)
    }
    
    /// Calculate price impact for a swap
    /// Returns basis points (e.g., 100 = 1%)
    pub fn calculate_price_impact(
        &self,
        amount_in: u64,
        is_token_to_sol: bool,
    ) -> Result<u16> {
        let current_price = self.get_price();
        
        let (reserve_in, reserve_out) = if is_token_to_sol {
            (self.token_reserve, self.sol_reserve)
        } else {
            (self.sol_reserve, self.token_reserve)
        };
        
        let amount_out = self.get_amount_out(amount_in, reserve_in, reserve_out)?;
        
        // New price after swap
        let new_price = if is_token_to_sol {
            let new_sol = self.sol_reserve - amount_out;
            let new_tokens = self.token_reserve + amount_in;
            ((new_sol as u128 * 1_000_000_000) / new_tokens as u128) as u64
        } else {
            let new_sol = self.sol_reserve + amount_in;
            let new_tokens = self.token_reserve - amount_out;
            ((new_sol as u128 * 1_000_000_000) / new_tokens as u128) as u64
        };
        
        // Calculate impact in basis points
        let impact = if new_price > current_price {
            ((new_price - current_price) as u128 * 10000) / current_price as u128
        } else {
            ((current_price - new_price) as u128 * 10000) / current_price as u128
        };
        
        Ok(impact.min(10000) as u16)
    }
    
    /// Calculate LP tokens to mint when adding liquidity
    pub fn calculate_lp_tokens(
        &self,
        token_amount: u64,
        sol_amount: u64,
    ) -> Result<u64> {
        if self.total_lp_tokens == 0 {
            // First liquidity provider
            // LP tokens = sqrt(token_amount * sol_amount)
            let product = (token_amount as u128) * (sol_amount as u128);
            let lp_tokens = (product as f64).sqrt() as u64;
            require!(lp_tokens > 0, ErrorCode::InsufficientLiquidityMinted);
            Ok(lp_tokens)
        } else {
            // Subsequent liquidity providers
            // LP tokens = min(
            //   total_lp * token_amount / token_reserve,
            //   total_lp * sol_amount / sol_reserve
            // )
            let lp_from_tokens = ((self.total_lp_tokens as u128 * token_amount as u128) 
                / self.token_reserve as u128) as u64;
            let lp_from_sol = ((self.total_lp_tokens as u128 * sol_amount as u128) 
                / self.sol_reserve as u128) as u64;
            
            let lp_tokens = lp_from_tokens.min(lp_from_sol);
            require!(lp_tokens > 0, ErrorCode::InsufficientLiquidityMinted);
            Ok(lp_tokens)
        }
    }
    
    /// Calculate amounts to withdraw when removing liquidity
    pub fn calculate_withdraw_amounts(
        &self,
        lp_tokens: u64,
    ) -> Result<(u64, u64)> {
        require!(lp_tokens > 0, ErrorCode::InvalidAmount);
        require!(lp_tokens <= self.total_lp_tokens, ErrorCode::InsufficientLiquidity);
        
        // token_amount = token_reserve * lp_tokens / total_lp_tokens
        let token_amount = ((self.token_reserve as u128 * lp_tokens as u128) 
            / self.total_lp_tokens as u128) as u64;
        
        // sol_amount = sol_reserve * lp_tokens / total_lp_tokens
        let sol_amount = ((self.sol_reserve as u128 * lp_tokens as u128) 
            / self.total_lp_tokens as u128) as u64;
        
        Ok((token_amount, sol_amount))
    }
    
    /// Update pool statistics after a swap
    pub fn update_swap_stats(&mut self, volume: u64, current_time: i64) {
        self.swap_count += 1;
        self.volume_24h = self.volume_24h.saturating_add(volume);
        self.last_price = self.get_price();
        
        // Reset 24h stats if more than 24 hours passed
        if current_time - self.last_swap_at > 86400 {
            self.volume_24h = volume;
            self.price_24h_ago = self.last_price;
        }
        
        self.last_swap_at = current_time;
    }
    
    /// Calculate 24h price change percentage (in basis points)
    pub fn price_change_24h(&self) -> i32 {
        if self.price_24h_ago == 0 {
            return 0;
        }
        
        let change = self.last_price as i64 - self.price_24h_ago as i64;
        ((change * 10000) / self.price_24h_ago as i64) as i32
    }
}

/// Liquidity provider position
#[account]
pub struct LiquidityPosition {
    /// Pool this position is for
    pub pool: Pubkey,
    
    /// Liquidity provider
    pub provider: Pubkey,
    
    /// Number of LP tokens owned
    pub lp_tokens: u64,
    
    /// Amount of share tokens deposited
    pub tokens_deposited: u64,
    
    /// Amount of SOL deposited
    pub sol_deposited: u64,
    
    /// Timestamp when liquidity was added
    pub created_at: i64,
    
    /// Fees earned (in SOL)
    pub fees_earned: u64,
    
    /// Bump seed
    pub bump: u8,
}

impl LiquidityPosition {
    pub const SIZE: usize = 8 + // discriminator
        32 + // pool
        32 + // provider
        8 +  // lp_tokens
        8 +  // tokens_deposited
        8 +  // sol_deposited
        8 +  // created_at
        8 +  // fees_earned
        1;   // bump
    
    /// Calculate current value of position
    pub fn calculate_value(&self, pool: &AMMPool) -> Result<(u64, u64)> {
        pool.calculate_withdraw_amounts(self.lp_tokens)
    }
    
    /// Calculate impermanent loss
    pub fn calculate_impermanent_loss(&self, pool: &AMMPool) -> Result<i64> {
        let (current_tokens, current_sol) = self.calculate_value(pool)?;
        
        // Current value
        let current_value = current_sol + 
            ((current_tokens as u128 * pool.get_price() as u128) / 1_000_000_000) as u64;
        
        // Initial value (if held)
        let initial_value = self.sol_deposited + 
            ((self.tokens_deposited as u128 * pool.get_price() as u128) / 1_000_000_000) as u64;
        
        Ok(current_value as i64 - initial_value as i64)
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,
    
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
    
    #[msg("Insufficient output amount")]
    InsufficientOutputAmount,
    
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    
    #[msg("Insufficient liquidity minted")]
    InsufficientLiquidityMinted,
    
    #[msg("Slippage tolerance exceeded")]
    SlippageToleranceExceeded,
}

