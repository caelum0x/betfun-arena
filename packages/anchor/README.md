# BetFun Arena - Anchor Smart Contracts

Production-ready Solana smart contracts for decentralized prediction markets.

## 📋 Overview

The BetFun Arena smart contracts implement a complete prediction market system with:
- Arena creation and management
- Participant joining and betting
- Automated and manual resolution
- Secure payout distribution
- NFT trophy minting for winners

## 🏗️ Architecture

### Program Structure

```
packages/anchor/programs/betfun/
├── src/
│   ├── lib.rs                    # Program entry point
│   ├── error.rs                  # Custom error codes
│   ├── instructions/
│   │   ├── create_arena.rs       # Create new prediction arena
│   │   ├── join_arena.rs         # Join arena and place bet
│   │   ├── resolve_arena.rs      # Resolve arena (creator/oracle)
│   │   ├── claim_winnings.rs     # Claim winnings after resolution
│   │   └── mint_trophy.rs        # Record trophy NFT mint
│   └── state/
│       ├── arena.rs              # Arena account structure
│       └── participant.rs        # Participant account structure
└── tests/
    ├── create_arena.test.ts      # Arena creation tests
    ├── join_arena.test.ts        # Joining and betting tests
    └── resolve_claim.test.ts     # Resolution and claiming tests
```

### Account Structure

#### Arena Account
- **PDA Seeds**: `["arena", creator_pubkey, title]`
- **Size**: Dynamic based on title, outcomes, and tags
- **Fields**:
  - Creator, title, description, question
  - Outcomes (2-6 options)
  - Entry fee, total pot, participants
  - Outcome distribution (counts & pots)
  - Resolution status, winner
  - End time, manual resolve flag
  - Oracle, token mint (optional)

#### Participant Account
- **PDA Seeds**: `["participant", arena_pubkey, user_pubkey]`
- **Size**: 125 bytes (fixed)
- **Fields**:
  - Arena, wallet, outcome chosen
  - Amount staked, claimed status
  - Joined timestamp, trophy mint

## 🔧 Development

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### Build

```bash
# Navigate to anchor directory
cd packages/anchor

# Build the program
anchor build

# The compiled program will be in:
# target/deploy/betfun.so
```

### Test

```bash
# Run all tests
anchor test

# Run specific test file
anchor test --skip-deploy -- --tests tests/create_arena.test.ts
```

### Deploy

#### Devnet
```bash
# Ensure you have devnet SOL in your wallet
solana airdrop 2

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

#### Mainnet
```bash
# Ensure you have sufficient SOL in your wallet for deployment

# Deploy to mainnet
anchor deploy --provider.cluster mainnet

