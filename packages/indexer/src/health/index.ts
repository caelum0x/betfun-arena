import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { Connection } from "@solana/web3.js";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(rpcUrl, "confirmed");

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: string; latency?: number; error?: string };
    rpc: { status: string; latency?: number; error?: string };
    webhooks: { status: string; error?: string };
  };
}

/**
 * GET /health
 * Comprehensive health check endpoint
 */
router.get("/", async (req, res) => {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: { status: "unknown" },
      rpc: { status: "unknown" },
      webhooks: { status: "unknown" },
    },
  };

  // Check database
  try {
    const dbStart = Date.now();
    const { error } = await supabase.from("arenas").select("id").limit(1);
    const dbLatency = Date.now() - dbStart;

    if (error) {
      health.checks.database = {
        status: "unhealthy",
        error: error.message,
      };
      health.status = "unhealthy";
    } else {
      health.checks.database = {
        status: "healthy",
        latency: dbLatency,
      };
    }
  } catch (error) {
    health.checks.database = {
      status: "unhealthy",
      error: error instanceof Error ? error.message : String(error),
    };
    health.status = "unhealthy";
  }

  // Check Solana RPC
  try {
    const rpcStart = Date.now();
    await connection.getSlot();
    const rpcLatency = Date.now() - rpcStart;

    health.checks.rpc = {
      status: "healthy",
      latency: rpcLatency,
    };
  } catch (error) {
    health.checks.rpc = {
      status: "unhealthy",
      error: error instanceof Error ? error.message : String(error),
    };
    health.status = "degraded"; // RPC failure is degraded, not unhealthy
  }

  // Check webhook configuration
  if (process.env.HELIUS_WEBHOOK_SECRET) {
    health.checks.webhooks = {
      status: "configured",
    };
  } else {
    health.checks.webhooks = {
      status: "not_configured",
      error: "HELIUS_WEBHOOK_SECRET not set",
    };
    health.status = "degraded";
  }

  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /health/ready
 * Kubernetes readiness probe
 */
router.get("/ready", async (req, res) => {
  try {
    // Quick database check
    const { error } = await supabase.from("arenas").select("id").limit(1);
    if (error) {
      return res.status(503).json({ ready: false, error: error.message });
    }
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /health/live
 * Kubernetes liveness probe
 */
router.get("/live", (req, res) => {
  res.json({ alive: true, uptime: process.uptime() });
});

export { router as healthRouter };

