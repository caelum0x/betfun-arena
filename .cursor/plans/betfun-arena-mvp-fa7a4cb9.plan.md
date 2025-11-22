<!-- fa7a4cb9-5344-4bc6-bbd6-19e728d0075b 364f010e-c9af-457c-b8ee-10e1af670627 -->
# Phase 2: Polish & Ship - 100% Wireframe Parity + Deployment

## Overview

With 90% of USERFLOW.md implemented, this phase completes the remaining UI elements, integrates all sponsor APIs, tests critical flows, optimizes performance, and prepares the hackathon-winning submission.

## Implementation Plan

### 1. Complete Missing UI Elements (High Priority)

**Feed Page (/feed)**

- Add search bar component: "🔍 Search arenas..." with autocomplete
- Position: Top of feed, 56px height, matches header style
- Functionality: Filter arenas by title/question/tags in real-time

**Create Arena (/create)**

- Add mini bonding curve chart preview when "Tokenized Arena" toggle is ON
- Chart shows: "↗ 69,420 SOL raised" projected bonding curve
- Use Recharts or simple SVG line chart
- Add custom date/time picker styling to match design system

**Resolve Screen (/arena/[id]/resolve)**

- Display current odds: "Yes 92% · No 8%"
- Show pot distribution preview: "(92% of pot)" next to each outcome
- Add reason/description textarea with Inter 16px styling

**Victory Screen**

- Implement SOL rain animation (falling coin emojis with physics)
- Use requestAnimationFrame for smooth 60fps animation
- Trigger on mount, play for 5 seconds

### 2. Sponsor API Integrations (Critical)

**Play Solana SDK** (SPONSOR_APIS.md)

- Install `@play-solana/sdk` package
- Initialize in `layout.tsx` with `projectId: "betfun-arena-2025"`
- Leaderboard page: Replace mock data with `PlaySolana.leaderboard` component
- Submit scores on arena resolution via `PlaySolana.leaderboard.submit()`
- Add 5 achievements: First Win, Whale Bet, Perfect Week, Arena Creator, 10x Return

**Pyth Network** (Price Feed Oracles)

- Install `@pythnetwork/client` if not present
- Create `hooks/usePythPrice.ts` for real-time BTC/SOL/WIF prices
- Arena detail: Show live price for crypto-based arenas
- Auto-resolution: Fetch price at `end_time` and resolve automatically
- WebSocket subscription for live updates in battle view

**Indie.fun Widget** (Token Bonding Curve)

- Add embed script to `layout.tsx`: `<script src="https://indie.fun/embed.js"></script>`
- Arena detail (tokenized): Show `<div class="indie-launch" data-mint={tokenMint} />`
- Display current price, 24h volume, bonding curve chart
- Link to full Indie.fun page for trading

### 3. Component Polish & Micro-interactions

**FloatingActionButton**

- Add haptic feedback on tap (iOS)
- Pulse animation on hover (scale 1.0 → 1.1 → 1.0 loop)
- Sound effect: "whoosh.mp3" on click

**ArenaCard**

- Hover effect: Lift shadow, scale 1.02
- Click: Subtle scale down (0.98) before navigation
- Loading state: Shimmer skeleton with pulse

**BetButtons**

- Disabled state: 50% opacity, no hover
- Loading: Show spinner inside button with "Placing bet..."
- Success: Green checkmark ✅ flash before redirect to battle

**Bottom Tab Bar**

- Active page: Bounce animation on mount
- Badge notifications: Red dot for new messages/updates
- Haptic feedback on tab switch

### 4. Smart Contract Integration & Testing

**On-chain Transactions**

- Test `create_arena` with all parameter variations
- Test `join_arena` with multiple outcomes
- Test `resolve_arena` (manual + Pyth oracle)
- Test `claim_winnings` + `mint_trophy` flow
- Verify PDA derivations match SDK

**Error Handling**

- Transaction failures: User-friendly error messages
- Insufficient funds: "Need X more SOL" prompt
- Already bet: Disable buttons, show existing position
- Arena ended: Show resolution screen or results

**Wallet States**

- Not connected: Show connect prompt on protected pages
- Wrong network: "Switch to mainnet-beta" message
- Transaction pending: Show loading overlay with tx signature link

### 5. Performance Optimization

**Frontend**

- Lazy load Moddio iframe (only when visible)
- Image optimization: Next.js Image component for arena images
- Code splitting: Dynamic imports for heavy components (Confetti, Charts)
- Bundle analysis: `next build --analyze`, target <1MB main bundle

**Database Queries**

- Supabase: Add indexes on `created_at`, `end_time`, `pot`, `is_resolved`
- Pagination: Increase limit from 20 → 50 for fewer requests
- Caching: Use SWR/React Query for arena data (30s stale time)

**Moddio Game**

- Optimize world: Reduce sprites, compress assets
- Event throttling: Big bet alerts max 1/second
- Lazy connect: Only establish WebSocket when battle tab active

### 6. Mobile Testing & Fixes

**iPhone Testing** (393×852px)

- Test on Safari (iOS 17+)
- Verify safe areas (notch, home indicator)
- Test wallet connect with Phantom mobile app
- Verify tab bar doesn't overlap content
- Test FAB position above tab bar

**Android Testing**

- Test on Chrome (latest)
- Verify back button behavior
- Test wallet connect with Phantom mobile
- Check navbar/status bar overlaps

**PWA Features**

- Add to Home Screen: Verify icon, splash screen
- Offline fallback: "No connection" message
- Push notifications: Disabled for MVP (future)

