import { Connection, PublicKey } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import Redis from "ioredis";
import idl from "../../../anchor/target/idl/betfun.json";
import { query, queryOne, execute } from "../database/client";

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

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || "HrS1KpYRWfg9xUom8jnGqoRAayVCxHxukeb18C4WKAkE");

/**
 * Parse Anchor events from transaction logs
 */
export async function parseEvents(
  connection: Connection,
  signature: string,
  program: Program | null
): Promise<void> {
  try {
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta || tx.meta.err) {
      return;
    }

    // Parse events from transaction logs if program is available
    if (program && program.coder) {
      try {
        const events = program.coder.events.parseLogs(tx.meta.logMessages || []);
        for (const event of events) {
          await handleEvent(event.name, event.data);
        }
      } catch (error) {
        // Fallback: parse from log messages
        await parseEventsFromLogs(tx.meta.logMessages || []);
      }
    } else {
      // Fallback: parse from log messages
      await parseEventsFromLogs(tx.meta.logMessages || []);
    }
  } catch (error) {
    console.error(`Error parsing events for ${signature}:`, error);
  }
}

/**
 * Fallback: Parse events from log messages (basic pattern matching)
 */
async function parseEventsFromLogs(logs: string[]): Promise<void> {
  for (const log of logs) {
    // Look for event signatures in logs
    // This is a simplified fallback - proper parsing should use Anchor IDL
    if (log.includes("ArenaCreated")) {
      // Would need to extract data from log format
      console.log("Detected ArenaCreated event (fallback parsing)");
    } else if (log.includes("ShareTokensCreated")) {
      console.log("Detected ShareTokensCreated event (fallback parsing)");
    } else if (log.includes("PoolInitialized")) {
      console.log("Detected PoolInitialized event (fallback parsing)");
    } else if (log.includes("LiquidityAdded")) {
      console.log("Detected LiquidityAdded event (fallback parsing)");
    } else if (log.includes("SwapExecuted")) {
      console.log("Detected SwapExecuted event (fallback parsing)");
    }
    // Note: Full event parsing requires Anchor IDL
  }
}

/**
 * Handle parsed events
 */
async function handleEvent(eventName: string, eventData: any): Promise<void> {
  try {
    switch (eventName) {
      case "ArenaCreated":
        await indexArenaCreated(eventData);
        break;
      case "ArenaJoined":
        await indexArenaJoined(eventData);
        break;
      case "ArenaResolved":
        await indexArenaResolved(eventData);
        break;
      case "WinningsClaimed":
        await indexWinningsClaimed(eventData);
        break;
      case "ShareTokensCreated":
        await indexShareTokensCreated(eventData);
        break;
      case "SharesBought":
        await indexSharesBought(eventData);
        break;
      case "SharesSold":
        await indexSharesSold(eventData);
        break;
      case "SharesRedeemed":
        await indexSharesRedeemed(eventData);
        break;
      case "PoolInitialized":
        await indexPoolInitialized(eventData);
        break;
      case "LiquidityAdded":
        await indexLiquidityAdded(eventData);
        break;
      case "LiquidityRemoved":
        await indexLiquidityRemoved(eventData);
        break;
      case "SwapExecuted":
        await indexSwapExecuted(eventData);
        break;
      case "LimitOrderPlaced":
        await indexLimitOrderPlaced(eventData);
        break;
      case "OrderCancelled":
        await indexOrderCancelled(eventData);
        break;
      case "OrderMatched":
        await indexOrderMatched(eventData);
        break;
      default:
        console.log(`Unknown event: ${eventName}`);
    }
  } catch (error) {
    console.error(`Error handling event ${eventName}:`, error);
  }
}

// ============================================
// EVENT INDEXERS
// ============================================

async function indexArenaCreated(data: any) {
  try {
    await query(
      `INSERT INTO markets (
        id, creator, title, description, question, outcomes, 
        entry_fee, end_time, created_at, resolved, volume, volume_24h, participant_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING`,
      [
        data.arena.toString(),
        data.creator.toString(),
        data.title,
        data.description || "",
        data.question,
        JSON.stringify(data.outcomes || []),
        data.entryFee.toString(),
        data.endTime.toNumber() * 1000,
        Date.now(),
        false,
        "0",
        "0",
        0,
      ]
    );

    await publishRedis("market:update", {
      marketId: data.arena.toString(),
      update: { type: "created", data },
    });

    console.log(`✅ Indexed arena created: ${data.arena.toString()}`);
  } catch (error) {
    console.error("Error indexing arena created:", error);
  }
}

