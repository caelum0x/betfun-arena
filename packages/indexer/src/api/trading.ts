import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

/**
 * GET /api/trading/trades/:arenaAccount
 * Get trading history for an arena
 */
router.get("/trades/:arenaAccount", async (req, res) => {
  try {
    const { arenaAccount } = req.params;
    const { outcomeIndex, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from("trades")
      .select("*")
      .eq("market_id", arenaAccount)
      .order("timestamp", { ascending: false });

    if (outcomeIndex !== undefined) {
      query = query.eq("outcome_index", parseInt(outcomeIndex as string));
    }

    const limitNum = Math.min(parseInt(limit as string), 500);
    const offsetNum = parseInt(offset as string);
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error } = await query;

    if (error) throw error;

    res.json({ trades: data || [] });
  } catch (error) {
    console.error("Error fetching trades:", error);
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

/**
 * GET /api/trading/outcome-shares/:arenaAccount/:outcomeIndex
 * Get outcome share data
 */
router.get("/outcome-shares/:arenaAccount/:outcomeIndex", async (req, res) => {
  try {
    const { arenaAccount, outcomeIndex } = req.params;

    const { data, error } = await supabase
      .from("outcome_shares")
      .select("*")
      .eq("arena", arenaAccount)
      .eq("outcome_index", parseInt(outcomeIndex))
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Outcome share not found" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching outcome share:", error);
    res.status(500).json({ error: "Failed to fetch outcome share" });
  }
});

/**
 * GET /api/trading/pools/:arenaAccount/:outcomeIndex
 * Get AMM pool data
 */
router.get("/pools/:arenaAccount/:outcomeIndex", async (req, res) => {
  try {
    const { arenaAccount, outcomeIndex } = req.params;

    const { data, error } = await supabase
      .from("amm_pools")
      .select("*")
      .eq("arena", arenaAccount)
      .eq("outcome_index", parseInt(outcomeIndex))
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Pool not found" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching pool:", error);
    res.status(500).json({ error: "Failed to fetch pool" });
  }
});

/**
 * GET /api/trading/orderbook/:arenaAccount/:outcomeIndex
 * Get order book data
 */
router.get("/orderbook/:arenaAccount/:outcomeIndex", async (req, res) => {
  try {
    const { arenaAccount, outcomeIndex } = req.params;

    // Get all open orders
    const { data: orders, error } = await supabase
      .from("limit_orders")
      .select("*")
      .eq("market_id", arenaAccount)
      .eq("outcome_index", parseInt(outcomeIndex))
      .in("status", ["open", "partial"])
      .order("price", { ascending: false });

    if (error) throw error;

    // Separate buy and sell orders
    const buyOrders = (orders || []).filter((o: any) => o.side === "buy");
    const sellOrders = (orders || []).filter((o: any) => o.side === "sell");

    // Sort buy orders (highest first) and sell orders (lowest first)
    buyOrders.sort((a: any, b: any) => parseFloat(b.price) - parseFloat(a.price));
    sellOrders.sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price));

    res.json({
      buyOrders: buyOrders.slice(0, 20),
      sellOrders: sellOrders.slice(0, 20),
    });
  } catch (error) {
    console.error("Error fetching order book:", error);
    res.status(500).json({ error: "Failed to fetch order book" });
  }
});

/**
 * GET /api/trading/user-positions/:wallet
 * Get user's trading positions
 */
router.get("/user-positions/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;

    // Get share positions
    const { data: sharePositions } = await supabase
      .from("user_positions")
      .select("*")
      .eq("owner", wallet);

    // Get liquidity positions
    const { data: liquidityPositions } = await supabase
      .from("liquidity_positions")
      .select("*")
      .eq("provider", wallet);

    // Get open orders
    const { data: openOrders } = await supabase
      .from("limit_orders")
      .select("*")
      .eq("user", wallet)
      .in("status", ["open", "partial"]);

    res.json({
      sharePositions: sharePositions || [],
      liquidityPositions: liquidityPositions || [],
      openOrders: openOrders || [],
    });
  } catch (error) {
    console.error("Error fetching user positions:", error);
    res.status(500).json({ error: "Failed to fetch user positions" });
  }
});

/**
 * GET /api/trading/swaps/:pool
 * Get swap history for a pool
 */
router.get("/swaps/:pool", async (req, res) => {
  try {
    const { pool } = req.params;
    const { limit = 100 } = req.query;

    const { data, error } = await supabase
      .from("swaps")
      .select("*")
      .eq("pool", pool)
      .order("timestamp", { ascending: false })
      .limit(Math.min(parseInt(limit as string), 500));

    if (error) throw error;

    res.json({ swaps: data || [] });
  } catch (error) {
    console.error("Error fetching swaps:", error);
    res.status(500).json({ error: "Failed to fetch swaps" });
  }
});

export { router as tradingRouter };

