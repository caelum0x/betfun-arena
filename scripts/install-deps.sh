#!/bin/bash

# Install missing dependencies for all packages
echo "Installing dependencies for all packages..."

# API
echo "Installing API dependencies..."
cd packages/api
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/tsx" ]; then
  npm install --legacy-peer-deps --no-save ioredis express cors @supabase/supabase-js @solana/web3.js tsx typescript @types/node @types/express @types/cors 2>&1 | tail -3
fi
cd ../..

# WebSocket
echo "Installing WebSocket dependencies..."
cd packages/websocket
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/tsx" ]; then
  npm install --legacy-peer-deps --no-save socket.io ioredis @supabase/supabase-js tsx typescript @types/node 2>&1 | tail -3
fi
cd ../..

# Indexer
echo "Installing Indexer dependencies..."
cd packages/indexer
if [ ! -d "node_modules/ioredis" ]; then
  npm install --legacy-peer-deps --no-save ioredis 2>&1 | tail -3
fi
cd ../..

echo "Dependencies installation complete!"

