import { Router, Request } from "express";
import { createClient } from "@supabase/supabase-js";
import { pushBigBetAlert, pushWinnerAnnouncement } from "../moddio/pushBigBet";
import { isProcessed, markProcessed } from "../utils/dedupe";
import { retry } from "../utils/retry";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError } from "../middleware/errorHandler";
import { verifyHeliusWebhook, extractSignature } from "./verify";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);

/**
 * POST /webhook/transaction
 * Handle Helius webhook for program transactions
 * With deduplication and retry logic
 */
router.post(
  "/transaction",
  asyncHandler(async (req, res) => {
    const { type, signature: txSignature, transaction } = req.body;

    // Validate request
    if (!txSignature || !type) {
      throw new AppError("Missing required fields: signature, type", 400, "VALIDATION_ERROR");
    }

    // Check if already processed (deduplication)
    if (await isProcessed(txSignature)) {
      console.log("Transaction already processed:", txSignature);
      return res.json({ success: true, message: "Already processed" });
    }

    // Verify webhook signature if configured
    if (process.env.HELIUS_WEBHOOK_SECRET) {
      const webhookSignature = extractSignature(req.headers);
      // Use rawBody if available (from express.json verify), otherwise stringify
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      
      if (!webhookSignature) {
        throw new AppError("Missing webhook signature", 401, "UNAUTHORIZED");
      }

      const isValid = verifyHeliusWebhook(
        rawBody,
        webhookSignature,
        process.env.HELIUS_WEBHOOK_SECRET
      );

      if (!isValid) {
        throw new AppError("Invalid webhook signature", 401, "UNAUTHORIZED");
      }
    }

    console.log("Processing webhook:", type, txSignature);

    // Process with retry logic
    await retry(
      async () => {
        // Process based on transaction type
        switch (type) {
          case "CREATE_ARENA":
            await handleCreateArena(transaction);
            break;
          case "JOIN_ARENA":
            await handleJoinArena(transaction);
            break;
          case "RESOLVE_ARENA":
            await handleResolveArena(transaction);
            break;
          case "CLAIM_WINNINGS":
            await handleClaimWinnings(transaction);
            break;
          case "CREATE_SHARE_TOKENS":
            await handleCreateShareTokens(transaction);
            break;
          case "BUY_SHARES":
            await handleBuyShares(transaction);
            break;
          case "SELL_SHARES":
            await handleSellShares(transaction);
            break;
          case "INITIALIZE_POOL":
            await handleInitializePool(transaction);
            break;
          case "ADD_LIQUIDITY":
            await handleAddLiquidity(transaction);
            break;
          case "REMOVE_LIQUIDITY":
            await handleRemoveLiquidity(transaction);
            break;
          case "SWAP":
            await handleSwap(transaction);
            break;
          case "PLACE_LIMIT_ORDER":
            await handlePlaceLimitOrder(transaction);
            break;
          case "CANCEL_ORDER":
            await handleCancelOrder(transaction);
            break;
          default:
            console.log(`Unknown transaction type: ${type}, attempting generic parsing`);
            // Try to parse as generic transaction
            await handleGenericTransaction(transaction, type);
        }

        // Mark as processed only after successful processing
        await markProcessed(txSignature);
      },
      {
        maxAttempts: 3,
        initialDelay: 1000,
        retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
      }
    );

    res.json({ success: true, signature: txSignature });
  })
);

async function handleCreateArena(txData: any) {
  // Parse transaction data and insert into database
  const {
    arenaAccount,
    title,
    description,
    question,
    outcomes,
    entryFee,
    endTime,
    creator,
    tags,
  } = txData;

  // Validate required fields
  if (!arenaAccount || !title || !question || !outcomes || !creator) {
    throw new AppError("Missing required fields for CREATE_ARENA", 400, "VALIDATION_ERROR");
  }

  const { error } = await supabase.from("arenas").insert({
    arena_account: arenaAccount,
    title,
    description: description || "",
    question,
    outcomes,
    entry_fee: entryFee || 0,
    end_time: new Date((endTime || Date.now() / 1000) * 1000).toISOString(),
    creator_wallet: creator,
    tags: tags || [],
    outcome_counts: new Array(outcomes.length).fill(0),
    outcome_pots: new Array(outcomes.length).fill(0),
    pot: 0,
    participants_count: 0,
    resolved: false,
  });

  if (error) {
    // Check if it's a duplicate (unique constraint violation)
    if (error.code === "23505") {
      console.log("Arena already exists:", arenaAccount);
      return; // Already exists, not an error
    }
    throw new AppError(`Database error: ${error.message}`, 500, "DATABASE_ERROR");
  }

  console.log("Arena created:", arenaAccount);
}