# Program address will be: BetFunArenaPredictionMarketGameV1111111111111
```

## 📝 Instructions

### 1. Create Arena

Creates a new prediction arena with specified parameters.

**Accounts:**
- `arena` - Arena PDA (will be initialized)
- `creator` - Creator's wallet (signer, mut)
- `system_program` - System program

**Args:**
- `title: String` - Arena title (3-80 chars)
- `description: String` - Description (max 280 chars)
- `question: String` - Question being predicted (10-200 chars)
- `outcomes: Vec<String>` - 2-6 possible outcomes
- `tags: Vec<String>` - Up to 5 tags for categorization
- `entry_fee: u64` - Entry fee in lamports (0.001-10 SOL)
- `end_time: i64` - Unix timestamp for end time
- `manual_resolve: bool` - Whether resolution is manual
- `oracle: Option<Pubkey>` - Optional oracle for automated resolution
- `token_mint: Option<Pubkey>` - Optional token mint for tokenized arenas

**Validation:**
- Title length (3-80 chars)
- Outcomes count (2-6)
- No duplicate outcomes
- Entry fee range (0.001-10 SOL)
- End time must be in future (for non-manual)
- Max duration: 1 year

### 2. Join Arena

Join an arena by betting on an outcome.

**Accounts:**
- `arena` - Arena PDA (mut)
- `participant` - Participant PDA (will be initialized)
- `user` - User's wallet (signer, mut)
- `system_program` - System program

**Args:**
- `outcome_chosen: u8` - Index of chosen outcome

**Effects:**
- Transfers entry fee from user to arena (escrow)
- Updates arena statistics (pot, participants, outcome distribution)
- Creates participant account

**Validation:**
- Arena not resolved
- Arena not ended
- Valid outcome index
- Sufficient user balance

### 3. Resolve Arena

Resolve an arena by selecting the winning outcome.

**Accounts:**
- `arena` - Arena PDA (mut)
- `resolver` - Creator or oracle (signer)

**Args:**
- `winner_outcome: u8` - Index of winning outcome

**Authorization:**
- Creator can always resolve
- Oracle can resolve if specified
- For non-manual arenas, must have ended

**Validation:**
- Valid outcome index
- Outcome has participants
- Arena not already resolved

### 4. Claim Winnings

Claim winnings after arena is resolved.

**Accounts:**
- `arena` - Arena PDA (mut)
- `participant` - Participant PDA (mut)
- `user` - User's wallet (signer, mut)
- `creator` - Creator's wallet (mut, receives fee)
- `system_program` - System program

**Effects:**
- Transfers payout from arena to user
- Transfers creator fee (5%) to creator (once, on first claim)
- Marks participant as claimed

**Validation:**
- Arena is resolved
- User won (correct outcome)
- Not already claimed
- Sufficient arena balance

### 5. Mint Trophy

Record trophy NFT mint for winner.

**Accounts:**
- `arena` - Arena PDA
- `participant` - Participant PDA (mut)
- `user` - User's wallet (signer)

**Args:**
- `trophy_mint: Pubkey` - Mint address of trophy cNFT

**Validation:**
- Arena resolved
- User won
- Winnings already claimed
- Trophy not already minted

**Note:** Actual cNFT minting happens off-chain via Metaplex Bubblegum. This instruction records the mint on-chain.

## 🧪 Testing

### Test Coverage

- **Create Arena**: 10 tests (validation, edge cases)
- **Join Arena**: 6 tests (fund transfers, state updates)
- **Resolve & Claim**: 5 tests (payouts, authorization)
- **Total**: 21+ comprehensive tests

### Running Tests

```bash
# All tests
anchor test

# With console logs
anchor test -- --nocapture

# Specific file
anchor test -- --test create_arena

# Skip build (if already built)
anchor test --skip-build
```

## 🔒 Security Features

### Validation
- Comprehensive input validation on all instructions
- Outcome index bounds checking
- Arena state checks (resolved, ended)
- Authorization checks (creator, oracle)

### Fund Safety
- Secure SOL transfers via CPI
- Arithmetic overflow protection
- Rent-exempt minimum calculations
- Double-claim prevention

### Access Control
- Creator-only functions protected
- Oracle authorization when specified
- Participant-wallet matching

## 📊 Economics

### Creator Fee
- **Default**: 5% (500 basis points)
- **Applied to**: Total pot
- **Distribution**: Paid once on first winner claim
- **Calculation**: `pot × creator_fee_bps / 10000`

### Winner Payout
```
distributable_pot = total_pot - creator_fee
participant_payout = (participant_stake / winner_pot) × distributable_pot
```

### Example

```
Arena: "Will BTC reach $100k?"
Entry Fee: 0.1 SOL
Participants: 10 (6 on "Yes", 4 on "No")
Total Pot: 1 SOL

Resolution: "Yes" wins

Creator Fee: 1 × 0.05 = 0.05 SOL
Distributable: 1 - 0.05 = 0.95 SOL
Winner Pot: 0.6 SOL (6 participants × 0.1)

Each "Yes" participant payout:
(0.1 / 0.6) × 0.95 = 0.158 SOL
Profit: 0.058 SOL (58% ROI)
```

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (`anchor test`)
- [ ] Update program ID if needed
- [ ] Wallet has sufficient SOL
- [ ] Cluster configured (devnet/mainnet)

### Deployment
```bash
# 1. Build
anchor build

# 2. Get program ID
solana address -k target/deploy/betfun-keypair.json

# 3. Update Anchor.toml and lib.rs with program ID

# 4. Rebuild
anchor build

# 5. Deploy
anchor deploy --provider.cluster mainnet

# 6. Verify
solana program show <PROGRAM_ID>
```

### Post-Deployment
- [ ] Test with small amounts first
- [ ] Monitor transactions
- [ ] Update frontend with program ID
- [ ] Configure indexer to track program

## 📚 Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Metaplex Bubblegum (cNFTs)](https://docs.metaplex.com/programs/compression/)

## 🤝 Contributing

See the main project [CONTRIBUTING.md](../../CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](../../LICENSE)

