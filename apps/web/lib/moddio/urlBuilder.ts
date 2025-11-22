import { MODDIO_BASE_URL } from "../constants";

interface ModdioUrlParams {
  worldId?: string; // Optional, will use env var if not provided
  arenaId: string;
  wallet?: string;
  outcome?: number;
}

/**
 * Build Moddio game URL with query parameters
 * OFFICIAL format from SPONSOR_APIS.md
 */
export function buildModdioUrl({
  worldId,
  arenaId,
  wallet,
  outcome,
}: ModdioUrlParams): string {
  // Use provided worldId or fallback to environment variable
  const finalWorldId = worldId || process.env.NEXT_PUBLIC_MODDIO_WORLD_ID || 'demo-world';
  
  const params = new URLSearchParams();
  
  // Official Moddio params from SPONSOR_APIS.md
  params.set("arena", arenaId);
  
  if (wallet) {
    params.set("wallet", wallet);
  }
  
  if (outcome !== undefined) {
    params.set("side", outcome === 0 ? "yes" : "no"); // Map to yes/no
  }
  
  // Format: https://modd.io/play/{WORLD_ID}?params
  return `${MODDIO_BASE_URL}/${finalWorldId}?${params.toString()}`;
}

/**
 * Get Moddio World ID from environment
 */
export function getModdioWorldId(): string {
  const worldId = process.env.NEXT_PUBLIC_MODDIO_WORLD_ID;
  
  if (!worldId || worldId === 'demo-world') {
    console.warn('Moddio World ID not configured. Create a world at https://www.moddio.com');
  }
  
  return worldId || 'demo-world';
}

