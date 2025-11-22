use anchor_lang::prelude::*;

/// Represents a tradable outcome share token
/// Each outcome in an arena has its own SPL token that can be bought/sold
#[account]
pub struct OutcomeShare {
    /// Parent arena
    pub arena: Pubkey,
    
    /// Which outcome this represents (0, 1, 2, ...)
    pub outcome_index: u8,
    
    /// SPL token mint for this outcome
    pub token_mint: Pubkey,
    
    /// Total supply of shares minted
    pub total_supply: u64,
    
    /// Current market price (in lamports per share)
    /// Updated by AMM and order book
    pub current_price: u64,
    
    /// 24-hour trading volume (in lamports)
    pub volume_24h: u64,
    
    /// Total number of trades
    pub trade_count: u64,
    
    /// Last trade timestamp
    pub last_trade_at: i64,
    
    /// Highest price in last 24h
    pub high_24h: u64,
    
    /// Lowest price in last 24h
    pub low_24h: u64,
    
    /// Price 24h ago (for calculating change)
    pub price_24h_ago: u64,
    
    /// Bump seed for PDA
    pub bump: u8,
}

impl OutcomeShare {
    /// Calculate space needed for account
    pub const SIZE: usize = 8 + // discriminator
        32 + // arena
        1 +  // outcome_index
        32 + // token_mint
        8 +  // total_supply
        8 +  // current_price
        8 +  // volume_24h
        8 +  // trade_count
        8 +  // last_trade_at
        8 +  // high_24h
        8 +  // low_24h
        8 +  // price_24h_ago
        1;   // bump
    
    /// Calculate 24h price change percentage
    pub fn price_change_24h(&self) -> i64 {
        if self.price_24h_ago == 0 {
            return 0;
        }
        
        let change = self.current_price as i64 - self.price_24h_ago as i64;
        (change * 10000) / self.price_24h_ago as i64 // Basis points
    }
    
    /// Update price statistics
    pub fn update_price_stats(&mut self, new_price: u64, current_time: i64) {
        self.current_price = new_price;
        self.last_trade_at = current_time;
        
        // Update 24h high/low
        if new_price > self.high_24h {
            self.high_24h = new_price;
        }
        if self.low_24h == 0 || new_price < self.low_24h {
            self.low_24h = new_price;
        }
        
        // Reset 24h stats if more than 24 hours passed
        if current_time - self.last_trade_at > 86400 {
            self.volume_24h = 0;
            self.high_24h = new_price;
            self.low_24h = new_price;
            self.price_24h_ago = new_price;
        }
    }
    
    /// Add volume to 24h tracking
    pub fn add_volume(&mut self, amount: u64) {
        self.volume_24h = self.volume_24h.saturating_add(amount);
        self.trade_count = self.trade_count.saturating_add(1);
    }
}

/// User's share balance for a specific outcome
#[account]
pub struct ShareBalance {
    /// Owner of these shares
    pub owner: Pubkey,
    
    /// Which outcome share this is
    pub outcome_share: Pubkey,
    
    /// Number of shares owned
    pub balance: u64,
    
    /// Average purchase price (for P&L calculation)
    pub avg_cost_basis: u64,
    
    /// Total amount invested (in lamports)
    pub total_invested: u64,
    
    /// Realized profit/loss from sells
    pub realized_pnl: i64,
    
    /// Bump seed
    pub bump: u8,
}

impl ShareBalance {
    pub const SIZE: usize = 8 + // discriminator
        32 + // owner
        32 + // outcome_share
        8 +  // balance
        8 +  // avg_cost_basis
        8 +  // total_invested
        8 +  // realized_pnl
        1;   // bump
    
    /// Calculate unrealized P&L
    pub fn unrealized_pnl(&self, current_price: u64) -> i64 {
        let current_value = (self.balance as u128 * current_price as u128) / 1_000_000_000;
        let cost = (self.balance as u128 * self.avg_cost_basis as u128) / 1_000_000_000;
        current_value as i64 - cost as i64
    }
    
    /// Calculate total P&L (realized + unrealized)
    pub fn total_pnl(&self, current_price: u64) -> i64 {
        self.realized_pnl + self.unrealized_pnl(current_price)
    }
    
    /// Update cost basis when buying shares
    pub fn buy_shares(&mut self, amount: u64, price: u64) {
        let new_total_cost = self.total_invested + (amount * price / 1_000_000_000);
        let new_balance = self.balance + amount;
        
        if new_balance > 0 {
            self.avg_cost_basis = (new_total_cost * 1_000_000_000) / new_balance;
        }
        
        self.balance = new_balance;
        self.total_invested = new_total_cost;
    }
    
    /// Update P&L when selling shares
    pub fn sell_shares(&mut self, amount: u64, price: u64) -> Result<()> {
        require!(self.balance >= amount, ErrorCode::InsufficientShares);
        
        // Calculate realized P&L for this sale
        let cost = (amount as u128 * self.avg_cost_basis as u128) / 1_000_000_000;
        let proceeds = (amount as u128 * price as u128) / 1_000_000_000;
        let pnl = proceeds as i64 - cost as i64;
        
        self.realized_pnl += pnl;
        self.balance -= amount;
        self.total_invested = self.total_invested.saturating_sub(cost as u64);
        
        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient shares")]
    InsufficientShares,
}

