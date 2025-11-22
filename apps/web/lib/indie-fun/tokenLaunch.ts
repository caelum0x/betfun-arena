import { INDIE_FUN_API_URL, INDIE_FUN_API_KEY } from "../constants";
import { retryIndieFun } from "./retry";
import { getCached, setCached } from "./cache";

interface TokenLaunchParams {
  name: string;
  symbol: string;
  description: string;
  supply: number;
  decimals?: number;
  arenaId?: string;
  creatorWallet: string;
}

interface TokenLaunchResponse {
  success: boolean;
  tokenMint: string;
  bondingCurveAddress: string;
  transactionSignature: string;
}

interface BondingCurveData {
  currentPrice: number;
  marketCap: number;
  totalSupply: number;
  circulatingSupply: number;
}

/**
 * Launch a new token on Indie.fun bonding curve
 */
export async function launchToken(
  params: TokenLaunchParams
): Promise<TokenLaunchResponse> {
  if (!INDIE_FUN_API_KEY) {
    throw new Error("Indie.fun API key not configured");
  }

  // Validate required fields
  if (!params.name || !params.symbol || !params.creatorWallet) {
    throw new Error("Missing required fields: name, symbol, creatorWallet");
  }

  return retryIndieFun(async () => {
    // OFFICIAL Indie.fun API from SPONSOR_APIS.md
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(`${INDIE_FUN_API_URL}/tokens/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${INDIE_FUN_API_KEY}`,
        },
        body: JSON.stringify({
          name: params.name,
          symbol: params.symbol,
          description: params.description || "Tokenized prediction arena on BetFun",
          image_uri: params.arenaId
            ? `https://betfun.arena/arena/${params.arenaId}/image.png`
            : undefined,
          creator_fee_bps: 500, // 5% perpetual fee
          initial_buy: "0.5", // SOL to seed liquidity
          bonding_curve: "linear",
          metadata: {
            arena_id: params.arenaId,
            creator: params.creatorWallet,
            platform: "BetFun Arena",
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Indie.fun API error (${response.status}): ${errorText || response.statusText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Indie.fun API request timeout");
      }
      throw error;
    }
  });
}

/**
 * Get bonding curve data for a token
 */
export async function getBondingCurveData(
  tokenMint: string
): Promise<BondingCurveData> {
  if (!INDIE_FUN_API_KEY) {
    throw new Error("Indie.fun API key not configured");
  }

  // Check cache first
  const cacheKey = `bonding-curve-${tokenMint}`;
  const cached = getCached<BondingCurveData>(cacheKey);
  if (cached) {
    return cached;
  }

  return retryIndieFun(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(
        `${INDIE_FUN_API_URL}/tokens/${tokenMint}/bonding-curve`,
        {
          headers: {
            Authorization: `Bearer ${INDIE_FUN_API_KEY}`,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Indie.fun API error (${response.status}): ${response.statusText}`
        );
      }

      const data = await response.json();
      
      // Cache the result
      setCached(cacheKey, data, 5 * 60 * 1000); // 5 minutes

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Indie.fun API request timeout");
      }
      throw error;
    }
  });
}

/**
 * Buy tokens from bonding curve
 */
export async function buyTokens(
  tokenMint: string,
  amountSOL: number,
  buyerWallet: string
): Promise<string> {
  try {
    const response = await fetch(`${INDIE_FUN_API_URL}/tokens/${tokenMint}/buy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INDIE_FUN_API_KEY}`,
      },
      body: JSON.stringify({
        amount: amountSOL,
        buyer: buyerWallet,
      }),
    });

    if (!response.ok) {
      throw new Error(`Indie.fun API error: ${response.statusText}`);
    }

    const { signature } = await response.json();
    return signature;
  } catch (error) {
    console.error("Error buying tokens:", error);
    throw error;
  }
}

/**
 * Calculate token output for given SOL input
 */
export function calculateTokenOutput(
  solInput: number,
  currentPrice: number,
  k: number = 1000000
): number {
  // Simplified bonding curve: price = k * supply
  // Actual implementation depends on Indie.fun's curve formula
  const tokensOut = solInput / currentPrice;
  return tokensOut;
}

/**
 * Format bonding curve chart data
 */
export function formatBondingCurveChart(data: BondingCurveData) {
  const points = [];
  const step = data.totalSupply / 100;

  for (let supply = 0; supply <= data.totalSupply; supply += step) {
    const price = (supply / data.totalSupply) * data.currentPrice;
    points.push({
      supply,
      price,
    });
  }

  return points;
}

