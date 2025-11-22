import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

/**
 * GET /api/pot/:arenaAccount
 * Get real-time pot size for an arena
 */
router.get("/:arenaAccount", async (req, res) => {
  try {
    const { arenaAccount } = req.params;

    const { data: arena, error } = await supabase
      .from("arenas")
      .select("pot, participants_count, outcome_pots")
      .eq("arena_account", arenaAccount)
      .single();

    if (error) throw error;

    if (!arena) {
      return res.status(404).json({ error: "Arena not found" });
    }

    res.json({
      pot: arena.pot,
      participantsCount: arena.participants_count,
      outcomePots: arena.outcome_pots,
    });
  } catch (error) {
    console.error("Error fetching pot:", error);
    res.status(500).json({ error: "Failed to fetch pot" });
  }
});

export { router as potRouter };

