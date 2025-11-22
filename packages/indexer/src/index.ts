import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import Redis from "ioredis";
import axios from "axios";
import { parseEvents } from "./events/parser";
import idl from "../../anchor/target/idl/betfun.json";
import { getPool, query, queryOne, execute, testConnection } from "./database/client";

// PROGRAM_ID - use env var or the deployed program ID
const PROGRAM_ID_STRING = process.env.PROGRAM_ID || "HrS1KpYRWfg9xUom8jnGqoRAayVCxHxukeb18C4WKAkE";
let PROGRAM_ID: PublicKey;
try {
  PROGRAM_ID = new PublicKey(PROGRAM_ID_STRING);
} catch (error) {
  console.error("❌ Invalid PROGRAM_ID:", PROGRAM_ID_STRING, error);
  throw new Error(`Invalid PROGRAM_ID: ${PROGRAM_ID_STRING}`);
}

const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "";

// Initialize clients
const connection = new Connection(RPC_URL, "confirmed");

// Initialize Anchor program (if IDL is available)
// Note: We only need the program for event parsing, not account fetching
let program: Program | null = null;
try {
  if (!idl) {
    throw new Error("IDL file not found");
  }
  
  if (!idl.address) {
    throw new Error("IDL missing address field");
  }
  
  // Verify IDL address matches PROGRAM_ID
  if (idl.address !== PROGRAM_ID.toBase58()) {
    console.warn(`⚠️  IDL address (${idl.address}) does not match PROGRAM_ID (${PROGRAM_ID.toBase58()})`);
    console.warn(`   Using PROGRAM_ID: ${PROGRAM_ID.toBase58()}`);
  }
  
  // Create a minimal IDL for event parsing only
  // The accounts array in the original IDL doesn't have size definitions, which causes AccountClient to fail
  // Since we only need event parsing, we use an empty accounts array
  // We need to enrich events with their type definitions from the types array
  const eventTypesMap = new Map();
  if (idl.types) {
    idl.types.forEach((type: any) => {
      if (type.name && type.type) {
        eventTypesMap.set(type.name, type.type);
      }
    });
  }
  
  // Enrich events with their type definitions
  const enrichedEvents = (idl.events || []).map((event: any) => {
    const eventType = eventTypesMap.get(event.name);
    if (eventType) {
      return {
        ...event,
        fields: eventType.fields || [],
      };
    }
    return event;
  });
  
  const eventParsingIdl = {
    address: PROGRAM_ID.toBase58(),
    version: idl.metadata?.version || "0.1.0",
    name: idl.metadata?.name || "betfun",
    instructions: idl.instructions || [],
    accounts: [], // Empty - we don't need accounts for event parsing, and they cause initialization errors
    events: enrichedEvents,
    types: idl.types || [],
    errors: idl.errors || [],
    metadata: idl.metadata || {},
  };
  
  const provider = new AnchorProvider(connection, {} as any, { commitment: "confirmed" });
  program = new Program(eventParsingIdl as any, PROGRAM_ID, provider);
  
  // Verify event coder is available
  if (program.coder && program.coder.events) {
    console.log("✅ Anchor program initialized successfully (event parsing mode)");
  } else {
    // Try to initialize without strict checking - event coder might still work
    console.warn("⚠️  Event coder check failed, but program initialized. Event parsing may be limited.");
  }
} catch (error) {
  console.error("❌ Could not initialize Anchor program:", error);
  if (error instanceof Error) {
    console.error(`   Error message: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack trace: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
  }
  console.warn("⚠️  Will use fallback parsing (limited functionality)");
  program = null;
}

// Initialize PostgreSQL database connection
let dbConnected = false;

// Initialize Redis (optional)
let redis: Redis | null = null;
try {
  redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  redis.on("error", () => {
    console.warn("⚠️  Redis connection error. Caching disabled.");
    redis = null;
  });
} catch (error) {
  console.warn("⚠️  Redis not available. Caching disabled.");
}

// Track last processed slot
let lastProcessedSlot = 0;

// ============================================
// EVENT PARSERS
// ============================================

interface ArenaCreatedEvent {
  arena: PublicKey;
  creator: PublicKey;
  title: string;
  entryFee: BN;
  endTime: BN;
  timestamp: BN;
}

interface SharesBoughtEvent {
  arena: PublicKey;
  buyer: PublicKey;
  outcomeIndex: number;
  sharesMinted: BN;
  solSpent: BN;
  currentPrice: BN;
}

interface SharesSoldEvent {
  arena: PublicKey;
  seller: PublicKey;
  outcomeIndex: number;
  sharesBurned: BN;
  solReceived: BN;
  currentPrice: BN;
  realizedPnl: BN;
}

interface LimitOrderPlacedEvent {
  arena: PublicKey;
  user: PublicKey;
  orderId: BN;
  outcomeIndex: number;
  orderType: number;
  price: BN;
  amount: BN;
}

interface OrderMatchedEvent {
  arena: PublicKey;
  makerOrderId: BN;
  takerOrderId: BN;
  outcomeIndex: number;
  fillPrice: BN;
  fillAmount: BN;
}

interface ArenaResolvedEvent {
  arena: PublicKey;
  winnerOutcome: number;
  totalPot: BN;
  timestamp: BN;
}

// ============================================
// INDEXER FUNCTIONS
// ============================================

async function indexArenaCreated(event: ArenaCreatedEvent) {
  if (!dbConnected) return;
  
  try {
    await query(
      `INSERT INTO markets (
        id, creator, title, entry_fee, end_time, created_at, 
        resolved, volume, volume_24h, participant_count, featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING`,
      [
        event.arena.toBase58(),
        event.creator.toBase58(),
        event.title,
        event.entryFee.toString(),
        event.endTime.toNumber() * 1000,
        event.timestamp.toNumber() * 1000,
        false,
        "0",
        "0",
        0,
        false,
      ]
    );

    // Publish to Redis
    if (redis) {
    await redis.publish(
      "market:update",
      JSON.stringify({
        marketId: event.arena.toBase58(),
          update: { type: "created", arena: event.arena.toBase58() },
      })
    );
    }

    console.log(`✅ Indexed arena created: ${event.arena.toBase58()}`);
  } catch (error) {
    console.error("Error indexing arena created:", error);
  }
}

async function indexSharesBought(event: SharesBoughtEvent) {
  if (!dbConnected) return;
  
  try {
    // Insert trade record
    await query(
      `INSERT INTO trades (
        market_id, user, outcome_index, type, amount, price, sol_amount, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        event.arena.toBase58(),
        event.buyer.toBase58(),
        event.outcomeIndex,
        "buy",
        event.sharesMinted.toString(),
        event.currentPrice.toString(),
        event.solSpent.toString(),
        Date.now(),
      ]
    );

    // Update market volume
    await query(
      `UPDATE markets 
       SET volume = volume + $1, volume_24h = volume_24h + $1
       WHERE id = $2`,
      [event.solSpent.toString(), event.arena.toBase58()]
    );

    // Update outcome share stats
    await query(
      `UPDATE outcome_shares 
       SET total_supply = total_supply + $1, 
           price = $2, 
           volume_24h = volume_24h + $3
       WHERE arena = $4 AND outcome_index = $5`,
      [
        event.sharesMinted.toString(),
        event.currentPrice.toString(),
        event.solSpent.toString(),
        event.arena.toBase58(),
        event.outcomeIndex,
      ]
    );

    // Update user position (upsert)
    await query(
      `INSERT INTO user_positions (owner, arena, outcome_index, shares, cost_basis)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (owner, arena, outcome_index) 
       DO UPDATE SET 
         shares = user_positions.shares + $4,
         cost_basis = user_positions.cost_basis + $5`,
      [
        event.buyer.toBase58(),
        event.arena.toBase58(),
        event.outcomeIndex,
        event.sharesMinted.toString(),
        event.solSpent.toString(),
      ]
    );

    // Publish to Redis for real-time updates
    if (redis) {
    await redis.publish(
      "trade:new",
      JSON.stringify({
        marketId: event.arena.toBase58(),
        trade: {
          user: event.buyer.toBase58(),
          outcome: event.outcomeIndex,
          type: "buy",
          amount: event.sharesMinted.toString(),
          price: event.currentPrice.toString(),
          timestamp: Date.now(),
        },
      })
    );

    await redis.publish(
      "price:update",
      JSON.stringify({
        marketId: event.arena.toBase58(),
        outcomeIndex: event.outcomeIndex,
        price: event.currentPrice.toString(),
        volume: event.solSpent.toString(),
        timestamp: Date.now(),
      })
    );
    }

    console.log(`✅ Indexed shares bought: ${event.arena.toBase58()}`);
  } catch (error) {
    console.error("Error indexing shares bought:", error);
  }
}

async function indexSharesSold(event: SharesSoldEvent) {
  if (!dbConnected) return;
  
  try {
    // Insert trade record
    await query(
      `INSERT INTO trades (
        market_id, user, outcome_index, type, amount, price, sol_amount, pnl, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        event.arena.toBase58(),
        event.seller.toBase58(),
        event.outcomeIndex,
        "sell",
        event.sharesBurned.toString(),
        event.currentPrice.toString(),
        event.solReceived.toString(),
        event.realizedPnl.toString(),
        Date.now(),
      ]
    );

    // Update market volume
    await query(
      `UPDATE markets 
       SET volume = volume + $1, volume_24h = volume_24h + $1
       WHERE id = $2`,
      [event.solReceived.toString(), event.arena.toBase58()]
    );

    // Update outcome share stats
    await query(
      `UPDATE outcome_shares 
       SET total_supply = total_supply - $1, 
           price = $2, 
           volume_24h = volume_24h + $3
       WHERE arena = $4 AND outcome_index = $5`,
      [
        event.sharesBurned.toString(),
        event.currentPrice.toString(),
        event.solReceived.toString(),
        event.arena.toBase58(),
        event.outcomeIndex,
      ]
    );

    // Update user position
    await query(
      `UPDATE user_positions 
       SET shares = shares - $1, cost_basis = cost_basis - $2
       WHERE owner = $3 AND arena = $4 AND outcome_index = $5`,
      [
        event.sharesBurned.toString(),
        event.solReceived.toString(),
        event.seller.toBase58(),
        event.arena.toBase58(),
        event.outcomeIndex,
      ]
    );

    // Update user stats
    await query(
      `INSERT INTO users (address, total_pnl, total_volume)
       VALUES ($1, $2, $3)
       ON CONFLICT (address) 
       DO UPDATE SET total_pnl = users.total_pnl + $2`,
      [
        event.seller.toBase58(),
        event.realizedPnl.toString(),
        event.solReceived.toString(),
      ]
    );

    // Publish to Redis
    if (redis) {
    await redis.publish(
      "trade:new",
      JSON.stringify({
        marketId: event.arena.toBase58(),
        trade: {
          user: event.seller.toBase58(),
          outcome: event.outcomeIndex,
          type: "sell",
          amount: event.sharesBurned.toString(),
          price: event.currentPrice.toString(),
          pnl: event.realizedPnl.toString(),
          timestamp: Date.now(),
        },
      })
    );
    }

    console.log(`✅ Indexed shares sold: ${event.arena.toBase58()}`);
  } catch (error) {
    console.error("Error indexing shares sold:", error);
  }
}

async function indexLimitOrderPlaced(event: LimitOrderPlacedEvent) {
  if (!dbConnected) return;
  
  try {
    await query(
      `INSERT INTO limit_orders (
        market_id, user, order_id, outcome_index, order_type, 
        price, amount, filled_amount, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (order_id) DO NOTHING`,
      [
        event.arena.toBase58(),
        event.user.toBase58(),
        event.orderId.toString(),
        event.outcomeIndex,
        event.orderType === 0 ? "buy" : "sell",
        event.price.toString(),
        event.amount.toString(),
        "0",
        "open",
        Date.now(),
      ]
    );

    // Publish to Redis
    if (redis) {
    await redis.publish(
      "order:update",
      JSON.stringify({
        marketId: event.arena.toBase58(),
        order: {
          orderId: event.orderId.toString(),
          user: event.user.toBase58(),
          type: event.orderType === 0 ? "buy" : "sell",
          price: event.price.toString(),
          amount: event.amount.toString(),
          status: "open",
        },
      })
    );
    }

    console.log(`✅ Indexed limit order placed: ${event.orderId.toString()}`);
  } catch (error) {
    console.error("Error indexing limit order:", error);
  }
}

async function indexOrderMatched(event: OrderMatchedEvent) {
  if (!dbConnected) return;
  
  try {
    // Update both orders
    await query(
      `UPDATE limit_orders 
       SET filled_amount = filled_amount + $1,
           status = CASE 
             WHEN filled_amount + $1 >= amount THEN 'filled' 
             ELSE 'partial' 
           END
       WHERE order_id IN ($2, $3)`,
      [
        event.fillAmount.toString(),
        event.makerOrderId.toString(),
        event.takerOrderId.toString(),
      ]
    );

    // Create trade records for both sides
    await query(
      `INSERT INTO trades (
        market_id, outcome_index, amount, price, timestamp
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        event.arena.toBase58(),
        event.outcomeIndex,
        event.fillAmount.toString(),
        event.fillPrice.toString(),
        Date.now(),
      ]
    );

    // Publish to Redis
    if (redis) {
    await redis.publish(
      "order:update",
      JSON.stringify({
        marketId: event.arena.toBase58(),
        makerOrderId: event.makerOrderId.toString(),
        takerOrderId: event.takerOrderId.toString(),
        fillAmount: event.fillAmount.toString(),
        fillPrice: event.fillPrice.toString(),
      })
    );
    }

    console.log(`✅ Indexed order matched: ${event.makerOrderId.toString()}`);
  } catch (error) {
    console.error("Error indexing order matched:", error);
  }
}

async function indexArenaResolved(event: ArenaResolvedEvent) {
  if (!dbConnected) return;
  
  try {
    await query(
      `UPDATE markets 
       SET resolved = true, 
           winner_outcome = $1, 
           total_pot = $2, 
           resolved_at = $3
       WHERE id = $4`,
      [
        event.winnerOutcome,
        event.totalPot.toString(),
        event.timestamp.toNumber() * 1000,
        event.arena.toBase58(),
      ]
    );

    // Publish to Redis
    if (redis) {
    await redis.publish(
      "market:update",
      JSON.stringify({
        marketId: event.arena.toBase58(),
        update: {
          type: "resolved",
          winnerOutcome: event.winnerOutcome,
          totalPot: event.totalPot.toString(),
        },
      })
    );
    }

    // Send notifications to all participants
    // (Would query participants and create notifications)

    console.log(`✅ Indexed arena resolved: ${event.arena.toBase58()}`);
  } catch (error) {
    console.error("Error indexing arena resolved:", error);
  }
}

// ============================================
// HELIUS WEBHOOK HANDLER
// ============================================

async function setupHeliusWebhook() {
  try {
    const webhookUrl = process.env.WEBHOOK_URL || "http://localhost:3003/webhook";

    const response = await axios.post(
      `https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`,
      {
        webhookURL: webhookUrl,
        transactionTypes: ["Any"],
        accountAddresses: [PROGRAM_ID.toBase58()],
        webhookType: "enhanced",
      }
    );

    console.log("✅ Helius webhook created:", response.data);
  } catch (error) {
    console.error("Error setting up Helius webhook:", error);
  }
}

// ============================================
// POLLING INDEXER (Fallback)
// ============================================

async function pollForTransactions() {
  try {
    const signatures = await connection.getSignaturesForAddress(
      PROGRAM_ID,
      { limit: 100 },
      "confirmed"
    );

    for (const sig of signatures) {
      if (sig.slot <= lastProcessedSlot) continue;

      const tx = await connection.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (tx && tx.meta && !tx.meta.err) {
        // Parse events using Anchor event parser
        await parseEvents(connection, sig.signature, program);
        lastProcessedSlot = sig.slot;
      }
    }
  } catch (error) {
    console.error("Error polling transactions:", error);
  }
}

// ============================================
// PERIODIC TASKS
// ============================================

// Update 24h volume every hour
setInterval(async () => {
  if (!dbConnected) return;
  
  try {
    await query(`UPDATE outcome_shares SET volume_24h = 0`);
    await query(`UPDATE markets SET volume_24h = 0`);
    console.log("✅ Reset 24h volumes");
  } catch (error) {
    console.error("Error resetting 24h volumes:", error);
  }
}, 60 * 60 * 1000);

// Update platform metrics every 5 minutes
setInterval(async () => {
  if (!dbConnected) return;
  
  try {
    const markets = await query(`SELECT volume, participant_count FROM markets`);
    const users = await query(`SELECT total_volume, total_pnl FROM users`);

    const totalVolume = markets.reduce((sum, m) => sum + Number(m.volume || 0), 0);
    const totalUsers = users.length;

    await query(
      `INSERT INTO platform_metrics (total_volume, total_users, total_markets, timestamp)
       VALUES ($1, $2, $3, $4)`,
      [totalVolume, totalUsers, markets.length, Date.now()]
    );

    console.log("✅ Updated platform metrics");
  } catch (error) {
    console.error("Error updating platform metrics:", error);
  }
}, 5 * 60 * 1000);

// ============================================
// START INDEXER
// ============================================

async function start() {
  console.log("🚀 BetFun Arena Indexer starting...");
  console.log(`📡 Program ID: ${PROGRAM_ID.toBase58()}`);
  console.log(`🔗 RPC URL: ${RPC_URL}`);
  console.log(`📋 Anchor Program: ${program ? "✅ Initialized" : "❌ Not initialized (using fallback)"}`);
  
  if (program) {
    console.log(`   - Program Name: ${program.idl.name}`);
    console.log(`   - Program Address: ${program.programId.toBase58()}`);
  }

  // Test database connection
  try {
    dbConnected = await testConnection();
    if (dbConnected) {
      console.log("✅ PostgreSQL database connected");
    } else {
      console.warn("⚠️  Database connection failed. Indexing will be limited.");
    }
  } catch (error) {
    console.warn("⚠️  Failed to initialize database:", error);
  }

  // Setup Helius webhook if API key is provided
  if (HELIUS_API_KEY) {
    await setupHeliusWebhook();
  } else {
    console.log("⚠️  HELIUS_API_KEY not set, webhooks disabled");
  }

  // Start polling (fallback method)
  setInterval(pollForTransactions, 5000);

  console.log("✅ Indexer running");
}

start().catch(console.error);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  if (redis) redis.quit();
  process.exit(0);
});

