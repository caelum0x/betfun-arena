# BetFun Arena - Design Specification

## Design System

### Color Palette
```
Primary Colors:
- Electric Purple: #A020F0 (primary actions, highlights)
- Neon Green: #39FF14 (success, Yes outcomes, wins)
- SOL Blue: #14F195 (Solana branding, info)
- Hot Pink: #FF1493 (accents, fire emojis)
- Blood Red: #DC143C (No outcomes, losses)

Neutrals:
- Pure Black: #000000 (background)
- Dark Gray: #1A1A1A (card backgrounds)
- Medium Gray: #2D2D2D (borders, dividers)
- Light Gray: #A0A0A0 (secondary text)
- White: #FFFFFF (primary text)

Semantic Colors:
- Success: #39FF14
- Error: #DC143C
- Warning: #FFD700
- Info: #14F195
```

### Typography
```
Headers: "Eurostile" or "Kabel" (arcade/retro feel)
- H1: 48px, Bold, Line height 1.2
- H2: 36px, Bold, Line height 1.3
- H3: 24px, Bold, Line height 1.4

Body: "Inter" (clean readability)
- Body Large: 18px, Regular, Line height 1.6
- Body: 16px, Regular, Line height 1.6
- Body Small: 14px, Regular, Line height 1.5
- Caption: 12px, Regular, Line height 1.4

Meme Text: "Impact" (for fun callouts)
- Display: 64px, Bold, All caps
```

### Spacing Scale
```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
3xl: 64px
```

### Border Radius
```
sm: 8px (buttons, chips)
md: 16px (cards)
lg: 24px (modals, large cards)
full: 9999px (circular elements)
```

### Shadows
```
Glow Purple: 0 0 20px rgba(160, 32, 240, 0.5)
Glow Green: 0 0 20px rgba(57, 255, 20, 0.5)
Glow Blue: 0 0 20px rgba(20, 241, 149, 0.5)
Card: 0 4px 24px rgba(0, 0, 0, 0.8)
```

## Screen Specifications

### 1. Wallet Connect / Onboarding
**Size:** 390x844px (iPhone 14/15)
**Layout:**
- Full-screen gradient background (black → dark purple radial)
- Floating animated meme coins (BTC, SOL, BONK logos)
- Crossed swords emoji ⚔️ in center
- Logo centered at top 20% of screen
- Connect button at 60% screen height
- Footer text at 90% screen height

**Elements:**
```
[Logo Area]
- "BetFun Arena" text (H1, Electric Purple)
- "⚔️ Prediction Battles on Solana" (Body, Light Gray)
- Animated floating swords

[CTA Area]
- Connect Wallet Button:
  - Width: 280px, Height: 64px
  - Background: Electric Purple gradient
  - Text: "Connect Wallet" (Body Large, White, Bold)
  - Border radius: lg
  - Glow: Purple shadow
  - Hover: Scale 1.05
  - Active: Pulse animation

[Footer]
- "Powered by Solana" (Caption, Medium Gray)
- Wallet icons: Phantom, Solflare, Backpack (grayscale, 32px)
```

### 2. Home Feed
**Layout:**
- Fixed top bar (64px): Logo + Search + Wallet button
- Main content: Infinite scroll arena cards
- Fixed bottom tab bar (72px): 4 tabs

**Top Bar:**
```
Left: Logo (32px icon)
Center: Search bar (full width - 120px margins)
  - Background: Dark Gray
  - Placeholder: "Search arenas..." (Light Gray)
  - Icon: 🔍
Right: Wallet address (truncated) + balance
```

**Arena Card (Design):**
```
Card Container:
- Width: 100% (16px margins)
- Height: auto
- Background: Dark Gray
- Border: 1px Medium Gray
- Border radius: md
- Padding: md
- Margin bottom: md
- Box shadow: Card

Header Row:
- Avatar (40px circular, left): Creator PFP or gradient
- Title (Body Large, Bold, White): Arena question
- Badge (right): "🚀 TOKENIZED" if has token

Progress Section:
- Outcome bars (stacked):
  - Yes bar: Neon Green, height 8px
  - No bar: Blood Red, height 8px
  - Width = percentage of total pot
- Labels on bars: "YES 62%" (left), "NO 38%" (right)

Stats Row:
- 👥 247 players (Body Small, Light Gray)
- 💰 420 SOL (Body Small, SOL Blue)
- ⏰ 2d 5h left (Body Small, Light Gray)

Action Buttons:
- "Join Battle" (Primary button, half width)
- "Watch Live" (Secondary button, half width)
```

