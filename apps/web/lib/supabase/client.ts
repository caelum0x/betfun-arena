import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../constants";

/**
 * Supabase client for BetFun Arena
 * Returns null if Supabase is not configured
 */
export const supabase: SupabaseClient | null = 
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

/**
 * Database types (generated from schema)
 */
export interface Arena {
  id: number;
  arena_account: string;
  title: string;
  description: string;
  question: string;
  outcomes: string[];
  entry_fee: number;
  pot: number;
  participants_count: number;
  resolved: boolean;
  winner_outcome: number | null;
  end_time: string;
  created_at: string;
  creator_wallet: string;
  token_mint: string | null;
  tags: string[];
}

export interface Participant {
  id: number;
  arena_id: number;
  wallet: string;
  outcome_chosen: number;
  amount: number;
  tx_signature: string;
  joined_at: string;
  claimed: boolean;
}

export interface LeaderboardEntry {
  wallet: string;
  total_wagered: number;
  total_won: number;
  arenas_created: number;
  arenas_joined: number;
  win_rate: number;
  level: number;
  updated_at: string;
}

export interface Trophy {
  id: number;
  wallet: string;
  arena_id: number;
  nft_mint: string;
  rarity: string;
  minted_at: string;
}