async function indexArenaJoined(data: any) {
  try {
    // Update arena stats
    await query(
      `UPDATE markets 
       SET participant_count = participant_count + 1,
           volume = volume + $1
       WHERE id = $2`,
      [data.amount.toString(), data.arena.toString()]
    );

    await publishRedis("arena:update", {
      arena: data.arena.toString(),
      participant: data.participant.toString(),
      outcome: data.outcomeChosen,
      amount: data.amount.toString(),
    });

    console.log(`✅ Indexed arena joined: ${data.arena.toString()}`);
  } catch (error) {
    console.error("Error indexing arena joined:", error);
  }
}

async function indexArenaResolved(data: any) {
  try {
    await query(
      `UPDATE markets 
       SET resolved = true, 
           winner_outcome = $1, 
           total_pot = $2, 
           resolved_at = $3
       WHERE id = $4`,
      [
        data.winnerOutcome,
        data.totalPot.toString(),
        Date.now(),
        data.arena.toString(),
      ]
    );

    await publishRedis("market:update", {
      marketId: data.arena.toString(),
      update: { type: "resolved", winnerOutcome: data.winnerOutcome },
    });

    console.log(`✅ Indexed arena resolved: ${data.arena.toString()}`);
  } catch (error) {
    console.error("Error indexing arena resolved:", error);
  }
}

async function indexWinningsClaimed(data: any) {
  try {
    await query(
      `UPDATE participants 
       SET claimed = true 
       WHERE arena_id = $1 AND wallet = $2`,
      [data.arena.toString(), data.user.toString()]
    );

    console.log(`✅ Indexed winnings claimed: ${data.arena.toString()}`);
  } catch (error) {
    console.error("Error indexing winnings claimed:", error);
  }
}

async function indexShareTokensCreated(data: any) {
  try {
    await query(
      `INSERT INTO outcome_shares (
        arena, outcome_index, token_mint, initial_price, total_supply, 
        current_price, volume_24h, trade_count, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (arena, outcome_index) DO NOTHING`,
      [
        data.arena.toString(),
        data.outcomeIndex,
        data.tokenMint.toString(),
        data.initialPrice.toString(),
        "0",
        data.initialPrice.toString(),
        "0",
        0,
        Date.now(),
      ]
    );

    await publishRedis("share:created", {
      arena: data.arena.toString(),
      outcomeIndex: data.outcomeIndex,
      tokenMint: data.tokenMint.toString(),
    });

    console.log(`✅ Indexed share tokens created: ${data.arena.toString()}`);
  } catch (error) {
    console.error("Error indexing share tokens created:", error);
  }
}

async function indexSharesBought(data: any) {
  try {
    // Insert trade
    await query(
      `INSERT INTO trades (
        market_id, user, outcome_index, type, amount, price, sol_amount, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.arena.toString(),
        data.buyer.toString(),
        data.outcomeIndex,
        "buy",
        data.sharesMinted.toString(),
        data.currentPrice.toString(),
        data.solSpent.toString(),
        Date.now(),
      ]
    );

    // Update outcome share
    await query(
      `UPDATE outcome_shares 
       SET total_supply = total_supply + $1,
           current_price = $2,
           volume_24h = volume_24h + $3,
           trade_count = trade_count + 1
       WHERE arena = $4 AND outcome_index = $5`,
      [
        data.sharesMinted.toString(),
        data.currentPrice.toString(),
        data.solSpent.toString(),
        data.arena.toString(),
        data.outcomeIndex,
      ]
    );

    await publishRedis("trade:new", {
      marketId: data.arena.toString(),
      trade: {
        user: data.buyer.toString(),
        outcome: data.outcomeIndex,
        type: "buy",
        amount: data.sharesMinted.toString(),
        price: data.currentPrice.toString(),
      },
    });

    await publishRedis("price:update", {
      marketId: data.arena.toString(),
      outcomeIndex: data.outcomeIndex,
      price: data.currentPrice.toString(),
    });

    console.log(`✅ Indexed shares bought: ${data.arena.toString()}`);
  } catch (error) {
    console.error("Error indexing shares bought:", error);
  }
}

async function indexSharesSold(data: any) {
  try {
    // Insert trade
    await query(
      `INSERT INTO trades (
        market_id, user, outcome_index, type, amount, price, sol_amount, pnl, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        data.arena.toString(),
        data.seller.toString(),
        data.outcomeIndex,
        "sell",
        data.sharesBurned.toString(),
        data.currentPrice.toString(),
        data.solReceived.toString(),
        data.realizedPnl?.toString() || "0",
        Date.now(),
      ]
    );

    // Update outcome share
    await query(
      `UPDATE outcome_shares 
       SET total_supply = total_supply - $1,
           current_price = $2,
           volume_24h = volume_24h + $3,
           trade_count = trade_count + 1
       WHERE arena = $4 AND outcome_index = $5`,
      [
        data.sharesBurned.toString(),
        data.currentPrice.toString(),
        data.solReceived.toString(),
        data.arena.toString(),
        data.outcomeIndex,
      ]
    );

    await publishRedis("trade:new", {
      marketId: data.arena.toString(),
      trade: {
        user: data.seller.toString(),
        outcome: data.outcomeIndex,
        type: "sell",
        amount: data.sharesBurned.toString(),
        price: data.currentPrice.toString(),
      },
    });

    console.log(`✅ Indexed shares sold: ${data.arena.toString()}`);
  } catch (error) {
    console.error("Error indexing shares sold:", error);
  }
}

