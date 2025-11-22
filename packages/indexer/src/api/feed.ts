import { Router } from "express";
import { query, queryOne } from "../database/client";

const router = Router();

/**
 * GET /api/arenas
 * Fetch arenas with pagination and filters
 */
router.get("/", async (req, res) => {
  try {
    const {
      sort = "hotness",
      filter = "all",
      limit = 20,
      offset = 0,
      tags,
    } = req.query;

    let sql = "SELECT * FROM markets WHERE 1=1";
    const params: any[] = [];
    let paramCount = 0;

    // Apply filters
    if (filter === "live") {
      paramCount++;
      sql += ` AND resolved = false AND end_time > $${paramCount}`;
      params.push(new Date().toISOString());
    } else if (filter === "resolved") {
      sql += ` AND resolved = true`;
    } else if (filter === "ending-soon") {
      paramCount++;
      sql += ` AND resolved = false AND end_time < $${paramCount}`;
      params.push(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
    }

    // Filter by tags (if tags column exists)
    if (tags) {
      const tagArray = (tags as string).split(",");
      paramCount++;
      sql += ` AND tags @> $${paramCount}`;
      params.push(JSON.stringify(tagArray));
    }

    // Sorting
    if (sort === "new") {
      sql += ` ORDER BY created_at DESC`;
    } else if (sort === "pot") {
      sql += ` ORDER BY total_pot DESC`;
    } else if (sort === "ending-soon") {
      sql += ` ORDER BY end_time ASC`;
    }

    // Pagination
    const limitNum = Math.min(parseInt(limit as string), 100);
    const offsetNum = parseInt(offset as string);
    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(limitNum);
    paramCount++;
    sql += ` OFFSET $${paramCount}`;
    params.push(offsetNum);

    const arenas = await query(sql, params);

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM markets WHERE 1=1${filter === "live" ? " AND resolved = false AND end_time > NOW()" : filter === "resolved" ? " AND resolved = true" : ""}`
    );
    const total = parseInt(countResult?.count || "0");

    // Calculate hotness if sorting by it
    let sortedArenas = arenas;
    if (sort === "hotness") {
      sortedArenas = arenas
        .map((arena: any) => ({
          ...arena,
          hotness: calculateHotness(
            parseFloat(arena.total_pot || "0"),
            arena.participant_count || 0,
            new Date(arena.created_at)
          ),
        }))
        .sort((a: any, b: any) => b.hotness - a.hotness);
    }

    res.json({
      arenas: sortedArenas,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching arenas:", error);
    res.status(500).json({ error: "Failed to fetch arenas" });
  }
});

/**
 * GET /api/arenas/:id
 * Fetch single arena by account address
 */
router.get("/:arenaAccount", async (req, res) => {
  try {
    const { arenaAccount } = req.params;

    const arena = await queryOne(
      `SELECT * FROM markets WHERE id = $1`,
      [arenaAccount]
    );

    if (!arena) {
      return res.status(404).json({ error: "Arena not found" });
    }

    // Fetch participants
    const participants = await query(
      `SELECT * FROM participants WHERE arena_id = $1 ORDER BY stake DESC`,
      [arena.id]
    );

    res.json({
      arena,
      participants: participants || [],
    });
  } catch (error) {
    console.error("Error fetching arena:", error);
    res.status(500).json({ error: "Failed to fetch arena" });
  }
});

/**
 * GET /api/arenas/:arenaAccount/participants
 * Fetch participants for an arena
 */
router.get("/:arenaAccount/participants", async (req, res) => {
  try {
    const { arenaAccount } = req.params;

    // First get arena ID
    const arena = await queryOne(
      `SELECT id FROM markets WHERE id = $1`,
      [arenaAccount]
    );

    if (!arena) {
      return res.status(404).json({ error: "Arena not found" });
    }

    const participants = await query(
      `SELECT * FROM participants WHERE arena_id = $1 ORDER BY joined_at DESC`,
      [arena.id]
    );

    res.json({ participants: participants || [] });
  } catch (error) {
    console.error("Error fetching participants:", error);
    res.status(500).json({ error: "Failed to fetch participants" });
  }
});

// Helper function
function calculateHotness(
  pot: number,
  participantsCount: number,
  createdAt: Date
): number {
  const now = new Date();
  const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  const ageFactor = Math.max(0, 1 - ageHours / 168); // Decay over 1 week

  const volumeFactor = Math.log10((pot / 1e9) + 1); // Convert to SOL
  const participantFactor = Math.log10(participantsCount + 1);

  return (volumeFactor + participantFactor) * ageFactor;
}

export { router as feedRouter };