### 7. End-to-End Testing

**Critical User Flows**

1. Landing → Connect Wallet → Feed → Create Arena → Success
2. Feed → Arena Detail → Bet → Battle → Victory Screen → Share
3. Feed → Arena Detail → Battle (spectator) → No bet allowed
4. Arena Detail (creator) → Resolve → Payout → Trophy mint
5. Leaderboard → Profile → Trophy gallery

**Edge Cases**

- Arena ends during battle (show resolution modal)
- User refreshes during transaction (tx status check)
- Multiple tabs open (sync state with localStorage)
- Slow network (loading states, timeouts)

### 8. Deployment

**Smart Contracts** (Solana Mainnet-Beta)

- Deploy to mainnet with `anchor deploy`
- Verify program ID in `constants.ts`
- Initialize Merkle tree for cNFT trophies
- Airdrop test SOL to team wallets

**Frontend** (Vercel)

- Deploy to `betfun.arena` domain
- Set env vars: Supabase, Moddio, Indie.fun, Pyth API keys
- Enable Analytics: Vercel Analytics + Plausible
- Set up redirects: `/` → `/feed` if wallet connected

**Indexer** (Railway/Render)

- Deploy Express server with Dockerfile
- Set up Helius webhook for transaction events
- Connect to Supabase with production credentials
- Health check endpoint: `/api/health`

**Database** (Supabase)

- Run migrations on production DB
- Enable Row Level Security (RLS) policies
- Backup database: Hourly snapshots
- Monitor query performance

### 9. Hackathon Submission Materials

**90-Second Trailer**

- Script: Problem → Solution → Demo → CTA
- Screen recording: iPhone mockup, smooth transitions
- Background music: High-energy, royalty-free
- Voiceover: Professional or AI (ElevenLabs)
- Export: 1080p MP4, upload to YouTube

**GitHub README**

- Update with live demo link
- Add GIF walkthrough (5-10 seconds)
- Verify all sponsor integrations section
- Add "Built for Indie.fun Hackathon" badge
- Include installation/setup instructions

**Indie.fun Project Page**

- Create project listing with screenshots
- Upload logo + hero image
- Write compelling description (200 words)
- Link to GitHub, demo, trailer
- Tag: `hackathon`, `solana`, `prediction-markets`

**Superteam Submission**

- Fill out submission form
- Attach trailer, GitHub link, demo URL
- Highlight all 4 sponsor integrations
- Emphasize innovation: "Polymarket + Twitch"
- Include metrics: X users, Y volume, Z arenas

### 10. Final Polish

**Landing Page Stats** (Real-time)

- Fetch from Supabase: COUNT(*) arenas, SUM(pot) volume
- Update every 30 seconds
- Animate number changes (count up effect)

**Share to X Templates**

- Victory: "Just won X SOL on BetFun Arena! 💰"
- Create: "I just created a prediction battle: [question]"
- Whale bet: "Just bet X SOL that [outcome]! Who's with me?"
- Include UTM params: `?utm_source=twitter&utm_medium=share`

**Error Boundaries**

- Wrap pages in ErrorBoundary component
- Fallback UI: "Something went wrong" + Refresh button
- Log errors to Sentry (optional)

**Loading States**

- Skeleton loaders for arena cards (shimmer effect)
- Transaction pending: Spinner + "Confirming on Solana..."
- Page transitions: Fade in/out with Framer Motion

---

## Success Criteria

- ✅ 100% USERFLOW.md wireframe parity
- ✅ All 4 sponsor APIs integrated and working
- ✅ 5 critical user flows tested end-to-end
- ✅ Mobile-optimized (iPhone + Android)
- ✅ Deployed to production (smart contract + frontend + indexer)
- ✅ Trailer uploaded, submission completed
- ✅ Live demo with ≥3 real arenas

---

## Timeline (7 Days to Hackathon Deadline)

**Days 1-2**: Complete UI elements, sponsor SDKs
**Days 3-4**: Smart contract testing, bug fixes
**Days 5-6**: Deployment, trailer, submission prep
**Day 7**: Final testing, launch, submit

Let's ship a winner. ⚔️🚀

### To-dos

- [ ] Create Figma workspace with 6 core screens and design system
- [ ] Implement complete Anchor smart contract with all instructions and state
- [ ] Generate TypeScript SDK and helper functions from Anchor IDL
- [ ] Setup Next.js app with wallet adapter, dependencies, and providers
- [ ] Build home feed page with arena cards and infinite scroll
- [ ] Build create arena page with 3-step form and validation
- [ ] Build live arena battle page with Moddio embed and real-time data
- [ ] Build resolution page with confetti, trophy display, and share button
- [ ] Build leaderboard and profile pages
- [ ] Create reusable component library (ArenaCard, BetButtons, etc.)
- [ ] Integrate Indie.fun token launch API for tokenized arenas
- [ ] Setup Moddio world, configure game logic, and embed in frontend
- [ ] Integrate Play Solana leaderboards and achievement system
- [ ] Integrate Pyth price feeds for crypto-based arena auto-resolution
- [ ] Create Supabase database schema with migrations
- [ ] Build Express indexer API with arena feed and webhook handler
- [ ] Optimize for mobile, add PWA support, and test on devices
- [ ] Add Framer Motion animations, confetti, and sound effects
- [ ] Implement share buttons and Open Graph meta tags
- [ ] Deploy smart contract to mainnet, frontend to Vercel, indexer to Railway
- [ ] Create 90-second trailer video and marketing assets
- [ ] Prepare GitHub README, Indie.fun page, and Superteam submission