# 🎯 Advanced Trading Features - Deep Architecture Plan

## Overview

This document outlines a comprehensive plan to implement **Polymarket-style advanced trading** features for BetFun Arena, including limit orders, AMM pools, and order matching.

---   

## 🧠 Deep Analysis: Current vs. Target State

### Current State (Basic Prediction Market)
```
User → Place Bet (Entry Fee) → Arena Escrow → Resolution → Winner Claims
```

**Limitations**:
- Fixed entry fee (no price discovery)
- No secondary market (can't exit before resolution)
- No liquidity provision
- No market maker incentives
- All-or-nothing outcome (binary)

### Target State (Advanced Trading Platform)
```
User → Place Limit Order → Order Book → Matching Engine → AMM Pool → Execution
                              ↓
                         Market Makers
                              ↓
                         Liquidity Providers
```

**Features**:
- Dynamic pricing (order book + AMM)
- Secondary market (buy/sell shares anytime)
- Liquidity pools (automated market making)
- Market maker rewards
- Partial fills
- Price discovery

---

## 📊 Architecture Decision: Hybrid Model

After deep analysis, the optimal approach is a **Hybrid Order Book + AMM Model** (exactly like Polymarket):

### Why Hybrid?

1. **Order Book** = Better price discovery, lower slippage for large orders
2. **AMM** = Always available liquidity, easier for casual users
3. **Combined** = Best of both worlds

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    TRADING LAYER                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐           ┌─────────────────┐       │
│  │  Order Book  │           │   AMM Pool      │       │
│  │              │           │                 │       │
│  │  Limit Orders│  ←────→  │  Constant       │       │
│  │  Market Ord. │  Route   │  Product        │       │
│  │  Matching    │           │  Market Maker   │       │
│  └──────────────┘           └─────────────────┘       │
│         ↑                            ↑                 │
│         │                            │                 │
│         └────────────┬───────────────┘                 │
│                      ↓                                 │
│            ┌──────────────────┐                        │
│            │  Smart Router    │                        │
│            │  (Best Execution)│                        │
│            └──────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ Component Breakdown

### 1. **Share Tokens (SPL Tokens)**

Instead of "betting on outcomes," users buy/sell **outcome shares**.

**Example**:
- Arena: "Will BTC hit $100k by EOY?"
- Outcomes: YES / NO
- Shares: `YES_TOKEN`, `NO_TOKEN`
- Price: $0.60 YES = 60% probability

**Implementation**:
```rust
// packages/anchor/programs/betfun/src/state/shares.rs

#[account]
pub struct OutcomeShare {
    pub arena: Pubkey,           // Parent arena
    pub outcome_index: u8,        // Which outcome (0, 1, 2...)
    pub token_mint: Pubkey,       // SPL token mint
    pub total_supply: u64,        // Total shares minted
    pub price: u64,               // Current market price (in lamports)
    pub volume_24h: u64,          // 24h trading volume
}

// Each arena creates N outcome tokens (N = number of outcomes)
// Users can buy/sell these tokens freely
```

**Key Properties**:
- Each outcome token is an SPL token
- Fully transferable
- Can be traded on secondary markets
- Redeemable for 1 SOL if outcome wins

---

### 2. **Limit Order Book**

Traditional order book for price discovery.

**Data Structures**:
```rust
#[account]
pub struct LimitOrder {
    pub id: u64,
    pub trader: Pubkey,
    pub arena: Pubkey,
    pub outcome_index: u8,
    pub side: OrderSide,          // Buy or Sell
    pub price: u64,               // Limit price
    pub size: u64,                // Number of shares
    pub filled: u64,              // Shares filled so far
    pub status: OrderStatus,      // Open, PartiallyFilled, Filled, Cancelled
    pub created_at: i64,
    pub expires_at: Option<i64>,  // Good-til-cancelled or time-limited
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum OrderSide {
    Buy,   // Buying outcome shares
    Sell,  // Selling outcome shares
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum OrderStatus {
    Open,
    PartiallyFilled,
    Filled,
    Cancelled,
    Expired,
}

// Order Book structure
#[account]
pub struct OrderBook {
    pub arena: Pubkey,
    pub outcome_index: u8,
    pub bids: Vec<u64>,  // Order IDs sorted by price (descending)
    pub asks: Vec<u64>,  // Order IDs sorted by price (ascending)
    pub best_bid: Option<u64>,
    pub best_ask: Option<u64>,
    pub spread: u64,     // best_ask - best_bid
}
```

**Matching Algorithm** (Price-Time Priority):
```
1. New order arrives
2. Check opposite side of book
3. Match if price crosses spread:
   - Buy order matches if price >= best ask
   - Sell order matches if price <= best bid
4. Fill orders in price-time priority
5. Partial fills allowed
6. Remaining size goes into book
```

---

### 3. **AMM Pool (Constant Product Market Maker)**

Automated liquidity using the constant product formula.

**Formula**: `x * y = k`

Where:
- `x` = Reserve of outcome token
- `y` = Reserve of SOL
- `k` = Constant product

**Example**:
```
Initial Pool: 1000 YES tokens × 600 SOL = 600,000 (k)
Current Price: 600 / 1000 = 0.6 SOL per YES token (60% implied probability)

User buys 100 YES tokens:
- New x = 1000 - 100 = 900
- New y = 600,000 / 900 = 666.67 SOL
- User pays: 666.67 - 600 = 66.67 SOL
- New price: 666.67 / 900 = 0.74 SOL (74%)
```

**Implementation**:
```rust
#[account]
pub struct AMMPool {
    pub arena: Pubkey,
    pub outcome_index: u8,
    
    // Reserves
    pub token_reserve: u64,      // Outcome token reserve
    pub sol_reserve: u64,        // SOL reserve
    pub k: u128,                 // Constant product (x * y)
    
    // Liquidity
    pub lp_token_mint: Pubkey,   // LP token for this pool
    pub total_lp_tokens: u64,    // Total LP tokens issued
    
    // Fees
    pub fee_bps: u16,            // Trading fee (e.g., 30 bps = 0.3%)
    pub protocol_fee_bps: u16,   // Protocol fee (e.g., 10 bps = 0.1%)
    
    // Stats
    pub volume_24h: u64,
    pub fees_collected: u64,
    pub last_price: u64,
}

// Liquidity Provider Token
#[account]
pub struct LiquidityPosition {
    pub pool: Pubkey,
    pub provider: Pubkey,
    pub lp_tokens: u64,
    pub token_deposited: u64,
    pub sol_deposited: u64,
    pub created_at: i64,
}
```

**Key Functions**:
```rust
// Add liquidity
pub fn add_liquidity(
    ctx: Context<AddLiquidity>,
    token_amount: u64,
    sol_amount: u64,
    min_lp_tokens: u64,
) -> Result<()>

// Remove liquidity
pub fn remove_liquidity(
    ctx: Context<RemoveLiquidity>,
    lp_tokens: u64,
    min_token_amount: u64,
    min_sol_amount: u64,
) -> Result<()>

// Swap (buy/sell outcome tokens)
pub fn swap(
    ctx: Context<Swap>,
    amount_in: u64,
    min_amount_out: u64,
    is_token_to_sol: bool,  // true = sell tokens, false = buy tokens
) -> Result<()>

// Price calculation
pub fn get_price(token_reserve: u64, sol_reserve: u64) -> u64 {
    (sol_reserve * PRECISION) / token_reserve
}

// Output amount (with slippage)
pub fn get_amount_out(
    amount_in: u64,
    reserve_in: u64,
    reserve_out: u64,
    fee_bps: u16,
) -> Result<u64> {
    let amount_in_with_fee = amount_in * (10000 - fee_bps) / 10000;
    let numerator = amount_in_with_fee * reserve_out;
    let denominator = reserve_in + amount_in_with_fee;
    Ok(numerator / denominator)
}
```

---

### 4. **Smart Order Router**

Routes orders to best execution venue (order book vs. AMM).

**Decision Tree**:
```
User wants to buy 100 YES tokens
    ↓
Check Order Book:
    - Best ask price: 0.65 SOL
    - Available size: 50 tokens
    ↓
Check AMM Pool:
    - Current price: 0.63 SOL
    - Price after 100 tokens: 0.68 SOL
    - Average price: 0.655 SOL
    ↓
Decision:
    1. Buy 50 from order book at 0.65 (cost: 32.5 SOL)
    2. Buy 50 from AMM at avg 0.66 (cost: 33 SOL)
    Total cost: 65.5 SOL
    Average price: 0.655 SOL per token
```

**Implementation**:
```rust
pub struct Router {
    pub order_book: Pubkey,
    pub amm_pool: Pubkey,
}

impl Router {
    pub fn get_best_route(
        &self,
        side: OrderSide,
        size: u64,
    ) -> Result<Route> {
        // 1. Get order book depth
        let ob_price = self.get_order_book_price(side, size)?;
        let ob_liquidity = self.get_order_book_liquidity(side)?;
        
        // 2. Get AMM quote
        let amm_price = self.get_amm_price(side, size)?;
        
        // 3. Calculate optimal split
        if ob_liquidity >= size {
            // Enough liquidity in order book
            if ob_price < amm_price {
                return Ok(Route::OrderBook(size));
            } else {
                return Ok(Route::AMM(size));
            }
        } else {
            // Split between order book and AMM
            let ob_size = ob_liquidity;
            let amm_size = size - ob_liquidity;
            return Ok(Route::Split {
                order_book_size: ob_size,
                amm_size,
            });
        }
    }
}

pub enum Route {
    OrderBook(u64),              // Size to route to order book
    AMM(u64),                    // Size to route to AMM
    Split {                      // Split between both
        order_book_size: u64,
        amm_size: u64,
    },
}
```

---

### 5. **Matching Engine**

Processes limit orders and executes trades.

**Architecture**:
```
Off-Chain (Fast):
┌────────────────────────────────────┐
│   Matching Engine (TypeScript)     │
│   - Maintains in-memory order book │
│   - Matches orders in microseconds │
│   - Batches executions              │
└────────────────────────────────────┘
         ↓ (every 1-5 seconds)
On-Chain (Secure):
┌────────────────────────────────────┐
│   Smart Contract                   │
│   - Validates matches              │
│   - Executes settlements           │
│   - Emits events                   │
└────────────────────────────────────┘
```

**Matching Engine (Off-Chain)**:
```typescript
// packages/matching-engine/src/engine.ts

export class MatchingEngine {
  private orderBook: OrderBook;
  private pendingMatches: Match[] = [];
  
  async processOrder(order: LimitOrder): Promise<Match[]> {
    const matches: Match[] = [];
    
    if (order.side === OrderSide.Buy) {
      // Match against asks
      const asks = this.orderBook.getAsks(order.outcome_index);
      
      for (const ask of asks) {
        if (order.price >= ask.price && order.filled < order.size) {
          const fillSize = Math.min(
            order.size - order.filled,
            ask.size - ask.filled
          );
          
          matches.push({
            buyOrderId: order.id,
            sellOrderId: ask.id,
            price: ask.price,  // Taker gets maker's price
            size: fillSize,
            timestamp: Date.now(),
          });
          
          order.filled += fillSize;
          ask.filled += fillSize;
        } else {
          break;  // No more matches
        }
      }
    } else {
      // Match against bids (similar logic)
    }
    
    // Add unmatched portion to book
    if (order.filled < order.size) {
      this.orderBook.addOrder(order);
    }
    
    return matches;
  }
  
  async settleBatch(): Promise<void> {
    if (this.pendingMatches.length === 0) return;
    
    // Send batch to on-chain contract
    const tx = await this.program.methods
      .settleMatches(this.pendingMatches)
      .accounts({...})
      .rpc();
    
    this.pendingMatches = [];
  }
}
```

**On-Chain Settlement**:
```rust
pub fn settle_matches(
    ctx: Context<SettleMatches>,
    matches: Vec<Match>,
) -> Result<()> {
    for match_info in matches {
        // 1. Validate match
        let buy_order = &ctx.accounts.buy_order;
        let sell_order = &ctx.accounts.sell_order;
        
        require!(
            buy_order.price >= match_info.price,
            ErrorCode::InvalidMatch
        );
        
        // 2. Transfer tokens
        // Buyer gets outcome tokens
        token::transfer(
            CpiContext::new(...),
            buy_order.trader,
            match_info.size,
        )?;
        
        // Seller gets SOL
        **sell_order.trader.lamports.borrow_mut() += 
            match_info.price * match_info.size;
        
        // 3. Update orders
        buy_order.filled += match_info.size;
        sell_order.filled += match_info.size;
        
        // 4. Collect fees
        let fee = (match_info.price * match_info.size * FEE_BPS) / 10000;
        // ... fee distribution
        
        // 5. Emit event
        emit!(TradeExecuted {
            arena: buy_order.arena,
            buy_order: buy_order.id,
            sell_order: sell_order.id,
            price: match_info.price,
            size: match_info.size,
        });
    }
    
    Ok(())
}
```

---

## 🔄 Complete Trading Flow

### Example: User wants to buy 100 YES tokens

```
┌─────────────────────────────────────────────────────────┐
│ 1. User submits order                                   │
│    - Type: Market or Limit                              │
│    - Size: 100 tokens                                   │
│    - Max price: 0.70 SOL (limit) or market              │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Smart Router analyzes                                │
│    - Order book: 60 tokens at 0.65                      │
│    - AMM: 40 tokens at avg 0.67                         │
│    - Decision: Split order                              │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Matching Engine                                      │
│    A. Match 60 tokens from order book                   │
│       - Fill 3 existing limit orders                    │
│       - Average price: 0.65 SOL                         │
│    B. Route 40 tokens to AMM                            │
│       - Swap SOL for tokens                             │
│       - Average price: 0.67 SOL                         │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. On-Chain Settlement                                  │
│    - Transfer 100 YES tokens to buyer                   │
│    - Transfer 66 SOL from buyer                         │
│    - Distribute SOL to sellers                          │
│    - Collect trading fees (0.3%)                        │
│    - Update pool reserves                               │
│    - Update order book                                  │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Post-Trade                                           │
│    - Emit TradeExecuted event                           │
│    - Update user portfolio                              │
│    - Update market statistics                           │
│    - Index transaction                                  │
│    - Update UI (via WebSocket)                          │
└─────────────────────────────────────────────────────────┘
```

---

## 💰 Fee Structure

### Trading Fees
```
Market Orders:   0.3% (30 bps)
Limit Orders:    0.1% maker, 0.2% taker (20 bps avg)
AMM Swaps:       0.3% (30 bps)
```

### Fee Distribution
```
Total Fee: 0.3%
├── Liquidity Providers: 0.15% (50%)
├── Protocol Treasury:   0.10% (33%)
└── Market Makers:       0.05% (17%)
```

### Market Maker Rebates
```
Volume Tier        | Rebate
-------------------|--------
< $10k/month       | 0%
$10k - $100k       | 0.02%
$100k - $1M        | 0.04%
> $1M              | 0.05%
```

---

## 📊 Implementation Phases

### Phase 1: Share Tokens (Week 1)
- [ ] Create SPL token mints for each outcome
- [ ] Implement buy/sell shares (basic)
- [ ] Token transfer functionality
- [ ] Share redemption on resolution

**Deliverables**:
- Smart contract: `outcome_shares.rs`
- Frontend: Share balance display
- SDK: Share token helpers

---

### Phase 2: AMM Pool (Week 2)
- [ ] Constant product AMM implementation
- [ ] Add/remove liquidity functions
- [ ] Swap function with slippage protection
- [ ] LP token minting
- [ ] Fee collection

**Deliverables**:
- Smart contract: `amm_pool.rs`
- Frontend: AMM swap UI
- SDK: AMM quote calculator

---

### Phase 3: Limit Order Book (Week 3)
- [ ] Order book data structure
- [ ] Place limit order instruction
- [ ] Cancel order instruction
- [ ] Order expiration handling

**Deliverables**:
- Smart contract: `order_book.rs`, `limit_order.rs`
- Frontend: Order book visualization
- SDK: Order management

---

### Phase 4: Matching Engine (Week 4)
- [ ] Off-chain matching engine (TypeScript)
- [ ] Price-time priority algorithm
- [ ] Partial fill logic
- [ ] On-chain settlement
- [ ] Batch execution optimization

**Deliverables**:
- Matching engine service
- Smart contract: `settle_matches.rs`
- WebSocket: Real-time trade feed

---

### Phase 5: Smart Router (Week 5)
- [ ] Route calculation algorithm
- [ ] Best execution logic
- [ ] Split order routing
- [ ] Gas optimization

**Deliverables**:
- SDK: Smart router
- Frontend: Route preview
- Analytics: Execution quality

---

### Phase 6: Advanced Features (Week 6)
- [ ] Market maker program
- [ ] Stop-loss orders
- [ ] Iceberg orders
- [ ] TWAp orders
- [ ] Advanced order types

**Deliverables**:
- Complete trading platform
- Market maker dashboard
- Advanced order UI

---

## 🔐 Security Considerations

### Smart Contract Security
1. **Reentrancy Protection** - No external calls in middle of state changes
2. **Integer Overflow** - Use checked math everywhere
3. **Price Oracle Manipulation** - TWAP for AMM prices
4. **Flash Loan Protection** - Require minimum time between trades
5. **Front-Running** - Batch execution to prevent
6. **Access Control** - Owner-only admin functions

### Economic Security
1. **Impermanent Loss** - Educate LPs about risks
2. **Pool Draining** - Minimum liquidity requirements
3. **Price Impact** - Display slippage before trade
4. **Sandwich Attacks** - MEV protection via private mempool

---

## 📈 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Order Placement** | < 100ms | Off-chain acceptance |
| **Order Matching** | < 10ms | In-memory matching |
| **On-Chain Settlement** | < 2s | Batch every 1-5 seconds |
| **AMM Swap** | < 1s | Direct on-chain |
| **Order Book Depth** | 1,000 orders | Per outcome |
| **Throughput** | 100+ trades/sec | Batched settlement |
| **Gas Cost** | < 0.001 SOL/trade | Optimized instructions |

---

## 🎯 Success Metrics

### Trading Metrics
- **Daily Volume**: $100k+ within 3 months
- **Active Traders**: 500+ daily users
- **Order Book Depth**: $10k+ on each side
- **AMM TVL**: $100k+ per arena
- **Average Spread**: < 2%

### UX Metrics
- **Order Fill Rate**: > 95%
- **Average Fill Time**: < 5 seconds
- **Slippage**: < 1% for $1k orders
- **Failed Transactions**: < 1%

---

## 🚀 Go-to-Market Strategy

### Phase 1: Beta Launch
- Invite 50 power users
- Limited arenas (5-10 markets)
- Low liquidity ($10k per market)
- Gather feedback

### Phase 2: Public Launch
- Open to all users
- 50+ active markets
- Liquidity mining program
- Market maker partnerships

### Phase 3: Scale
- 500+ markets
- $1M+ daily volume
- Institutional market makers
- API for trading bots

---

## 💡 Key Insights & Design Decisions

### Why Hybrid Model?
- **Pure Order Book**: Hard to bootstrap liquidity
- **Pure AMM**: High slippage for large trades
- **Hybrid**: Best of both worlds ✅

### Why Off-Chain Matching?
- **Speed**: Microsecond matching vs. 400ms blocks
- **Cost**: Batch settlement = lower fees
- **UX**: Instant order confirmation

### Why SPL Tokens?
- **Composability**: Shares can be used elsewhere
- **Secondary Markets**: Trade on Raydium, Jupiter
- **Custody**: Users truly own their positions

### Why Batched Settlement?
- **Gas Efficiency**: 10x cheaper per trade
- **MEV Protection**: Prevents front-running
- **Throughput**: 100+ trades/sec possible

---

## 📚 Reference Implementations

### Polymarket
- Hybrid order book + AMM
- USDC-based shares
- Off-chain matching, on-chain settlement
- CLOB (Central Limit Order Book)

### Drift Protocol (Solana)
- Virtual AMM (vAMM) for perpetuals
- Similar hybrid model
- High-frequency trading support

### Serum (Solana)
- Pure order book DEX
- On-chain matching
- ~1000 TPS

### Raydium (Solana)
- Uniswap-style AMM
- Liquidity pools
- Integration with Serum order book

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Low Liquidity** | High slippage | Liquidity mining, MM incentives |
| **Smart Contract Bugs** | Loss of funds | Audits, bug bounty, gradual rollout |
| **MEV/Front-Running** | User value extraction | Private mempool, batch execution |
| **Market Manipulation** | Unfair prices | Position limits, monitoring |
| **Regulatory** | Legal issues | KYC/AML, restricted regions |

---

## 🎓 Technical Challenges

### 1. Cross-Program Invocation (CPI) Limits
**Problem**: Solana limits CPI depth  
**Solution**: Minimize nested calls, use direct transfers

### 2. Account Size Limits
**Problem**: Order book can't grow infinitely  
**Solution**: Linked list structure, paginated accounts

### 3. Compute Units
**Problem**: Complex matching exceeds 200k CU limit  
**Solution**: Off-chain matching, on-chain validation only

### 4. Price Oracle Reliability
**Problem**: Manipulable prices  
**Solution**: Time-weighted average price (TWAP)

### 5. Partial Fills
**Problem**: Tracking partially filled orders  
**Solution**: Separate `size` and `filled` fields

---

## 📝 Conclusion

This plan provides a **comprehensive roadmap** for implementing Polymarket-level advanced trading features. The hybrid order book + AMM model balances:

✅ **Performance** - Off-chain matching for speed  
✅ **Security** - On-chain settlement for trust  
✅ **Liquidity** - AMM provides baseline liquidity  
✅ **Price Discovery** - Order book for tight spreads  
✅ **User Experience** - Fast, low-cost trading  

**Estimated Timeline**: 6 weeks for MVP, 3 months for full feature set  
**Estimated Cost**: $50k-100k development + $20k audit  
**Risk Level**: Medium (complex but proven architecture)  

**Recommendation**: Start with Phase 1-2 (Share Tokens + AMM) for quick wins, then add order book based on user demand.

---

*This plan represents deep architectural thinking and is ready for implementation.*