async function indexSharesRedeemed(data: any) {
  try {
    await query(
      `INSERT INTO trades (
        market_id, user, outcome_index, type, amount, price, sol_amount, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.arena.toString(),
        data.redeemer.toString(),
        data.outcomeIndex,
        "redeem",
        data.amount.toString(),
        data.redemptionValue.toString(),
        data.redemptionValue.toString(),
        Date.now(),
      ]
    );

    console.log(`✅ Indexed shares redeemed: ${data.arena.toString()}`);
  } catch (error) {
    console.error("Error indexing shares redeemed:", error);
  }
}

async function indexPoolInitialized(data: any) {
  try {
    await query(
      `INSERT INTO amm_pools (
        pool, arena, outcome_index, share_mint, lp_token_mint,
        token_reserve, sol_reserve, total_lp_tokens, fee_bps, protocol_fee_bps, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (pool) DO NOTHING`,
      [
        data.pool.toString(),
        data.arena.toString(),
        data.outcomeIndex,
        data.shareMint.toString(),
        data.lpTokenMint.toString(),
        "0",
        "0",
        "0",
        data.feeBps,
        data.protocolFeeBps,
        Date.now(),
      ]
    );

    await publishRedis("pool:update", {
      pool: data.pool.toString(),
      arena: data.arena.toString(),
      update: { type: "initialized" },
    });

    console.log(`✅ Indexed pool initialized: ${data.pool.toString()}`);
  } catch (error) {
    console.error("Error indexing pool initialized:", error);
  }
}

async function indexLiquidityAdded(data: any) {
  try {
    // Update pool
    await query(
      `UPDATE amm_pools 
       SET token_reserve = token_reserve + $1,
           sol_reserve = sol_reserve + $2,
           total_lp_tokens = total_lp_tokens + $3
       WHERE pool = $4`,
      [
        data.tokenAmount.toString(),
        data.solAmount.toString(),
        data.lpTokensMinted.toString(),
        data.pool.toString(),
      ]
    );

    // Update or create liquidity position
    await query(
      `INSERT INTO liquidity_positions (
        pool, provider, lp_tokens, tokens_deposited, sol_deposited, fees_earned, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (pool, provider) 
      DO UPDATE SET 
        lp_tokens = liquidity_positions.lp_tokens + $3,
        tokens_deposited = liquidity_positions.tokens_deposited + $4,
        sol_deposited = liquidity_positions.sol_deposited + $5,
        updated_at = $7`,
      [
        data.pool.toString(),
        data.provider.toString(),
        data.lpTokensMinted.toString(),
        data.tokenAmount.toString(),
        data.solAmount.toString(),
        "0",
        Date.now(),
      ]
    );

    await publishRedis("pool:update", {
      pool: data.pool.toString(),
      update: { type: "liquidity_added", data },
    });

    console.log(`✅ Indexed liquidity added: ${data.pool.toString()}`);
  } catch (error) {
    console.error("Error indexing liquidity added:", error);
  }
}

async function indexLiquidityRemoved(data: any) {
  try {
    // Update pool
    await query(
      `UPDATE amm_pools 
       SET token_reserve = token_reserve - $1,
           sol_reserve = sol_reserve - $2,
           total_lp_tokens = total_lp_tokens - $3
       WHERE pool = $4`,
      [
        data.tokenAmount.toString(),
        data.solAmount.toString(),
        data.lpTokensBurned.toString(),
        data.pool.toString(),
      ]
    );

    // Update liquidity position
    await query(
      `UPDATE liquidity_positions 
       SET lp_tokens = lp_tokens - $1,
           fees_earned = fees_earned + $2,
           updated_at = $3
       WHERE pool = $4 AND provider = $5`,
      [
        data.lpTokensBurned.toString(),
        data.feesEarned.toString(),
        Date.now(),
        data.pool.toString(),
        data.provider.toString(),
      ]
    );

    await publishRedis("pool:update", {
      pool: data.pool.toString(),
      update: { type: "liquidity_removed", data },
    });

    console.log(`✅ Indexed liquidity removed: ${data.pool.toString()}`);
  } catch (error) {
    console.error("Error indexing liquidity removed:", error);
  }
}

async function indexSwapExecuted(data: any) {
  try {
    // Insert swap trade
    await query(
      `INSERT INTO swaps (
        pool, user, is_token_to_sol, amount_in, amount_out, fee_amount, price_impact, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.pool.toString(),
        data.user.toString(),
        data.isTokenToSol,
        data.amountIn.toString(),
        data.amountOut.toString(),
        data.feeAmount.toString(),
        data.priceImpact,
        Date.now(),
      ]
    );

    // Update pool reserves
    if (data.isTokenToSol) {
      await query(
        `UPDATE amm_pools 
         SET token_reserve = token_reserve + $1,
             sol_reserve = sol_reserve - $2,
             volume_24h = volume_24h + $2
         WHERE pool = $3`,
        [data.amountIn.toString(), data.amountOut.toString(), data.pool.toString()]
      );
    } else {
      await query(
        `UPDATE amm_pools 
         SET token_reserve = token_reserve - $1,
             sol_reserve = sol_reserve + $2,
             volume_24h = volume_24h + $2
         WHERE pool = $3`,
        [data.amountOut.toString(), data.amountIn.toString(), data.pool.toString()]
      );
    }

    await publishRedis("swap:executed", {
      pool: data.pool.toString(),
      user: data.user.toString(),
      amountIn: data.amountIn.toString(),
      amountOut: data.amountOut.toString(),
    });

    await publishRedis("price:update", {
      pool: data.pool.toString(),
      price: data.priceAfter.toString(),
    });

    console.log(`✅ Indexed swap executed: ${data.pool.toString()}`);
  } catch (error) {
    console.error("Error indexing swap executed:", error);
  }
}

async function indexLimitOrderPlaced(data: any) {
  try {
    await query(
      `INSERT INTO limit_orders (
        market_id, user, order_id, outcome_index, order_type, side,
        price, size, filled_size, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (order_id) DO NOTHING`,
      [
        data.arena.toString(),
        data.owner.toString(),
        data.orderId.toString(),
        data.outcomeIndex,
        data.orderType,
        data.side,
        data.price.toString(),
        data.size.toString(),
        "0",
        "open",
        Date.now(),
      ]
    );

    await publishRedis("order:update", {
      marketId: data.arena.toString(),
      order: {
        orderId: data.orderId.toString(),
        user: data.owner.toString(),
        type: data.side,
        price: data.price.toString(),
        size: data.size.toString(),
        status: "open",
      },
    });

    console.log(`✅ Indexed limit order placed: ${data.orderId.toString()}`);
  } catch (error) {
    console.error("Error indexing limit order placed:", error);
  }
}

async function indexOrderCancelled(data: any) {
  try {
    await query(
      `UPDATE limit_orders 
       SET status = 'cancelled', cancelled_at = $1
       WHERE order_id = $2`,
      [Date.now(), data.orderId.toString()]
    );

    await publishRedis("order:update", {
      marketId: data.arena.toString(),
      order: {
        orderId: data.orderId.toString(),
        status: "cancelled",
      },
    });

    console.log(`✅ Indexed order cancelled: ${data.orderId.toString()}`);
  } catch (error) {
    console.error("Error indexing order cancelled:", error);
  }
}

async function indexOrderMatched(data: any) {
  try {
    // Update both orders
    await query(
      `UPDATE limit_orders 
       SET filled_size = filled_size + $1,
           status = CASE 
             WHEN filled_size + $1 >= size THEN 'filled' 
             ELSE 'partial' 
           END
       WHERE order_id = $2`,
      [data.matchSize.toString(), data.makerOrderId.toString()]
    );

    await query(
      `UPDATE limit_orders 
       SET filled_size = filled_size + $1,
           status = CASE 
             WHEN filled_size + $1 >= size THEN 'filled' 
             ELSE 'partial' 
           END
       WHERE order_id = $2`,
      [data.matchSize.toString(), data.takerOrderId.toString()]
    );

    // Create trade record
    await query(
      `INSERT INTO trades (
        market_id, outcome_index, type, amount, price, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        data.arena.toString(),
        data.outcomeIndex,
        "match",
        data.matchSize.toString(),
        data.fillPrice.toString(),
        Date.now(),
      ]
    );

    await publishRedis("order:matched", {
      marketId: data.arena.toString(),
      makerOrderId: data.makerOrderId.toString(),
      takerOrderId: data.takerOrderId.toString(),
      fillAmount: data.matchSize.toString(),
      fillPrice: data.fillPrice.toString(),
    });

    console.log(`✅ Indexed order matched: ${data.makerOrderId.toString()}`);
  } catch (error) {
    console.error("Error indexing order matched:", error);
  }
}

// Helper function to publish to Redis
async function publishRedis(channel: string, data: any) {
  if (redis) {
    try {
      await redis.publish(channel, JSON.stringify(data));
    } catch (error) {
      console.error(`Error publishing to Redis channel ${channel}:`, error);
    }
  }
}

export { handleEvent };