**Bottom Tab Bar:**
```
Tab Design:
- Background: Dark Gray
- Border top: 1px Medium Gray
- 4 tabs equal width

Tabs:
1. Home: 🏠 icon, "Home" label
2. Create: ➕ icon (Electric Purple, larger), "Create" label
3. Leaderboard: 🏆 icon, "Top" label
4. Profile: 👤 icon, "Profile" label

Active state:
- Icon: Electric Purple
- Label: White, Bold
- Underline: 2px Electric Purple

Inactive state:
- Icon: Medium Gray
- Label: Light Gray
```

### 3. Create Arena (3-Step Flow)
**Layout:** Full screen with stepper

**Stepper (Top):**
```
3 circles connected by lines:
- Active: Electric Purple, filled
- Completed: Neon Green, checkmark
- Pending: Medium Gray, outlined

Labels: "Details" → "Outcomes" → "Settings"
```

**Step 1: Details**
```
Form Fields:
1. Title Input:
   - Label: "Arena Title" (Body, White)
   - Placeholder: "Will Trump tweet today?"
   - Max: 80 chars
   - Border: Medium Gray → Electric Purple on focus

2. Description Textarea:
   - Label: "Description (optional)"
   - Placeholder: "Add context..."
   - Max: 280 chars
   - Height: 120px

3. Tags Input:
   - Label: "Tags"
   - Chip style: Add tag button
   - Examples: #politics #crypto #sports

Preview Card (Right side on desktop, bottom on mobile):
- Live preview of arena card
- Updates as user types

Next Button: Bottom right, Electric Purple
```

**Step 2: Outcomes**
```
Outcomes List:
- Default: 2 outcomes (Yes/No)
- Add up to 6 outcomes
- Each outcome:
  - Input field (e.g., "Yes", "No", "Maybe")
  - Color picker (auto-assigned from palette)
  - Remove button (if >2 outcomes)

"+ Add Outcome" button (max 6)

Binary Toggle:
- Switch: "Binary (Yes/No)" vs "Multiple Choice"
- Affects UI

Back Button (left) | Next Button (right)
```

**Step 3: Settings**
```
Entry Fee:
- Slider + input: 0.01 - 10 SOL
- Shows USD equivalent below
- Default: 0.05 SOL

End Time:
- Date picker + time picker
- Or toggle: "Manual Resolution" (creator decides)
- Min: 1 hour, Max: 90 days

Tokenized Arena Toggle:
- Switch: "Launch Token on Indie.fun?"
- When ON: Shows bonding curve preview
  - "You earn 5% perpetual fees"
  - Token name/symbol inputs

Create Button:
- Full width
- Neon Green background
- Text: "CREATE ARENA ⚔️"
- Glow: Green shadow
- Loading spinner on submit
```

### 4. Live Arena Battle
**Layout:** Full screen immersive

**Top Section (20% height):**
```
Arena Title (H2, White, centered)
Countdown: "ENDS IN 2d 5h 32m" (Body, Hot Pink, pulsing)

Outcome Progress Bars:
- Horizontal stacked bars
- YES: Neon Green (62%)
- NO: Blood Red (38%)
- Animated fill
- Labels with percentages and amounts
```

**Moddio Game Area (50% height):**
```
iframe embed of Moddio world:
- Width: 100%
- Height: ~400px mobile, ~600px desktop
- Border: 2px Electric Purple
- Border radius: md
- Shows:
  - Avatars battling
  - Team zones (green/red)
  - Emoji rain
  - Chat bubbles
```

**Participants List (Right sidebar desktop, bottom drawer mobile):**
```
Scrollable list:
- Header: "⚔️ WARRIORS (247)" (Body, Bold)
- Each participant:
  - Avatar (32px)
  - Wallet: "4xW8...nQ7p" (truncated)
  - Amount: "5 SOL" (SOL Blue)
  - Outcome badge: "YES" chip (Neon Green)
  - Ranking emoji: 🏆 (top 3), 🔥 (big bets)

Sort options: Top bets | Recent | Winning side
```

