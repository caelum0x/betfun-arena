const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Generate a new keypair
const keypair = Keypair.generate();
const programId = keypair.publicKey.toString();

// Save keypair
const keypairPath = path.join(__dirname, 'target', 'deploy', 'betfun-keypair.json');
fs.mkdirSync(path.dirname(keypairPath), { recursive: true });
fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)));

console.log('Generated Program ID:', programId);
console.log('Keypair saved to:', keypairPath);
console.log('\nUpdate the following files with this Program ID:');
console.log('1. packages/anchor/programs/betfun/src/lib.rs - declare_id!("' + programId + '");');
console.log('2. packages/anchor/Anchor.toml - betfun = "' + programId + '"');

