# 🚀 Deployment Guide - BetFun Arena

## Prerequisites

1. **Install Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Install Solana CLI**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

3. **Install Anchor**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest
   avm use latest
   ```

## Step 1: Build the Anchor Program

```bash
cd packages/anchor
anchor build
```

This will:
- Compile the Rust program
- Generate the IDL file at `target/idl/betfun.json`
- Create the deployable `.so` file

## Step 2: Copy IDL to SDK

```bash
# From project root
mkdir -p packages/sdk/src/idl
cp packages/anchor/target/idl/betfun.json packages/sdk/src/idl/betfun.json
```

## Step 3: Update SDK to Use Real IDL

Update `packages/sdk/src/index.ts`:

```typescript
import idl from './idl/betfun.json';

// Replace getMinimalIDL() with:
const program = new Program(idl as any, PROGRAM_ID, provider);
```

## Step 4: Deploy to Devnet

```bash
cd packages/anchor

# Ensure you have devnet SOL
solana config set --url devnet
solana airdrop 2

# Deploy
anchor deploy --provider.cluster devnet
```

After deployment, note the program ID and update:
- `NEXT_PUBLIC_PROGRAM_ID` environment variable
- `packages/sdk/src/index.ts` PROGRAM_ID

## Step 5: Deploy to Mainnet

```bash
cd packages/anchor

# Switch to mainnet
solana config set --url mainnet

# Ensure you have sufficient SOL for deployment
# (Deployment costs ~2-3 SOL)

# Deploy
anchor deploy --provider.cluster mainnet
```

## Step 6: Update Environment Variables

After deployment, update all environment variables:

```bash
# .env.local (for frontend)
NEXT_PUBLIC_PROGRAM_ID=<your_deployed_program_id>

# .env (for backend services)
PROGRAM_ID=<your_deployed_program_id>
```

## Step 7: Verify Deployment

1. Check program on Solana Explorer:
   ```
   https://explorer.solana.com/address/<PROGRAM_ID>
   ```

2. Test arena creation in the app
3. Verify transactions on Solana Explorer

## Current Status

✅ **SDK Updated**: Now uses Anchor Program interface to build real instructions  
✅ **Transaction Building**: Properly constructs create_arena instructions  
⚠️ **IDL Required**: Need to build Anchor program to generate IDL  
⚠️ **Program Deployment**: Program needs to be deployed before use  

## Next Steps

1. Build the Anchor program (`anchor build`)
2. Copy the IDL to the SDK
3. Deploy to devnet for testing
4. Update environment variables
5. Test arena creation
6. Deploy to mainnet when ready

---

**Note**: The SDK currently uses a minimal IDL structure. Once the program is built, replace it with the actual IDL for full functionality.
