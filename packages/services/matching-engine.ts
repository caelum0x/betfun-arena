import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";

// ========== MATCHING ENGINE SERVICE ==========

/**
 * Off-chain matching engine for limit orders
 * Continuously monitors order books and matches compatible orders
 */

export interface MatchingEngineConfig {
  program: Program;
  matcherKeypair: Keypair;
  pollingInterval: number; // milliseconds
  maxMatchesPerRun: number;
  feeBps: number; // Trading fee in basis points
}

export interface OrderMatch {
  arena: PublicKey;
  outcomeIndex: number;
  buyOrderId: number;
  sellOrderId: number;
  matchPrice: number;
  matchSize: number;
}

export class MatchingEngine {
  private config: MatchingEngineConfig;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config: MatchingEngineConfig) {
    this.config = config;
  }

  /**
   * Start the matching engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("Matching engine is already running");
      return;
    }

    console.log("Starting matching engine...");
    this.isRunning = true;

    // Run matching loop
    this.intervalId = setInterval(async () => {
      try {
        await this.runMatchingCycle();
      } catch (error) {
        console.error("Error in matching cycle:", error);
      }
    }, this.config.pollingInterval);

    console.log(`Matching engine started (polling every ${this.config.pollingInterval}ms)`);
  }

  /**
   * Stop the matching engine
   */
  stop(): void {
    if (!this.isRunning) {
      console.log("Matching engine is not running");
      return;
    }

    console.log("Stopping matching engine...");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log("Matching engine stopped");
  }

  /**
   * Run one matching cycle
   */
  private async runMatchingCycle(): Promise<void> {
    // Fetch all active order books
    const orderBooks = await this.fetchActiveOrderBooks();

    for (const orderBook of orderBooks) {
      try {
        await this.matchOrderBook(orderBook);
      } catch (error) {
        console.error(`Error matching order book ${orderBook.toString()}:`, error);
      }
    }
  }

  /**
   * Match orders in a single order book
   */
  private async matchOrderBook(orderBookPubkey: PublicKey): Promise<void> {
    // Fetch order book data
    const orderBook = await this.config.program.account.orderBook.fetch(orderBookPubkey);

    // Fetch all active buy and sell orders
    const buyOrders = await this.fetchBuyOrders(orderBook.arena, orderBook.outcomeIndex);
    const sellOrders = await this.fetchSellOrders(orderBook.arena, orderBook.outcomeIndex);

    // Sort orders by price
    buyOrders.sort((a, b) => b.price - a.price); // Highest bid first
    sellOrders.sort((a, b) => a.price - b.price); // Lowest ask first

    // Match orders
    const matches: OrderMatch[] = [];
    let matchCount = 0;

    for (const buyOrder of buyOrders) {
      if (matchCount >= this.config.maxMatchesPerRun) break;

      for (const sellOrder of sellOrders) {
        if (matchCount >= this.config.maxMatchesPerRun) break;

        // Check if orders can be matched
        if (buyOrder.price >= sellOrder.price) {
          // Match found!
          const matchSize = Math.min(buyOrder.remainingSize, sellOrder.remainingSize);
          const matchPrice = this.calculateMatchPrice(buyOrder.price, sellOrder.price);

          matches.push({
            arena: orderBook.arena,
            outcomeIndex: orderBook.outcomeIndex,
            buyOrderId: buyOrder.orderId,
            sellOrderId: sellOrder.orderId,
            matchPrice,
            matchSize,
          });

          // Update remaining sizes
          buyOrder.remainingSize -= matchSize;
          sellOrder.remainingSize -= matchSize;

          matchCount++;

          // Remove filled orders
          if (sellOrder.remainingSize === 0) {
            break;
          }
        }
      }
    }

    // Execute matches on-chain
    for (const match of matches) {
      try {
        await this.settleMatch(match);
        console.log(`Matched: ${match.matchSize} @ ${match.matchPrice} (Buy #${match.buyOrderId} x Sell #${match.sellOrderId})`);
      } catch (error) {
        console.error(`Error settling match:`, error);
      }
    }

    if (matches.length > 0) {
      console.log(`Matched ${matches.length} orders in order book ${orderBookPubkey.toString()}`);
    }
  }

  /**
   * Calculate match price (midpoint)
   */
  private calculateMatchPrice(buyPrice: number, sellPrice: number): number {
    return Math.floor((buyPrice + sellPrice) / 2);
  }

  /**
   * Settle a match on-chain
   */
  private async settleMatch(match: OrderMatch): Promise<string> {
    // Derive PDAs
    const [orderBook] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from("order_book"),
        match.arena.toBuffer(),
        Buffer.from([match.outcomeIndex]),
      ],
      this.config.program.programId
    );

    const [buyOrder] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from("limit_order"),
        match.arena.toBuffer(),
        Buffer.from([match.outcomeIndex]),
        Buffer.from(new BN(match.buyOrderId).toArray("le", 8)),
      ],
      this.config.program.programId
    );

    const [sellOrder] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from("limit_order"),
        match.arena.toBuffer(),
        Buffer.from([match.outcomeIndex]),
        Buffer.from(new BN(match.sellOrderId).toArray("le", 8)),
      ],
      this.config.program.programId
    );

    // Fetch order data to get owners
    const buyOrderData = await this.config.program.account.limitOrder.fetch(buyOrder);
    const sellOrderData = await this.config.program.account.limitOrder.fetch(sellOrder);

    // Get escrows
    const [buyOrderEscrow] = await PublicKey.findProgramAddressSync(
      [Buffer.from("order_escrow"), buyOrder.toBuffer()],
      this.config.program.programId
    );

    const [sellOrderEscrow] = await PublicKey.findProgramAddressSync(
      [Buffer.from("order_escrow"), sellOrder.toBuffer()],
      this.config.program.programId
    );

    // Get outcome share data for token mint
    const [outcomeShare] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from("outcome_share"),
        match.arena.toBuffer(),
        Buffer.from([match.outcomeIndex]),
      ],
      this.config.program.programId
    );

    const outcomeShareData = await this.config.program.account.outcomeShare.fetch(outcomeShare);

    // Get buyer's token account
    const buyerTokenAccount = await this.getAssociatedTokenAddress(
      outcomeShareData.tokenMint,
      buyOrderData.owner
    );

    // Get trade PDA
    const orderBookData = await this.config.program.account.orderBook.fetch(orderBook);
    const [trade] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from("trade"),
        match.arena.toBuffer(),
        Buffer.from([match.outcomeIndex]),
        Buffer.from(new BN(orderBookData.tradeCount).toArray("le", 8)),
      ],
      this.config.program.programId
    );

    // Protocol fee recipient (would be configured)
    const protocolFeeRecipient = this.config.matcherKeypair.publicKey;

    // Execute settle_match instruction
    const tx = await this.config.program.methods
      .settleMatch(
        new BN(match.matchSize),
        new BN(match.matchPrice),
        this.config.feeBps
      )
      .accounts({
        arena: match.arena,
        orderBook,
        buyOrder,
        sellOrder,
        trade,
        buyOrderEscrow,
        sellOrderEscrow,
        buyerTokenAccount,
        seller: sellOrderData.owner,
        protocolFeeRecipient,
        matcher: this.config.matcherKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([this.config.matcherKeypair])
      .rpc();

    return tx;
  }

  /**
   * Fetch all active order books
   */
  private async fetchActiveOrderBooks(): Promise<PublicKey[]> {
    // This would query all order book accounts
    // For now, return empty array (would need to implement account filtering)
    const accounts = await this.config.program.account.orderBook.all();
    return accounts.map(acc => acc.publicKey);
  }

  /**
   * Fetch active buy orders for an outcome
   */
  private async fetchBuyOrders(arena: PublicKey, outcomeIndex: number): Promise<any[]> {
    // This would query all buy orders for the outcome
    // For now, return empty array (would need to implement filtering)
    const orders = await this.config.program.account.limitOrder.all([
      {
        memcmp: {
          offset: 8 + 8, // discriminator + order_id
          bytes: arena.toBase58(),
        },
      },
      {
        memcmp: {
          offset: 8 + 8 + 32, // discriminator + order_id + arena
          bytes: Buffer.from([outcomeIndex]).toString("base64"),
        },
      },
    ]);

    return orders
      .map(o => o.account)
      .filter(o => o.side.buy && o.status.open);
  }

  /**
   * Fetch active sell orders for an outcome
   */
  private async fetchSellOrders(arena: PublicKey, outcomeIndex: number): Promise<any[]> {
    const orders = await this.config.program.account.limitOrder.all([
      {
        memcmp: {
          offset: 8 + 8,
          bytes: arena.toBase58(),
        },
      },
      {
        memcmp: {
          offset: 8 + 8 + 32,
          bytes: Buffer.from([outcomeIndex]).toString("base64"),
        },
      },
    ]);

    return orders
      .map(o => o.account)
      .filter(o => o.side.sell && o.status.open);
  }

  /**
   * Helper to get associated token address
   */
  private async getAssociatedTokenAddress(
    mint: PublicKey,
    owner: PublicKey
  ): Promise<PublicKey> {
    const { getAssociatedTokenAddress } = await import("@solana/spl-token");
    return getAssociatedTokenAddress(mint, owner);
  }
}

// ========== EXPORTS ==========

import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";

export default MatchingEngine;

/**
 * Create and start a matching engine instance
 */
export async function startMatchingEngine(
  config: MatchingEngineConfig
): Promise<MatchingEngine> {
  const engine = new MatchingEngine(config);
  await engine.start();
  return engine;
}

