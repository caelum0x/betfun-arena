#!/bin/bash
# Deploy BetFun contracts to Solana devnet

set -e

export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo "=== BetFun Deployment Script ==="
echo ""

# Check if we're on devnet
CURRENT_URL=$(solana config get | grep "RPC URL" | awk '{print $3}')
if [[ "$CURRENT_URL" != *"devnet"* ]]; then
    echo "⚠️  Warning: Not on devnet. Current RPC: $CURRENT_URL"
    read -p "Switch to devnet? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        solana config set --url devnet
        echo "✅ Switched to devnet"
    else
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Get current balance
ADDRESS=$(solana address)
BALANCE=$(solana balance --url devnet | awk '{print $1}')
echo "📍 Wallet: $ADDRESS"
echo "💰 Balance: $BALANCE SOL"
echo ""

# Check if we have enough SOL (need ~6.1 SOL)
REQUIRED=6.1
if (( $(echo "$BALANCE < $REQUIRED" | bc -l) )); then
    NEEDED=$(echo "$REQUIRED - $BALANCE" | bc -l)
    echo "⚠️  Insufficient funds. Need $NEEDED more SOL"
    echo ""
    echo "Get devnet SOL from:"
    echo "  1. https://faucet.solana.com/ (paste: $ADDRESS)"
    echo "  2. https://solfaucet.com/ (select devnet, paste: $ADDRESS)"
    echo ""
    echo "Or wait a few minutes and try:"
    echo "  solana airdrop 2 $ADDRESS --url devnet"
    echo ""
    read -p "Press Enter after you've funded the account, or Ctrl+C to cancel..."
    BALANCE=$(solana balance --url devnet | awk '{print $1}')
    echo "💰 New balance: $BALANCE SOL"
    echo ""
fi

# Ensure program file exists
if [ ! -f "target/deploy/betfun.so" ]; then
    echo "📦 Building program..."
    anchor build
    if [ ! -f "programs/betfun/target/deploy/betfun.so" ]; then
        echo "❌ Build failed or program file not found"
        exit 1
    fi
    # Copy to expected location
    mkdir -p target/deploy
    cp programs/betfun/target/deploy/betfun.so target/deploy/betfun.so
    echo "✅ Build complete"
    echo ""
fi

# Deploy
echo "🚀 Deploying to devnet..."
anchor deploy --provider.cluster devnet

echo ""
echo "✅ Deployment complete!"
echo "📍 Program ID: $(solana address -k target/deploy/betfun-keypair.json)"
echo ""