async function handleJoinArena(txData: any) {
  const { arenaAccount, wallet, outcomeChosen, amount, signature } = txData;

  // Validate required fields
  if (!arenaAccount || !wallet || outcomeChosen === undefined || !amount) {
    throw new AppError("Missing required fields for JOIN_ARENA", 400, "VALIDATION_ERROR");
  }

  // Get arena
  const { data: arena, error: arenaError } = await supabase
    .from("arenas")
    .select("id, outcome_pots, outcome_counts, outcomes")
    .eq("arena_account", arenaAccount)
    .single();

  if (arenaError || !arena) {
    throw new AppError(`Arena not found: ${arenaAccount}`, 404, "ARENA_NOT_FOUND");
  }

  // Validate outcome index
  if (outcomeChosen >= arena.outcomes.length) {
    throw new AppError(`Invalid outcome index: ${outcomeChosen}`, 400, "INVALID_OUTCOME");
  }

  // Check if participant already exists (deduplication at DB level)
  const { data: existingParticipant } = await supabase
    .from("participants")
    .select("id")
    .eq("arena_id", arena.id)
    .eq("wallet", wallet)
    .single();

  if (existingParticipant) {
    console.log("Participant already exists:", wallet, "arena:", arenaAccount);
    return; // Already processed
  }

  // Insert participant
  const { error: participantError } = await supabase.from("participants").insert({
    arena_id: arena.id,
    wallet,
    outcome_chosen: outcomeChosen,
    amount,
    tx_signature: signature,
    joined_at: new Date().toISOString(),
    claimed: false,
  });

  if (participantError) {
    throw new AppError(`Failed to insert participant: ${participantError.message}`, 500, "DATABASE_ERROR");
  }

  // Update arena stats atomically
  const newOutcomePots = [...(arena.outcome_pots || [])];
  const newOutcomeCounts = [...(arena.outcome_counts || [])];
  newOutcomePots[outcomeChosen] = (newOutcomePots[outcomeChosen] || 0) + amount;
  newOutcomeCounts[outcomeChosen] = (newOutcomeCounts[outcomeChosen] || 0) + 1;

  const { error: updateError } = await supabase
    .from("arenas")
    .update({
      pot: supabase.raw(`pot + ${amount}`),
      participants_count: supabase.raw("participants_count + 1"),
      outcome_pots: newOutcomePots,
      outcome_counts: newOutcomeCounts,
    })
    .eq("id", arena.id);

  if (updateError) {
    throw new AppError(`Failed to update arena: ${updateError.message}`, 500, "DATABASE_ERROR");
  }

  // Push to Moddio if big bet (non-blocking)
  if (amount > 1_000_000_000) {
    // > 1 SOL
    pushBigBetAlert(arenaAccount, wallet, amount, outcomeChosen.toString()).catch((err) => {
      console.error("Failed to push Moddio alert:", err);
      // Don't throw - Moddio failure shouldn't fail the webhook
    });
  }

  console.log("Participant joined:", wallet, "arena:", arenaAccount);
}

async function handleResolveArena(txData: any) {
  const { arenaAccount, winnerOutcome } = txData;

  // Validate required fields
  if (!arenaAccount || winnerOutcome === undefined) {
    throw new AppError("Missing required fields for RESOLVE_ARENA", 400, "VALIDATION_ERROR");
  }

  // Get arena first to validate
  const { data: arena, error: arenaError } = await supabase
    .from("arenas")
    .select("id, outcomes, pot, resolved")
    .eq("arena_account", arenaAccount)
    .single();

  if (arenaError || !arena) {
    throw new AppError(`Arena not found: ${arenaAccount}`, 404, "ARENA_NOT_FOUND");
  }

  // Check if already resolved
  if (arena.resolved) {
    console.log("Arena already resolved:", arenaAccount);
    return; // Already processed
  }

  // Validate winner outcome index
  if (winnerOutcome >= arena.outcomes.length) {
    throw new AppError(`Invalid winner outcome index: ${winnerOutcome}`, 400, "INVALID_OUTCOME");
  }

  // Update arena
  const { error: updateError } = await supabase
    .from("arenas")
    .update({
      resolved: true,
      winner_outcome: winnerOutcome,
    })
    .eq("arena_account", arenaAccount);

  if (updateError) {
    throw new AppError(`Failed to resolve arena: ${updateError.message}`, 500, "DATABASE_ERROR");
  }

  // Push to Moddio (non-blocking)
  pushWinnerAnnouncement(
    arenaAccount,
    arena.outcomes[winnerOutcome],
    arena.pot
  ).catch((err) => {
    console.error("Failed to push Moddio announcement:", err);
    // Don't throw - Moddio failure shouldn't fail the webhook
  });

  console.log("Arena resolved:", arenaAccount, "winner:", winnerOutcome);
}

