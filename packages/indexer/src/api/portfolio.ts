import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

/**
 * GET /api/portfolio/:wallet
 * Get user's complete portfolio
 */
router.get("/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;

    // Get all user positions
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

    // Get trading history
    const { data: trades } = await supabase
      .from("trades")
      .select("*")
      .eq("user", wallet)
      .order("timestamp", { ascending: false })
      .limit(100);

    // Get arena participations
    const { data: participations } = await supabase
      .from("participants")
      .select("*, arenas(*)")
      .eq("wallet", wallet);

    // Calculate totals
    const totalShareValue = (sharePositions || []).reduce((sum, pos) => {
      return sum + (parseFloat(pos.balance || "0") * parseFloat(pos.avg_cost_basis || "0")) / 1e18;
    }, 0);

    const totalLiquidityValue = (liquidityPositions || []).reduce((sum, pos) => {
      return sum + parseFloat(pos.sol_deposited || "0") / 1e9;
    }, 0);

    const totalPnl = (trades || []).reduce((sum, trade) => {
      return sum + parseFloat(trade.pnl || "0") / 1e9;
    }, 0);

    res.json({
      wallet,
      sharePositions: sharePositions || [],
      liquidityPositions: liquidityPositions || [],
      openOrders: openOrders || [],
      trades: trades || [],
      participations: participations || [],
      totals: {
        shareValue: totalShareValue,
        liquidityValue: totalLiquidityValue,
        totalPnl,
        totalValue: totalShareValue + totalLiquidityValue,
      },
    });
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

/**
 * GET /api/portfolio/:wallet/stats
 * Get user's trading statistics
 */
router.get("/:wallet/stats", async (req, res) => {
  try {
    const { wallet } = req.params;

    // Get trade statistics
    const { data: trades } = await supabase
      .from("trades")
      .select("*")
      .eq("user", wallet);

    const totalTrades = trades?.length || 0;
    const totalVolume = trades?.reduce((sum, t) => sum + parseFloat(t.sol_amount || "0"), 0) || 0;
    const totalPnl = trades?.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0) || 0;
    const winRate = trades?.filter((t) => parseFloat(t.pnl || "0") > 0).length / totalTrades || 0;

    // Get participation stats
    const { data: participations } = await supabase
      .from("participants")
      .select("*")
      .eq("wallet", wallet);

    const totalArenas = participations?.length || 0;
    const wonArenas = participations?.filter((p) => p.claimed).length || 0;

    res.json({
      wallet,
      trading: {
        totalTrades,
        totalVolume: totalVolume / 1e9,
        totalPnl: totalPnl / 1e9,
        winRate: winRate * 100,
      },
      arenas: {
        totalArenas,
        wonArenas,
        winRate: totalArenas > 0 ? (wonArenas / totalArenas) * 100 : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching portfolio stats:", error);
    res.status(500).json({ error: "Failed to fetch portfolio stats" });
  }
});

export { router as portfolioRouter };

