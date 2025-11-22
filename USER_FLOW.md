# BETFUN ARENA – COMPLETE USER FLOW DOCUMENT (November 19, 2025)

This file is law for Cursor. Every route, every button click, every state must match this exactly.

## 1. Cold Start → Wallet Connect (1 second)

- User lands on https://betfun.arena → app/page.tsx (Marketing Hero, Polymarket-style)
- Big purple button: "Connect Wallet" → WalletMultiButton.tsx (Phantom first)
- After connect → redirect to /feed
- RootLayout (app/layout.tsx) wraps everything in WalletProvider + ConnectionProvider

## 2. Main Feed – /feed (Infinite scroll, exactly like Polymarket homepage)

- Infinite grid of ArenaCard.tsx (3–4 columns mobile → desktop)
- Sorting tabs: Trending | New | Ending Soon | Volume | My Bets
- Each ArenaCard shows:
  - Question + image (if any)
  - Yes/No percentages + animated LivePotBar
  - Total volume + number of players
  - Time left or "Resolved"
  - Tags (crypto, politics, memes, sports)
  - "Tokenized" badge if Indie.fun token launched
- Click card → go to /arena/[arenaId]

## 3. Create Arena Flow – /create (60-second Polymarket clone)

1. Click floating "+" button (bottom-right on mobile, top bar on desktop)
2. Form (single page, no steps):
   - Title (max 80 chars)
   - Description (optional)
   - Outcomes: default Yes/No, + "Add Outcome" button (max 6)
   - Entry fee: slider 0.01 → 5 SOL
   - Resolve date (datetime picker) OR "Manual resolve"
   - Toggle: "Launch as Tokenized Arena on Indie.fun" → shows preview bonding curve + "You earn 5–10% forever"
3. Click massive green "CREATE ARENA"
   → on-chain tx → create_arena instruction
   → if tokenized → call indie.fun API
   → redirect to /arena/[newArenaId]

## 4. Arena Detail Page – /arena/[arenaId]

Polymarket market page clone + our battle features

Top section:
- Big question + hero image
- LivePotBar (Yes 68% – No 32%) with animated fill
- Total volume, players, end time
- Big BetButtons.tsx (green YES, red NO) – disabled if already bet or resolved

Tabs:
- Battle ← default tab
- Info
- My Position
- Comments (simple on-chain or Moddio chat mirror)

## 5. Live Battle – /arena/[arenaId]/battle (the money screen)

- Full-screen ModdioBattle.tsx iframe
- URL params built by moddio/urlBuilder.ts:
  ?arena=abc123
  &side=yes|no (from user position)
  &bet=5.2
  &wallet=ABCdef...
  &role=player|spectator
- Overlays (our React on top of iframe):
  - Top bar: total pot + countdown
  - Bottom bar: "Buy Power-Up" | "Share to X" | "Meta-Bet on Winner"
- When big bet → pushEvent.ts → whale alert in Moddio
- When resolved → pushEvent.ts → victory confetti + redirect to /arena/[id]/win

## 6. Resolution Flow

Two cases:

A) Oracle/auto (Pyth price feed)
- Automatic at end time → backend indexer calls resolve_arena

B) Manual (creator)
- Creator goes to /arena/[id]/resolve
- Choose winning outcome → tx → resolve_arena instruction
- Instant payout + cNFT trophy mint to winners

## 7. Win Screen – after resolution

- ConfettiExplosion.tsx full screen
- "You won X SOL!" + animated SOL rain
- TrophyNFT.tsx minted (compressed NFT)
- ShareToXButton.tsx with pre-filled text: "Just 3x'd my money on BetFun ⚔️ https://betfun.arena/arena/abc123"

## 8. Leaderboard – /leaderboard

- PlaySolana leaderboard embed (weekly + all-time)
- Tabs: Most Won | Most Accurate | Biggest Whale | Most Arenas Created

## 9. Profile – /profile

- User avatar + total won/lost
- Trophy gallery (grid of TrophyNFT.tsx)
- Created arenas list
- Tokenized arenas → link to Indie.fun page with current price

## 10. Tag Pages – /tag/crypto, /tag/memes, etc.

- Same grid as /feed but filtered

## 11. Share & Viral Loops (every screen)

- Every arena has permanent share button → X post:
  "I just bet 10 SOL that ___ on BetFun Arena ⚔️\nJoin the battle:\nhttps://betfun.arena/arena/abc123"
- Auto-posts on win with trophy screenshot

## 12. Mobile-First Rules (non-negotiable)

- Bottom tab bar: Home | Create (+) | Leaderboard | Profile
- All pages must work perfectly on iPhone 12–16 size
- One-thumb reachable buttons

Cursor, follow this user flow EXACTLY. Never add extra steps, never change route names, never invent new pages. This is how we ship a perfect Polymarket + Twitch lovechild in 23 days and win 1st place.