async function handleClaimWinnings(txData: any) {
  const { arenaAccount, wallet } = txData;

  // Validate required fields
  if (!arenaAccount || !wallet) {
    throw new AppError("Missing required fields for CLAIM_WINNINGS", 400, "VALIDATION_ERROR");
  }

  // Get arena
  const { data: arena, error: arenaError } = await supabase
    .from("arenas")
    .select("id")
    .eq("arena_account", arenaAccount)
    .single();

  if (arenaError || !arena) {
    throw new AppError(`Arena not found: ${arenaAccount}`, 404, "ARENA_NOT_FOUND");
  }

  // Check if participant exists
  const { data: participant } = await supabase
    .from("participants")
    .select("id, claimed")
    .eq("arena_id", arena.id)
    .eq("wallet", wallet)
    .single();

  if (!participant) {
    throw new AppError(`Participant not found: ${wallet}`, 404, "PARTICIPANT_NOT_FOUND");
  }

  // Check if already claimed
  if (participant.claimed) {
    console.log("Winnings already claimed:", wallet);
    return; // Already processed
  }

  // Mark as claimed
  const { error: updateError } = await supabase
    .from("participants")
    .update({ claimed: true })
    .eq("arena_id", arena.id)
    .eq("wallet", wallet);

  if (updateError) {
    throw new AppError(`Failed to mark as claimed: ${updateError.message}`, 500, "DATABASE_ERROR");
  }

  console.log("Winnings claimed:", wallet, "arena:", arenaAccount);
}

async function handleCreateShareTokens(txData: any) {
  const { arenaAccount, outcomeIndex, tokenMint, initialPrice } = txData;

  if (!arenaAccount || outcomeIndex === undefined || !tokenMint) {
    throw new AppError("Missing required fields for CREATE_SHARE_TOKENS", 400, "VALIDATION_ERROR");
  }

  const { error } = await supabase.from("outcome_shares").insert({
    arena: arenaAccount,
    outcome_index: outcomeIndex,
    token_mint: tokenMint,
    initial_price: initialPrice?.toString() || "0",
    total_supply: "0",
    current_price: initialPrice?.toString() || "0",
    volume_24h: "0",
    trade_count: 0,
    created_at: new Date().toISOString(),
  });

  if (error && error.code !== "23505") {
    throw new AppError(`Database error: ${error.message}`, 500, "DATABASE_ERROR");
  }

  console.log("Share tokens created:", arenaAccount, "outcome:", outcomeIndex);
}

async function handleBuyShares(txData: any) {
  const { arenaAccount, buyer, outcomeIndex, sharesMinted, solSpent, currentPrice } = txData;

  if (!arenaAccount || !buyer || outcomeIndex === undefined) {
    throw new AppError("Missing required fields for BUY_SHARES", 400, "VALIDATION_ERROR");
  }

  // Insert trade
  await supabase.from("trades").insert({
    market_id: arenaAccount,
    user: buyer,
    outcome_index: outcomeIndex,
    type: "buy",
    amount: sharesMinted?.toString() || "0",
    price: currentPrice?.toString() || "0",
    sol_amount: solSpent?.toString() || "0",
    timestamp: new Date().toISOString(),
  });

  console.log("Shares bought:", buyer, "arena:", arenaAccount);
}

async function handleSellShares(txData: any) {
  const { arenaAccount, seller, outcomeIndex, sharesBurned, solReceived, currentPrice } = txData;

  if (!arenaAccount || !seller || outcomeIndex === undefined) {
    throw new AppError("Missing required fields for SELL_SHARES", 400, "VALIDATION_ERROR");
  }

  // Insert trade
  await supabase.from("trades").insert({
    market_id: arenaAccount,
    user: seller,
    outcome_index: outcomeIndex,
    type: "sell",
    amount: sharesBurned?.toString() || "0",
    price: currentPrice?.toString() || "0",
    sol_amount: solReceived?.toString() || "0",
    timestamp: new Date().toISOString(),
  });

  console.log("Shares sold:", seller, "arena:", arenaAccount);
}

async function handleInitializePool(txData: any) {
  const { arenaAccount, outcomeIndex, pool, shareMint, lpTokenMint, feeBps, protocolFeeBps } = txData;

  if (!arenaAccount || outcomeIndex === undefined || !pool) {
    throw new AppError("Missing required fields for INITIALIZE_POOL", 400, "VALIDATION_ERROR");
  }

  const { error } = await supabase.from("amm_pools").insert({
    pool: pool,
    arena: arenaAccount,
    outcome_index: outcomeIndex,
    share_mint: shareMint || null,
    lp_token_mint: lpTokenMint || null,
    token_reserve: "0",
    sol_reserve: "0",
    total_lp_tokens: "0",
    fee_bps: feeBps || 30,
    protocol_fee_bps: protocolFeeBps || 10,
    created_at: new Date().toISOString(),
  });

  if (error && error.code !== "23505") {
    throw new AppError(`Database error: ${error.message}`, 500, "DATABASE_ERROR");
  }

  console.log("Pool initialized:", pool, "arena:", arenaAccount);
}