**Action Bar (Bottom):**
```
If not joined:
- Outcome buttons (equal width):
  - YES button: Neon Green bg, "JOIN YES • 0.05 SOL"
  - NO button: Blood Red bg, "JOIN NO • 0.05 SOL"

If joined:
- Your position card:
  - "You bet 0.05 SOL on YES" (highlighted)
  - Current win multiplier: "2.3x" (Neon Green)
  - "Share to X" button

Always:
- "👁️ Spectator Bet" button (small, bottom left)
- "🔗 Share" button (small, bottom right)
```

### 5. Resolution / Winner Screen
**Layout:** Full screen celebration

**Confetti Layer:**
- canvas-confetti full screen
- Neon Green + Electric Purple confetti
- Particle explosions

**Winner Announcement (Center):**
```
"🎉 YES WON! 🎉" (Display, Neon Green, animated scale)

User Result Card:
- Background: Dark Gray with Neon Green border
- Glow: Green shadow
- Content:
  - "You bet: 1 SOL on YES"
  - "You won: 2.8 SOL" (H2, Neon Green)
  - Arrow animation: ↑
  - Profit: "+1.8 SOL (+180%)" (Body Large)

Trophy NFT:
- Image: Compressed NFT artwork (pixel art sword)
- Label: "Trophy #420 minted!"
- "View in Wallet" link
- Shimmer/glow animation
```

**Stats Breakdown:**
```
Total pot: 1,337 SOL
Winners: 165 players
Creator fee: 67 SOL → @degenlord
Outcome: YES (62% correct)
```

**Action Buttons:**
```
Primary: "Share Win to X ⚔️" (Electric Purple, full width)
- Auto-filled tweet: "Just won 2.8 SOL on BetFun Arena! ⚔️ [link]"

Secondary: "Play Again" (Neon Green outline, full width)
- Returns to home feed
```

### 6. Leaderboard
**Layout:** Podium + list

**Podium (Top):**
```
Top 3 displayed as podium:
- #1 (center, tallest): 🥇 Gold glow
- #2 (left): 🥈 Silver glow
- #3 (right): 🥉 Bronze glow

Each shows:
- Avatar (64px)
- Username/wallet
- Total won: "158,420 SOL" (H3)
- Win rate: "76%" (Body)
```

**List (Scrollable):**
```
Filters (Tabs):
- All Time | This Week | Today

Table:
| Rank | Player | Won | Win Rate | Level |
|------|--------|-----|----------|-------|
| 4    | 2xF8.. | 42K | 68%      | 🔥🔥🔥 |
| ...  | ...    | ... | ...      | ...   |

Current user row:
- Highlighted with Electric Purple border
- Pinned to bottom of viewport
- "YOU" badge
```

### 7. Profile
**Layout:** Top stats + sections

**Header:**
```
Avatar (large, 120px, center)
Wallet: "4xW8...nQ7p" (copy button)
Balance: "12.5 SOL" (SOL Blue)
```

**Stats Grid:**
```
4 cards (2x2 grid):
- Total Wagered: "45 SOL"
- Total Won: "62 SOL" (Neon Green)
- Win Rate: "68%" (circular progress)
- Arenas: "23 joined, 5 created"
```

**Trophy Gallery:**
```
Section: "🏆 Trophies (12)"
Grid: 3 columns
Each trophy: NFT image + rarity badge
Empty state: "No trophies yet"
```

**Created Arenas:**
```
Section: "⚔️ Your Arenas (5)"
List: Mini arena cards
Shows: Title, participants, pot, earnings
```

**Achievements:**
```
Section: "🎯 Achievements"
Grid: Achievement badges
- First Win ✅
- 10 Arenas ✅
- Whale (100 SOL) 🔒
- Creator ✅
```

## Responsive Breakpoints
```
Mobile: < 768px (single column, bottom tabs, full-width cards)
Tablet: 768px - 1024px (2 columns, adjusted spacing)
Desktop: > 1024px (3 columns, sidebars, hover effects)
```

## Animation Specs
```
Card Enter: Fade in + slide up 20px, 300ms ease-out
Button Hover: Scale 1.05, 150ms ease
Progress Bar: Fill animation, 500ms ease-in-out
Confetti: Burst from center, 2s duration
Trophy Mint: Scale 0 → 1.2 → 1, rotate 360°, 800ms
Loading Spinner: Rotate 360° infinite, 1s linear
```

## Accessibility
- All buttons: min 44x44px touch target
- Color contrast: WCAG AA minimum
- Focus indicators: 2px Electric Purple outline
- Screen reader labels on all interactive elements
- Dark mode optimized (default)

