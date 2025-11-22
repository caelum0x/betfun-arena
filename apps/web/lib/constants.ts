import { PublicKey } from "@solana/web3.js";

/**
 * BetFun Arena - Application Constants
 */

// Program IDs
// Use environment variable or fallback to a valid default public key
export const BETFUN_PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID
  ? new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID)
  : PublicKey.default; // Fallback to default public key if not configured

// RPC Endpoints
export const RPC_ENDPOINTS = {
  devnet: process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com",
  mainnet: process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com",
};

// Current network
export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK || "devnet") as "devnet" | "mainnet";

// Indexer API
export const INDEXER_API_URL = process.env.NEXT_PUBLIC_INDEXER_API_URL || "http://localhost:3001";

// Supabase
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Indie.fun API (OFFICIAL from SPONSOR_APIS.md)
export const INDIE_FUN_API_URL = process.env.NEXT_PUBLIC_INDIE_FUN_API_URL || "https://api.indie.fun/v1";
export const INDIE_FUN_API_KEY = process.env.NEXT_PUBLIC_INDIE_FUN_API_KEY || "";

// Moddio (OFFICIAL from SPONSOR_APIS.md)
export const MODDIO_WORLD_ID = process.env.NEXT_PUBLIC_MODDIO_WORLD_ID || "";
export const MODDIO_SECRET_KEY = process.env.NEXT_PUBLIC_MODDIO_SECRET_KEY || "";
export const MODDIO_BASE_URL = "https://modd.io/play"; // CORRECTED
export const MODDIO_API_URL = "https://api.modd.io/v1";

// Play Solana (OFFICIAL from SPONSOR_APIS.md)
export const PLAY_SOLANA_PROJECT_ID = "betfun-arena-2025";
export const PLAY_SOLANA_API_KEY = process.env.NEXT_PUBLIC_PLAY_SOLANA_API_KEY || "";
export const PLAY_SOLANA_API_URL = "https://api.play.solana.com";

// Pyth Network (OFFICIAL PRICE IDs from SPONSOR_APIS.md)
export const PYTH_PRICE_SERVICE_URL = "https://hermes.pyth.network";
export const PYTH_PRICE_FEEDS = {
  SOL_USD: "H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG",
  BTC_USD: "GVXRSBjFkH2zqMT2iZ6yEy4v941qtn5zB6h8TZ2zM3uQ",
  WIF_USD: "Ef1pB4Tga2tA9P3N3dBWMQ1sSifD3pjHLCmBiMdX4j3g",
} as const;

// Social
export const TWITTER_HANDLE = "@BetFunArena";
export const TWITTER_SHARE_URL = "https://twitter.com/intent/tweet";

// App URLs
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Fee structure
export const DEFAULT_CREATOR_FEE_BPS = 500; // 5%

// Arena limits
export const ARENA_LIMITS = {
  MIN_ENTRY_FEE: 0.01, // SOL
  MAX_ENTRY_FEE: 10, // SOL
  MIN_OUTCOMES: 2,
  MAX_OUTCOMES: 6,
  MAX_TITLE_LENGTH: 80,
  MAX_DESCRIPTION_LENGTH: 280,
  MAX_TAGS: 5,
} as const;

// Pagination
export const ITEMS_PER_PAGE = 20;
export const LEADERBOARD_PAGE_SIZE = 100;

// Trophy rarities
export enum TrophyRarity {
  COMMON = "Common",
  RARE = "Rare",
  EPIC = "Epic",
  LEGENDARY = "Legendary",
}

// Achievement definitions
export const ACHIEVEMENTS = [
  {
    id: "first_win",
    name: "First Blood",
    description: "Win your first arena",
    icon: "🎯",
  },
  {
    id: "10_arenas",
    name: "Veteran",
    description: "Participate in 10 arenas",
    icon: "⚔️",
  },
  {
    id: "whale",
    name: "Whale",
    description: "Place a bet over 100 SOL",
    icon: "🐋",
  },
  {
    id: "creator",
    name: "Arena Master",
    description: "Create your first arena",
    icon: "👑",
  },
  {
    id: "win_streak",
    name: "Hot Streak",
    description: "Win 5 arenas in a row",
    icon: "🔥",
  },
] as const;

// Local storage keys
export const STORAGE_KEYS = {
  THEME: "betfun_theme",
  ONBOARDING_COMPLETE: "betfun_onboarding",
  SOUND_ENABLED: "betfun_sound",
} as const;

