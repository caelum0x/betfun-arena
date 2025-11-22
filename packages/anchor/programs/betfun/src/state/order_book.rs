use anchor_lang::prelude::*;

/// Order type
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum OrderType {
    /// Standard limit order
    Limit,
    /// Stop-loss order (triggers when price reaches stop price)
    StopLoss,
    /// Iceberg order (only shows partial size)
    Iceberg,
    /// TWAP order (time-weighted average price)
    TWAP,
}

/// Order side
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum OrderSide {
    /// Buy order (bid)
    Buy,
    /// Sell order (ask)
    Sell,
}

/// Order status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum OrderStatus {
    /// Order is active and can be matched
    Open,
    /// Order is partially filled
    PartiallyFilled,
    /// Order is completely filled
    Filled,
    /// Order was cancelled by user
    Cancelled,
    /// Order expired
    Expired,
}

/// Limit order in the order book
#[account]
pub struct LimitOrder {
    /// Order ID (unique per arena)
    pub order_id: u64,
    
    /// Parent arena
    pub arena: Pubkey,
    
    /// Which outcome this order is for
    pub outcome_index: u8,
    
    /// Order owner
    pub owner: Pubkey,
    
    // ========== ORDER DETAILS ==========
    
    /// Order type
    pub order_type: OrderType,
    
    /// Order side (buy/sell)
    pub side: OrderSide,
    
    /// Limit price (in lamports per token)
    pub price: u64,
    
    /// Original order size (in tokens)
    pub size: u64,
    
    /// Remaining unfilled size
    pub remaining_size: u64,
    
    /// Amount filled so far
    pub filled_size: u64,
    
    // ========== SPECIAL ORDER PARAMS ==========
    
    /// Stop price for stop-loss orders
    pub stop_price: Option<u64>,
    
    /// Visible size for iceberg orders
    pub visible_size: Option<u64>,
    
    /// TWAP execution interval (seconds)
    pub twap_interval: Option<u64>,
    
    /// TWAP last execution time
    pub twap_last_execution: Option<i64>,
    
    // ========== METADATA ==========
    
    /// Order status
    pub status: OrderStatus,
    
    /// Timestamp when order was created
    pub created_at: i64,
    
    /// Expiration timestamp (0 = no expiration)
    pub expires_at: i64,
    
    /// Last update timestamp
    pub updated_at: i64,
    
    /// Total fees paid
    pub fees_paid: u64,
    
    /// Average fill price
    pub avg_fill_price: u64,
    
    /// Bump seed
    pub bump: u8,
}

impl LimitOrder {
    pub const SIZE: usize = 8 + // discriminator
        8 +  // order_id
        32 + // arena
        1 +  // outcome_index
        32 + // owner
        1 +  // order_type
        1 +  // side
        8 +  // price
        8 +  // size
        8 +  // remaining_size
        8 +  // filled_size
        9 +  // stop_price (Option<u64>)
        9 +  // visible_size (Option<u64>)
        9 +  // twap_interval (Option<u64>)
        9 +  // twap_last_execution (Option<i64>)
        1 +  // status
        8 +  // created_at
        8 +  // expires_at
        8 +  // updated_at
        8 +  // fees_paid
        8 +  // avg_fill_price
        1;   // bump
    
    /// Check if order is active
    pub fn is_active(&self) -> bool {
        matches!(self.status, OrderStatus::Open | OrderStatus::PartiallyFilled)
    }
    
    /// Check if order is expired
    pub fn is_expired(&self, current_time: i64) -> bool {
        self.expires_at > 0 && current_time >= self.expires_at
    }
    
    /// Check if stop-loss is triggered
    pub fn is_stop_triggered(&self, current_price: u64) -> bool {
        if let Some(stop_price) = self.stop_price {
            match self.side {
                OrderSide::Buy => current_price >= stop_price,
                OrderSide::Sell => current_price <= stop_price,
            }
        } else {
            false
        }
    }
    
    /// Get visible size for iceberg orders
    pub fn get_visible_size(&self) -> u64 {
        if let Some(visible) = self.visible_size {
            visible.min(self.remaining_size)
        } else {
            self.remaining_size
        }
    }
    
    /// Check if TWAP order should execute
    pub fn should_execute_twap(&self, current_time: i64) -> bool {
        if let (Some(interval), Some(last_exec)) = (self.twap_interval, self.twap_last_execution) {
            current_time >= last_exec + interval as i64
        } else {
            false
        }
    }
    
    /// Calculate fill percentage
    pub fn fill_percentage(&self) -> u8 {
        if self.size == 0 {
            return 0;
        }
        ((self.filled_size as u128 * 100) / self.size as u128) as u8
    }
    
    /// Update after partial fill
    pub fn update_fill(&mut self, filled_amount: u64, fill_price: u64, fee: u64) {
        self.filled_size += filled_amount;
        self.remaining_size = self.remaining_size.saturating_sub(filled_amount);
        self.fees_paid += fee;
        
        // Update average fill price
        if self.filled_size > 0 {
            let total_value = (self.avg_fill_price as u128 * (self.filled_size - filled_amount) as u128)
                + (fill_price as u128 * filled_amount as u128);
            self.avg_fill_price = (total_value / self.filled_size as u128) as u64;
        }
        
        // Update status
        if self.remaining_size == 0 {
            self.status = OrderStatus::Filled;
        } else {
            self.status = OrderStatus::PartiallyFilled;
        }
    }
}