async function handleAddLiquidity(txData: any) {
  const { pool, provider, tokenAmount, solAmount, lpTokensMinted } = txData;

  if (!pool || !provider) {
    throw new AppError("Missing required fields for ADD_LIQUIDITY", 400, "VALIDATION_ERROR");
  }

  // Update pool reserves
  await supabase.rpc("update_amm_pool", {
    pool_id: pool,
    token_reserve_delta: tokenAmount?.toString() || "0",
    sol_reserve_delta: solAmount?.toString() || "0",
    lp_tokens_delta: lpTokensMinted?.toString() || "0",
  });

  // Update liquidity position
  await supabase.from("liquidity_positions").upsert({
    pool: pool,
    provider: provider,
    lp_tokens: lpTokensMinted?.toString() || "0",
    tokens_deposited: tokenAmount?.toString() || "0",
    sol_deposited: solAmount?.toString() || "0",
    fees_earned: "0",
    updated_at: new Date().toISOString(),
  });

  console.log("Liquidity added:", pool, "provider:", provider);
}

async function handleRemoveLiquidity(txData: any) {
  const { pool, provider, lpTokensBurned, tokenAmount, solAmount, feesEarned } = txData;

  if (!pool || !provider) {
    throw new AppError("Missing required fields for REMOVE_LIQUIDITY", 400, "VALIDATION_ERROR");
  }

  // Update pool reserves
  await supabase.rpc("update_amm_pool", {
    pool_id: pool,
    token_reserve_delta: `-${tokenAmount?.toString() || "0"}`,
    sol_reserve_delta: `-${solAmount?.toString() || "0"}`,
    lp_tokens_delta: `-${lpTokensBurned?.toString() || "0"}`,
  });

  console.log("Liquidity removed:", pool, "provider:", provider);
}

async function handleSwap(txData: any) {
  const { pool, user, amountIn, amountOut, isTokenToSol, feeAmount } = txData;

  if (!pool || !user) {
    throw new AppError("Missing required fields for SWAP", 400, "VALIDATION_ERROR");
  }

  // Insert swap record
  await supabase.from("swaps").insert({
    pool: pool,
    user: user,
    is_token_to_sol: isTokenToSol || false,
    amount_in: amountIn?.toString() || "0",
    amount_out: amountOut?.toString() || "0",
    fee_amount: feeAmount?.toString() || "0",
    timestamp: new Date().toISOString(),
  });

  console.log("Swap executed:", pool, "user:", user);
}

async function handlePlaceLimitOrder(txData: any) {
  const { arenaAccount, user, orderId, outcomeIndex, orderType, side, price, size } = txData;

  if (!arenaAccount || !user || !orderId || outcomeIndex === undefined) {
    throw new AppError("Missing required fields for PLACE_LIMIT_ORDER", 400, "VALIDATION_ERROR");
  }

  await supabase.from("limit_orders").insert({
    market_id: arenaAccount,
    user: user,
    order_id: orderId.toString(),
    outcome_index: outcomeIndex,
    order_type: orderType || "limit",
    side: side || "buy",
    price: price?.toString() || "0",
    size: size?.toString() || "0",
    filled_size: "0",
    status: "open",
    created_at: new Date().toISOString(),
  });

  console.log("Limit order placed:", orderId, "arena:", arenaAccount);
}

async function handleCancelOrder(txData: any) {
  const { arenaAccount, orderId } = txData;

  if (!arenaAccount || !orderId) {
    throw new AppError("Missing required fields for CANCEL_ORDER", 400, "VALIDATION_ERROR");
  }

  await supabase
    .from("limit_orders")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("order_id", orderId.toString())
    .eq("market_id", arenaAccount);

  console.log("Order cancelled:", orderId, "arena:", arenaAccount);
}

async function handleGenericTransaction(txData: any, type: string) {
  // Generic handler for unknown transaction types
  // Log for debugging
  console.log(`Processing generic transaction type: ${type}`, txData);
  
  // Try to extract common fields and index
  if (txData.arenaAccount) {
    // At minimum, update last activity timestamp
    await supabase
      .from("markets")
      .update({ last_activity: new Date().toISOString() })
      .eq("arena_account", txData.arenaAccount);
  }
}

export { router as webhookRouter };

