/**
 * Transaction batching utilities for BetFun SDK
 * Allows combining multiple instructions into a single transaction
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import { WalletContextState } from "@solana/wallet-adapter-react";
// @ts-ignore - JSON import
import idl from "./idl/betfun.json";
import { PROGRAM_ID } from "./index";

export interface BatchTransactionOptions {
  skipPreflight?: boolean;
  maxRetries?: number;
}

/**
 * Batch multiple instructions into a single transaction
 */
export class TransactionBatcher {
  private connection: Connection;
  private wallet: WalletContextState;
  private program: Program;
  private instructions: TransactionInstruction[] = [];

  constructor(connection: Connection, wallet: WalletContextState) {
    this.connection = connection;
    this.wallet = wallet;

    const provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: "confirmed" }
    );
    this.program = new Program(idl as any, PROGRAM_ID, provider);
  }

  /**
   * Add an instruction to the batch
   */
  addInstruction(instruction: TransactionInstruction): this {
    this.instructions.push(instruction);
    return this;
  }

  /**
   * Add multiple instructions to the batch
   */
  addInstructions(instructions: TransactionInstruction[]): this {
    this.instructions.push(...instructions);
    return this;
  }

  /**
   * Clear all instructions from the batch
   */
  clear(): this {
    this.instructions = [];
    return this;
  }

  /**
   * Get the current batch size
   */
  getBatchSize(): number {
    return this.instructions.length;
  }

  /**
   * Build and send the batched transaction
   */
  async execute(options: BatchTransactionOptions = {}): Promise<string> {
    if (!this.wallet.publicKey || !this.wallet.sendTransaction) {
      throw new Error("Wallet not connected");
    }

    if (this.instructions.length === 0) {
      throw new Error("No instructions to execute");
    }

    const { skipPreflight = false, maxRetries = 3 } = options;

    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash("confirmed");

    // Build transaction
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.wallet.publicKey;
    transaction.add(...this.instructions);

    // Send transaction
    let lastError: any = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const signature = await this.wallet.sendTransaction(
          transaction,
          this.connection,
          { skipPreflight }
        );

        // Wait for confirmation
        await this.connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed"
        );

        // Clear instructions after successful execution
        this.clear();
        return signature;
      } catch (error: any) {
        lastError = error;

        // Refresh blockhash for retry
        if (attempt < maxRetries - 1) {
          const { blockhash: newBlockhash, lastValidBlockHeight: newLastValidBlockHeight } =
            await this.connection.getLatestBlockhash("confirmed");
          transaction.recentBlockhash = newBlockhash;
        } else {
          break;
        }
      }
    }

    throw lastError || new Error("Transaction failed after retries");
  }

  /**
   * Build transaction without sending (for preview or manual sending)
   */
  async build(): Promise<Transaction> {
    if (this.instructions.length === 0) {
      throw new Error("No instructions to build");
    }

    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");

    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.wallet.publicKey!;
    transaction.add(...this.instructions);

    return transaction;
  }
}

/**
 * Create a transaction batcher instance
 */
export function createTransactionBatcher(
  connection: Connection,
  wallet: WalletContextState
): TransactionBatcher {
  return new TransactionBatcher(connection, wallet);
}

/**
 * Batch multiple arena joins into a single transaction
 */
export async function batchJoinArenas(
  connection: Connection,
  wallet: WalletContextState,
  arenaPDAs: PublicKey[],
  outcomeIndices: number[]
): Promise<string> {
  if (arenaPDAs.length !== outcomeIndices.length) {
    throw new Error("Arena PDAs and outcome indices must have the same length");
  }

  const batcher = createTransactionBatcher(connection, wallet);
  const provider = new AnchorProvider(
    connection,
    wallet as any,
    { commitment: "confirmed" }
  );
  const program = new Program(idl as any, PROGRAM_ID, provider);

  for (let i = 0; i < arenaPDAs.length; i++) {
    const arenaPDA = arenaPDAs[i];
    const outcomeIndex = outcomeIndices[i];

    const instruction = await program.methods
      .joinArena(outcomeIndex)
      .accounts({
        arena: arenaPDA,
        participant: wallet.publicKey!,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    batcher.addInstruction(instruction);
  }

  return batcher.execute();
}

/**
 * Batch multiple share purchases into a single transaction
 */
export async function batchBuyShares(
  connection: Connection,
  wallet: WalletContextState,
  arenaPDA: PublicKey,
  purchases: Array<{ outcomeIndex: number; amount: number }>
): Promise<string> {
  const batcher = createTransactionBatcher(connection, wallet);
  const provider = new AnchorProvider(
    connection,
    wallet as any,
    { commitment: "confirmed" }
  );
  const program = new Program(idl as any, PROGRAM_ID, provider);

  for (const purchase of purchases) {
    // Derive PDAs for each purchase
    const [outcomeShare] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("outcome_share"),
        arenaPDA.toBuffer(),
        Buffer.from([purchase.outcomeIndex]),
      ],
      PROGRAM_ID
    );

    const [shareMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_mint"),
        arenaPDA.toBuffer(),
        Buffer.from([purchase.outcomeIndex]),
      ],
      PROGRAM_ID
    );

    const instruction = await program.methods
      .buyShares(purchase.outcomeIndex, new BN(purchase.amount))
      .accounts({
        arena: arenaPDA,
        outcomeShare,
        shareMint,
        buyer: wallet.publicKey!,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    batcher.addInstruction(instruction);
  }

  return batcher.execute();
}