/// Order book for an outcome
#[account]
pub struct OrderBook {
    /// Parent arena
    pub arena: Pubkey,
    
    /// Which outcome this order book is for
    pub outcome_index: u8,
    
    /// Next order ID
    pub next_order_id: u64,
    
    /// Total number of active orders
    pub active_orders: u64,
    
    /// Total buy orders
    pub total_buy_orders: u64,
    
    /// Total sell orders
    pub total_sell_orders: u64,
    
    // ========== BEST BID/ASK ==========
    
    /// Best bid price
    pub best_bid: u64,
    
    /// Best ask price
    pub best_ask: u64,
    
    /// Spread (ask - bid)
    pub spread: u64,
    
    /// Mid price ((bid + ask) / 2)
    pub mid_price: u64,
    
    // ========== STATISTICS ==========
    
    /// Last trade price
    pub last_trade_price: u64,
    
    /// 24h trading volume
    pub volume_24h: u64,
    
    /// Total number of trades
    pub trade_count: u64,
    
    /// Last trade timestamp
    pub last_trade_at: i64,
    
    /// 24h high price
    pub high_24h: u64,
    
    /// 24h low price
    pub low_24h: u64,
    
    /// Price 24h ago
    pub price_24h_ago: u64,
    
    /// Bump seed
    pub bump: u8,
}

impl OrderBook {
    pub const SIZE: usize = 8 + // discriminator
        32 + // arena
        1 +  // outcome_index
        8 +  // next_order_id
        8 +  // active_orders
        8 +  // total_buy_orders
        8 +  // total_sell_orders
        8 +  // best_bid
        8 +  // best_ask
        8 +  // spread
        8 +  // mid_price
        8 +  // last_trade_price
        8 +  // volume_24h
        8 +  // trade_count
        8 +  // last_trade_at
        8 +  // high_24h
        8 +  // low_24h
        8 +  // price_24h_ago
        1;   // bump
    
    /// Update best bid/ask and spread
    pub fn update_best_prices(&mut self, bid: u64, ask: u64) {
        self.best_bid = bid;
        self.best_ask = ask;
        
        if bid > 0 && ask > 0 {
            self.spread = ask.saturating_sub(bid);
            self.mid_price = (bid + ask) / 2;
        }
    }
    
    /// Update after a trade
    pub fn update_trade_stats(&mut self, price: u64, volume: u64, current_time: i64) {
        self.last_trade_price = price;
        self.trade_count += 1;
        self.volume_24h = self.volume_24h.saturating_add(volume);
        self.last_trade_at = current_time;
        
        // Update high/low
        if price > self.high_24h {
            self.high_24h = price;
        }
        if self.low_24h == 0 || price < self.low_24h {
            self.low_24h = price;
        }
        
        // Reset 24h stats if more than 24 hours passed
        if current_time - self.last_trade_at > 86400 {
            self.volume_24h = volume;
            self.high_24h = price;
            self.low_24h = price;
            self.price_24h_ago = price;
        }
    }
    
    /// Calculate 24h price change percentage (in basis points)
    pub fn price_change_24h(&self) -> i32 {
        if self.price_24h_ago == 0 {
            return 0;
        }
        
        let change = self.last_trade_price as i64 - self.price_24h_ago as i64;
        ((change * 10000) / self.price_24h_ago as i64) as i32
    }
    
    /// Get next order ID and increment
    pub fn get_next_order_id(&mut self) -> u64 {
        let id = self.next_order_id;
        self.next_order_id += 1;
        id
    }
}

/// Trade execution record
#[account]
pub struct Trade {
    /// Trade ID
    pub trade_id: u64,
    
    /// Parent arena
    pub arena: Pubkey,
    
    /// Outcome index
    pub outcome_index: u8,
    
    /// Buy order ID
    pub buy_order_id: u64,
    
    /// Sell order ID
    pub sell_order_id: u64,
    
    /// Buyer
    pub buyer: Pubkey,
    
    /// Seller
    pub seller: Pubkey,
    
    /// Trade price
    pub price: u64,
    
    /// Trade size
    pub size: u64,
    
    /// Buyer fee
    pub buyer_fee: u64,
    
    /// Seller fee
    pub seller_fee: u64,
    
    /// Timestamp
    pub executed_at: i64,
    
    /// Bump seed
    pub bump: u8,
}

impl Trade {
    pub const SIZE: usize = 8 + // discriminator
        8 +  // trade_id
        32 + // arena
        1 +  // outcome_index
        8 +  // buy_order_id
        8 +  // sell_order_id
        32 + // buyer
        32 + // seller
        8 +  // price
        8 +  // size
        8 +  // buyer_fee
        8 +  // seller_fee
        8 +  // executed_at
        1;   // bump
}

