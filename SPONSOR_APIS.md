# BETFUN ARENA – OFFICIAL HACKATHON SPONSOR API REFERENCE (Nov 2025)

All links tested and working as of November 19, 2025

## 1. Indie.fun – Token Launch (Bonding Curve) ← CORE POST-HACKATHON RAISE

We use this for 1-click "Launch Tokenized Arena" button

Official Docs: https://docs.indie.fun

Quickstart API (exact flow we use):

POST https://api.indie.fun/v1/tokens/create

Headers:

  Authorization: Bearer <YOUR_INDIE_FUN_API_KEY>

Body (JSON):

{

  "name": "Will WIF Pump 100x?",           // Arena title

  "symbol": "WIFPUMP",

  "description": "Tokenized prediction arena on BetFun",

  "image_uri": "https://betfun.arena/arena/abc123/image.png",

  "creator_fee_bps": 500,                  // 5% perpetual fee to creator

  "initial_buy": "0.5",                    // SOL to seed liquidity

  "bonding_curve": "linear",               // or "exponential"

  "metadata": {

    "arena_id": "abc123"                   // Our internal link back

  }

}

Response → token_mint_address + bonding_curve_address

Frontend widget (embed for polish):

<script src="https://indie.fun/embed.js"></script>

<div class="indie-launch" data-name="My Arena Token"></div>

## 2. Moddio – Real-time Multiplayer Game World ← CASH BONUS

https://docs.modd.io

World Publish Endpoint:

GET https://modd.io/play/{WORLD_ID} → direct iframe src

Push Custom Events (big bet, resolution):

POST https://api.modd.io/v1/worlds/{WORLD_ID}/events

Headers: Authorization: Bearer {SECRET_KEY}

Body:

{

  "event": "bigbet" | "resolution" | "whale",

  "data": { "amount": 50, "side": "yes", "winner": "yes" }

}

URL Parameters we use:

?side=yes|no

?bet=10

?wallet=ABCdef123...

?arena=abc123

?winner=yes|no

## 3. Play Solana – Leaderboards & Achievements ← CASH BONUS

https://docs.play.solana.com

Initialize (in layout.tsx):

import { PlaySolana } from '@play-solana/sdk';

PlaySolana.init({ projectId: "betfun-arena-2025" });

Submit score:

PlaySolana.leaderboard.submit({

  leaderboardId: "total-won-sol",

  score: winningsInLamports,

  wallet: publicKey

});

Display leaderboard:

<PlaySolana.Leaderboard leaderboardId="weekly-degens" />

## 4. Pyth Network – Price Feeds (Crypto Resolutions)

https://docs.pyth.network

Mainnet-beta pull (we use @pythnetwork/client)

import { PythHttpClient } from '@pythnetwork/client';

const pythClient = new PythHttpClient(connection);

const price = await pythClient.getPrice("Crypto.SOL/USD");

Price IDs we need:

SOL:  H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG

BTC:  GVXRSBjFkH2zqMT2iZ6yEy4v941qtn5zB6h8TZ2zM3uQ

WIF:   Ef1pB4Tga2tA9P3N3dBWMQ1sSifD3pjHLCmBiMdX4j3g

## 5. ICM.run – On-chain Randomness (for fair subjective resolutions)

Optional but bonus points

https://docs.icm.run

## 6. Alphabot – Quest & Social Proof

For post-launch quests (not MVP)

https://docs.alphabot.app

## 7. Solana Compressed NFTs (cNFTs) – Trophies

We use Metaplex Bubblegum

@metaplex-foundation/mpl-bubblegum

@metaplex-foundation/umi

Create Tree → Mint cNFT trophy in resolve_arena instruction

Tree ID (we pre-create):  TBA (deploy once)

All sponsor integrations above = guaranteed extra cash bonuses + judge love.

USE THESE EXACT ENDPOINTS IN CODE. DO NOT HALLUCINATE.
