# BetFun Arena User Guide

## Getting Started

### 1. Connect Your Wallet

1. Click the "Connect Wallet" button in the top right
2. Select your Solana wallet (Phantom, Solflare, etc.)
3. Approve the connection request

### 2. Create an Arena

1. Navigate to the "Create" page
2. Fill in arena details:
   - **Title:** Short, catchy title
   - **Description:** Detailed explanation
   - **Question:** The prediction question
   - **Outcomes:** Possible outcomes (e.g., "Yes", "No")
   - **Entry Fee:** Amount in SOL to join
   - **End Time:** When the arena closes
3. Click "Create Arena"
4. Approve the transaction in your wallet

### 3. Join an Arena

1. Browse arenas on the feed page
2. Click on an arena to view details
3. Select your predicted outcome
4. Click "Join Arena"
5. Approve the transaction

### 4. Trade Shares

Once share tokens are created (by the arena creator):

1. Navigate to the "Trade" tab
2. Select an outcome
3. Choose "Buy" or "Sell"
4. Enter the number of shares
5. Review the estimated cost
6. Click "Trade"
7. Approve the transaction

## Advanced Features

### AMM Liquidity Pools

Provide liquidity to earn fees:

1. Navigate to the "Liquidity" tab
2. Click "Initialize Pool" (first time only)
3. Choose "Add" tab
4. Enter token and SOL amounts
5. Set slippage tolerance
6. Click "Add Liquidity"
7. Approve the transaction

**Remove Liquidity:**
1. Go to "Liquidity" tab
2. Choose "Remove" tab
3. Enter LP tokens to remove
4. Click "Remove Liquidity"
5. Approve the transaction

### Order Book Trading

Place limit orders for better prices:

1. Navigate to the "Order Book" tab
2. Choose "Buy" or "Sell"
3. Enter price and size
4. Click "Place Order"
5. Approve the transaction

**Cancel Order:**
1. Find your order in the list
2. Click "Cancel"
3. Approve the transaction

### Slippage Protection

When trading or providing liquidity:

1. Adjust slippage tolerance using the slider
2. **Low slippage (<0.5%):** Better prices but may fail if market moves
3. **Medium slippage (0.5-1%):** Balanced option
4. **High slippage (>1%):** More likely to succeed but worse prices

**Warning:** Very high slippage (>5%) may result in significant price impact.

## Resolving Arenas

### Automatic Resolution

Arenas with oracles resolve automatically when:
- The oracle provides the result
- The end time is reached

### Manual Resolution

Arena creators can manually resolve:

1. Navigate to the arena's resolve page
2. Select the winning outcome
3. Click "Resolve Arena"
4. Approve the transaction

## Claiming Winnings

After an arena is resolved:

1. Navigate to your portfolio
2. Find resolved arenas
3. Click "Claim Winnings"
4. Approve the transaction

## Tips & Best Practices

### Trading Tips

1. **Start Small:** Begin with small amounts to learn
2. **Check Liquidity:** Ensure sufficient liquidity before large trades
3. **Monitor Prices:** Prices update in real-time
4. **Use Limit Orders:** Better prices for patient traders
5. **Set Slippage:** Protect against price movements

### Risk Management

1. **Never bet more than you can afford to lose**
2. **Diversify:** Don't put all funds in one arena
3. **Research:** Understand the prediction before betting
4. **Monitor:** Keep track of your positions

### Gas Fees

- All transactions require SOL for fees
- Keep at least 0.01 SOL for transaction fees
- Fees are typically 0.000005 SOL per transaction

## Troubleshooting

### Transaction Failed

**Common causes:**
- Insufficient SOL balance
- Network congestion
- Slippage tolerance exceeded
- Arena already resolved

**Solutions:**
- Check your SOL balance
- Retry the transaction
- Increase slippage tolerance
- Verify arena status

### Can't See My Shares

**Possible reasons:**
- Share tokens not created yet (creator must create them)
- Wrong outcome selected
- Shares already sold

**Solutions:**
- Wait for creator to create share tokens
- Check all outcomes
- Review transaction history

### High Slippage Warning

**What it means:**
- The price may move significantly during your trade
- You may get a worse price than expected

**Solutions:**
- Reduce trade size
- Use limit orders instead
- Wait for better market conditions

## Support

For help and support:
- **Discord:** [Join our Discord](https://discord.gg/betfun)
- **Twitter:** [@BetFunArena](https://twitter.com/BetFunArena)
- **Email:** support@betfun.arena

## Glossary

- **Arena:** A prediction market
- **Outcome:** A possible result
- **Share:** Token representing a position in an outcome
- **AMM:** Automated Market Maker (liquidity pool)
- **Order Book:** Central limit order book
- **Slippage:** Difference between expected and actual price
- **LP Tokens:** Liquidity provider tokens
- **PDA:** Program Derived Address

