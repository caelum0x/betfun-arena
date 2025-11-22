#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEnvironment() {
  console.log('\n🚀 BetFun Arena - Environment Setup\n');
  console.log('This script will help you configure all environment variables.\n');

  // Frontend Environment
  console.log('📱 FRONTEND CONFIGURATION\n');
  
  const rpcUrl = await question('Solana RPC URL (default: devnet): ') || 'https://api.devnet.solana.com';
  const programId = await question('Program ID: ') || 'BetFunArenaPredictionMarketGameV1111111111111';
  const apiUrl = await question('API URL (default: http://localhost:3001): ') || 'http://localhost:3001';
  const wsUrl = await question('WebSocket URL (default: http://localhost:3002): ') || 'http://localhost:3002';
  const appUrl = await question('App URL (default: http://localhost:3000): ') || 'http://localhost:3000';

  const frontendEnv = `# Frontend Environment Variables
NEXT_PUBLIC_RPC_URL=${rpcUrl}
NEXT_PUBLIC_PROGRAM_ID=${programId}
NEXT_PUBLIC_API_URL=${apiUrl}
NEXT_PUBLIC_WS_URL=${wsUrl}
NEXT_PUBLIC_APP_URL=${appUrl}
`;

  fs.writeFileSync(path.join(__dirname, '../apps/web/.env.local'), frontendEnv);
  console.log('✅ Frontend .env.local created\n');

  // Backend Environment
  console.log('🔧 BACKEND CONFIGURATION\n');
  
  const supabaseUrl = await question('Supabase URL: ') || '';
  const supabaseKey = await question('Supabase Service Key: ') || '';
  const redisUrl = await question('Redis URL (default: redis://localhost:6379): ') || 'redis://localhost:6379';
  const heliusKey = await question('Helius API Key (optional): ') || '';

  // API Service
  const apiEnv = `# API Service Environment Variables
PORT=3001
SUPABASE_URL=${supabaseUrl}
SUPABASE_KEY=${supabaseKey}
REDIS_URL=${redisUrl}
CORS_ORIGIN=${appUrl}
`;

  fs.writeFileSync(path.join(__dirname, '../packages/api/.env'), apiEnv);
  console.log('✅ API .env created\n');

  // WebSocket Service
  const wsEnv = `# WebSocket Service Environment Variables
WS_PORT=3002
SUPABASE_URL=${supabaseUrl}
SUPABASE_KEY=${supabaseKey}
REDIS_URL=${redisUrl}
CORS_ORIGIN=${appUrl}
`;

  fs.writeFileSync(path.join(__dirname, '../packages/websocket/.env'), wsEnv);
  console.log('✅ WebSocket .env created\n');

  // Indexer Service
  const indexerEnv = `# Indexer Service Environment Variables
RPC_URL=${rpcUrl}
SUPABASE_URL=${supabaseUrl}
SUPABASE_KEY=${supabaseKey}
REDIS_URL=${redisUrl}
HELIUS_API_KEY=${heliusKey}
WEBHOOK_URL=${apiUrl}/webhook
`;

  fs.writeFileSync(path.join(__dirname, '../packages/indexer/.env'), indexerEnv);
  console.log('✅ Indexer .env created\n');

  console.log('🎉 Environment setup complete!\n');
  console.log('Next steps:');
  console.log('1. Run "npm install" to install dependencies');
  console.log('2. Run "npm run dev" to start all services');
  console.log('3. Open http://localhost:3000 in your browser\n');

  rl.close();
}

setupEnvironment().catch(console.error);

