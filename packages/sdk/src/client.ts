import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { Program, AnchorProvider, BN, Idl } from "@coral-xyz/anchor";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
// @ts-ignore - JSON import
import idl from "./idl/betfun.json";
import { PROGRAM_ID, getArenaPDA } from "./index";

// Types
export interface Arena {
  address: PublicKey;
  creator: PublicKey;
  title: string;
  description: string;
  question: string;
  outcomes: string[];
  tags: string[];
  entryFee: BN;
  endTime: BN;
  resolved: boolean;
  winnerOutcome: number | null;
  totalPot: BN;
  participantCount: number;
  createdAt: BN;
}

export interface Participant {
  address: PublicKey;
  arena: PublicKey;
  user: PublicKey;
  outcomeChosen: number;
  stake: BN;
  claimed: boolean;
  joinedAt: BN;
}

/**
 * Create a BetFun client instance
 */
export function createBetFunClient(
  connection: Connection,
  wallet: WalletContextState
): BetFunClient {
  // Check if wallet context is valid and connected
  if (!wallet) {
    throw new Error("Wallet context not available");
  }
  
  if (!wallet.connected || !wallet.publicKey) {
    throw new Error("Wallet not connected. Please connect your wallet first.");
  }

  const provider = new AnchorProvider(
    connection,
    wallet as any,
    { commitment: "confirmed" }
  );

  // Anchor's AccountClient requires accounts to have type definitions with size information
  // The IDL's accounts array only has name and discriminator, so we need to enrich them
  const accountTypesMap = new Map();
  if (idl.types) {
    idl.types.forEach((type: any) => {
      if (type.name && type.type && type.type.kind === "struct") {
        accountTypesMap.set(type.name, type.type);
      }
    });
  }

  // Enrich accounts with their type definitions from the types array
  const enrichedAccounts = (idl.accounts || []).map((account: any) => {
    const accountType = accountTypesMap.get(account.name);
    if (accountType && accountType.fields) {
      // Account has a matching type definition - use it
      return {
        ...account,
        type: accountType,
      };
    }
    // Account doesn't have a type definition - exclude it to avoid errors
    // We'll only include accounts that have proper type definitions
    return null;
  }).filter((acc: any) => acc !== null); // Remove accounts without types

  // Create enriched IDL with only accounts that have type definitions
  const enrichedIdl = {
    ...idl,
    accounts: enrichedAccounts,
  };

  // CRITICAL FIX: Use Program constructor correctly
  // If IDL has 'address' field, use: new Program(idl, provider)
  // If IDL doesn't have 'address', use: new Program(idl, programId, provider)
  // This ensures instruction coder is properly initialized
  let program: Program<Idl>;
  
  try {
    // Try enriched IDL first (best case - accounts work)
    // Ensure IDL has address field
    const enrichedIdlWithAddress = {
      ...enrichedIdl,
      address: enrichedIdl.address || PROGRAM_ID.toBase58(),
    };
    
    // Use Program constructor with IDL that has address field
    // @ts-ignore - Program constructor can take idl and provider if address is in IDL
    program = new Program<Idl>(enrichedIdlWithAddress as Idl, provider);
    console.log("✅ Program initialized with enriched IDL");
  } catch (error: any) {
    // If enriched fails, use original IDL
    console.warn("⚠️  Enriched IDL failed, using original IDL");
    console.warn(`   Error: ${error.message}`);
    
    try {
      // Ensure original IDL has address field
      const idlWithAddress = {
        ...idl,
        address: idl.address || PROGRAM_ID.toBase58(),
      };
      
      // Use Program constructor with IDL that has address field
      // @ts-ignore - Program constructor can take idl and provider if address is in IDL
      program = new Program<Idl>(idlWithAddress as Idl, provider);
      console.log("✅ Program initialized with original IDL");
    } catch (fallbackError: any) {
      // If original IDL also fails, try minimal IDL
      console.warn("⚠️  Original IDL failed, trying minimal IDL");
      console.warn(`   Error: ${fallbackError.message}`);
      
      const minimalIdl = {
        address: idl.address || PROGRAM_ID.toBase58(),
        version: idl.version || idl.metadata?.version || "0.1.0",
        name: idl.name || idl.metadata?.name || "betfun",
        instructions: idl.instructions || [],
        accounts: [],
        types: idl.types || [],
        events: idl.events || [],
        errors: idl.errors || [],
        metadata: idl.metadata || {},
      };
      
      // Use Program constructor with minimal IDL that has address field
      // @ts-ignore - Program constructor can take idl and provider if address is in IDL
      program = new Program<Idl>(minimalIdl as Idl, provider);
      console.log("✅ Program initialized with minimal IDL");
    }
  }
  
  // CRITICAL: Verify Program is usable
  if (!program.methods) {
    throw new Error("Program methods namespace not initialized");
  }
  
  if (!program.coder) {
    throw new Error("Program coder not initialized - cannot encode instructions");
  }
  
  // Verify instruction coder is accessible (it's used by methods)
  // @ts-ignore - instruction coder might be accessed via coder.instruction
  if (program.coder.instruction === undefined) {
    console.warn("⚠️  Instruction coder might not be directly accessible, but methods should still work");
  }

  return new BetFunClient(program, connection, wallet);
}

/**
 * BetFun Client - High-level API for interacting with BetFun Arena program
 */
export class BetFunClient {
  constructor(
    public program: Program,
    public connection: Connection,
    public wallet: WalletContextState
  ) {}

  /**
   * Get Arena account data
   */
  async getArena(arenaPDA: PublicKey): Promise<Arena | null> {
    try {
      // @ts-ignore - Account namespace may not exist if accounts array is empty
      const account = await this.program.account.arena?.fetch(arenaPDA);
      if (!account) {
        return null;
      }
      return {
        address: arenaPDA,
        creator: account.creator,
        title: account.title,
        description: account.description,
        question: account.question,
        outcomes: account.outcomes,
        tags: account.tags,
        entryFee: account.entryFee,
        endTime: account.endTime,
        resolved: account.resolved,
        winnerOutcome: account.winnerOutcome,
        totalPot: account.totalPot,
        participantCount: account.participantCount,
        createdAt: account.createdAt,
      };
    } catch (error) {
      console.error("Error fetching arena:", error);
      return null;
    }
  }

  /**
   * Get Participant account data
   */
  async getParticipant(participantPDA: PublicKey): Promise<Participant | null> {
    try {
      // @ts-ignore - Account namespace may not exist if accounts array is empty
      const account = await this.program.account.participant?.fetch(participantPDA);
      if (!account) {
        return null;
      }
      return {
        address: participantPDA,
        arena: account.arena,
        user: account.user,
        outcomeChosen: account.outcomeChosen,
        stake: account.stake,
        claimed: account.claimed,
        joinedAt: account.joinedAt,
      };
    } catch (error) {
      console.error("Error fetching participant:", error);
      return null;
    }
  }

  /**
   * Get Arena PDA
   */
  getArenaPDA(creator: PublicKey, title: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('arena'),
        creator.toBuffer(),
        Buffer.from(title),
      ],
      this.program.programId
    );
  }

  /**
   * Fetch all arenas from the blockchain
   * Uses getProgramAccounts to find all Arena accounts
   */
  async getAllArenas(): Promise<Arena[]> {
    try {
      // Get all Arena accounts by filtering for the Arena discriminator
      // The discriminator is the first 8 bytes of the account data
      // We need to calculate it from the account name "arena"
      const accounts = await this.connection.getProgramAccounts(this.program.programId, {
        filters: [
          {
            dataSize: 1000, // Approximate size - adjust based on actual Arena account size
          },
        ],
      });

      const arenas: Arena[] = [];
      
      // Try to fetch each account as an Arena
      for (const { pubkey } of accounts) {
        try {
          const arena = await this.getArena(pubkey);
          if (arena) {
            arenas.push(arena);
          }
        } catch (error) {
          // Skip accounts that aren't Arena accounts
          continue;
        }
      }

      return arenas;
    } catch (error) {
      console.error("Error fetching all arenas:", error);
      return [];
    }
  }

  /**
   * Get Participant PDA
   */
  getParticipantPDA(arena: PublicKey, user: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('participant'),
        arena.toBuffer(),
        user.toBuffer(),
      ],
      this.program.programId
    );
  }

  /**
   * Join an arena
   */
  async joinArena(
    arenaPDA: PublicKey,
    outcomeIndex: number
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const [participantPDA] = this.getParticipantPDA(arenaPDA, this.wallet.publicKey);

    const signature = await this.program.methods
      .joinArena(outcomeIndex)
      .accounts({
        arena: arenaPDA,
        participant: participantPDA,
        user: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return signature;
  }

  /**
   * Resolve an arena
   */
  async resolveArena(
    arenaPDA: PublicKey,
    winnerOutcome: number
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const arena = await this.getArena(arenaPDA);
    if (!arena) {
      throw new Error("Arena not found");
    }

    if (arena.creator.toString() !== this.wallet.publicKey.toString()) {
      throw new Error("Only the creator can resolve the arena");
    }

    const signature = await this.program.methods
      .resolveArena(winnerOutcome)
      .accounts({
        arena: arenaPDA,
        resolver: this.wallet.publicKey,
      })
      .rpc();

    return signature;
  }

  /**
   * Claim winnings
   */
  async claimWinnings(
    arenaPDA: PublicKey,
    creator: PublicKey
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const [participantPDA] = this.getParticipantPDA(arenaPDA, this.wallet.publicKey);
    const arena = await this.getArena(arenaPDA);
    
    if (!arena) {
      throw new Error("Arena not found");
    }

    if (!arena.resolved) {
      throw new Error("Arena not resolved yet");
    }

    const [arenaEscrow] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("arena"),
        creator.toBuffer(),
        Buffer.from(arena.title),
      ],
      this.program.programId
    );

    const signature = await this.program.methods
      .claimWinnings()
      .accounts({
        arena: arenaPDA,
        participant: participantPDA,
        user: this.wallet.publicKey,
        arenaEscrow,
        systemProgram: PublicKey.default,
      })
      .rpc();

    return signature;
  }

  /**
   * Create a new arena
   */
  async createArena(params: {
    title: string;
    description: string;
    question: string;
    outcomes: string[];
    tags?: string[];
    entryFee: number; // in lamports
    endTime: number; // Unix timestamp
    manualResolve?: boolean;
    oracle?: PublicKey | null;
    tokenMint?: PublicKey | null;
  }): Promise<{ signature: string; arenaPDA: PublicKey }> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Derive arena PDA
    const [arenaPDA] = getArenaPDA(this.wallet.publicKey, params.title);

    // Build and send transaction
    // Anchor converts snake_case to camelCase, so create_arena becomes createArena
    // @ts-ignore - methods might use snake_case or camelCase depending on Anchor version
    const createArenaMethod = this.program.methods.createArena || this.program.methods.create_arena;
    
    if (!createArenaMethod) {
      const availableMethods = Object.keys(this.program.methods || {}).join(", ");
      throw new Error(`createArena method not found. Available methods: ${availableMethods || "none"}. Program may not be properly initialized.`);
    }
    
    if (typeof createArenaMethod !== 'function') {
      throw new Error("createArena is not a function. Program may not be properly initialized.");
    }
    
    // Call the method - instruction coder should be available
    // If it's not, Anchor will throw a clear error
    const signature = await createArenaMethod(
        params.title,
        params.description,
        params.question,
        params.outcomes,
        params.tags || [],
        new BN(params.entryFee),
        new BN(params.endTime),
        params.manualResolve || false,
        params.oracle || null,
        params.tokenMint || null
      )
      .accounts({
        arena: arenaPDA,
        creator: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { signature, arenaPDA };
  }

  /**
   * Create share tokens for an outcome
   */
  async createShareTokens(
    arenaPDA: PublicKey,
    outcomeIndex: number,
    initialPrice: number // in lamports
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const arena = await this.getArena(arenaPDA);
    if (!arena) {
      throw new Error("Arena not found");
    }

    if (arena.creator.toString() !== this.wallet.publicKey.toString()) {
      throw new Error("Only the creator can create share tokens");
    }

    // Derive PDAs
    const [outcomeShare] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("outcome_share"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const [shareMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_mint"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const signature = await this.program.methods
      .createShareTokens(outcomeIndex, new BN(initialPrice))
      .accounts({
        arena: arenaPDA,
        creator: this.wallet.publicKey,
        outcomeShare,
        shareMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return signature;
  }

  /**
   * Buy outcome shares
   */
  async buyShares(
    arenaPDA: PublicKey,
    outcomeIndex: number,
    amount: number // number of shares to buy
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Derive PDAs
    const [outcomeShare] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("outcome_share"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const [shareMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_mint"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const [shareBalance] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_balance"),
        outcomeShare.toBuffer(),
        this.wallet.publicKey.toBuffer(),
      ],
      this.program.programId
    );

    const buyerTokenAccount = await getAssociatedTokenAddress(
      shareMint,
      this.wallet.publicKey
    );

    // Get arena escrow PDA
    const arena = await this.getArena(arenaPDA);
    if (!arena) {
      throw new Error("Arena not found");
    }

    const [arenaEscrow] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("arena"),
        arena.creator.toBuffer(),
        Buffer.from(arena.title),
      ],
      this.program.programId
    );

    // Note: The IDL shows amount_sol but handler treats it as number of shares
    const signature = await this.program.methods
      .buyShares(outcomeIndex, new BN(amount))
      .accounts({
        arena: arenaPDA,
        outcomeShare,
        shareMint,
        shareBalance,
        buyerTokenAccount,
        buyer: this.wallet.publicKey,
        arenaEscrow,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return signature;
  }

  /**
   * Sell outcome shares
   */
  async sellShares(
    arenaPDA: PublicKey,
    outcomeIndex: number,
    amount: number // number of shares to sell
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Derive PDAs
    const [outcomeShare] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("outcome_share"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const [shareMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_mint"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const [shareBalance] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_balance"),
        outcomeShare.toBuffer(),
        this.wallet.publicKey.toBuffer(),
      ],
      this.program.programId
    );

    const sellerTokenAccount = await getAssociatedTokenAddress(
      shareMint,
      this.wallet.publicKey
    );

    // Get arena escrow PDA
    const arena = await this.getArena(arenaPDA);
    if (!arena) {
      throw new Error("Arena not found");
    }

    const [arenaEscrow] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("arena"),
        arena.creator.toBuffer(),
        Buffer.from(arena.title),
      ],
      this.program.programId
    );

    const signature = await this.program.methods
      .sellShares(outcomeIndex, new BN(amount))
      .accounts({
        arena: arenaPDA,
        outcomeShare,
        shareMint,
        shareBalance,
        sellerTokenAccount,
        seller: this.wallet.publicKey,
        arenaEscrow,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return signature;
  }

  /**
   * Redeem winning shares after arena resolution
   */
  async redeemShares(
    arenaPDA: PublicKey,
    outcomeIndex: number,
    amount: number // number of shares to redeem
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Derive PDAs
    const [outcomeShare] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("outcome_share"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const [shareMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_mint"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const [shareBalance] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_balance"),
        outcomeShare.toBuffer(),
        this.wallet.publicKey.toBuffer(),
      ],
      this.program.programId
    );

    const redeemerTokenAccount = await getAssociatedTokenAddress(
      shareMint,
      this.wallet.publicKey
    );

    // Get arena escrow PDA
    const arena = await this.getArena(arenaPDA);
    if (!arena) {
      throw new Error("Arena not found");
    }

    if (!arena.resolved) {
      throw new Error("Arena not resolved yet");
    }

    const [arenaEscrow] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("arena"),
        arena.creator.toBuffer(),
        Buffer.from(arena.title),
      ],
      this.program.programId
    );

    const signature = await this.program.methods
      .redeemShares(outcomeIndex, new BN(amount))
      .accounts({
        arena: arenaPDA,
        outcomeShare,
        shareMint,
        shareBalance,
        redeemerTokenAccount,
        redeemer: this.wallet.publicKey,
        arenaEscrow,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return signature;
  }

  /**
   * Get outcome share data
   */
  async getOutcomeShare(
    arenaPDA: PublicKey,
    outcomeIndex: number
  ): Promise<any | null> {
    try {
      const [outcomeShare] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("outcome_share"),
          arenaPDA.toBuffer(),
          Buffer.from([outcomeIndex]),
        ],
        this.program.programId
      );

      // @ts-ignore - Account namespace may not exist if accounts array is empty
      const data = await this.program.account.outcomeShare?.fetch(outcomeShare);
      return data;
    } catch (error) {
      console.error("Error fetching outcome share:", error);
      return null;
    }
  }

  /**
   * Get user's share balance
   */
  async getShareBalance(
    arenaPDA: PublicKey,
    outcomeIndex: number
  ): Promise<any | null> {
    if (!this.wallet.publicKey) {
      return null;
    }

    try {
      const [outcomeShare] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("outcome_share"),
          arenaPDA.toBuffer(),
          Buffer.from([outcomeIndex]),
        ],
        this.program.programId
      );

      const [shareBalance] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("share_balance"),
          outcomeShare.toBuffer(),
          this.wallet.publicKey.toBuffer(),
        ],
        this.program.programId
      );

      // @ts-ignore - Account namespace may not exist if accounts array is empty
      const data = await this.program.account.shareBalance?.fetch(shareBalance);
      return data;
    } catch (error) {
      // User doesn't have a share balance yet
      return null;
    }
  }

  // ========== AMM POOL METHODS ==========

  /**
   * Get AMM Pool PDA
   */
  getPoolPDA(arenaPDA: PublicKey, outcomeIndex: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("amm_pool"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );
  }

  /**
   * Get Liquidity Position PDA
   */
  getLiquidityPositionPDA(poolPDA: PublicKey, provider: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("liquidity_position"),
        poolPDA.toBuffer(),
        provider.toBuffer(),
      ],
      this.program.programId
    );
  }

  /**
   * Initialize an AMM pool for an outcome
   */
  async initializePool(
    arenaPDA: PublicKey,
    outcomeIndex: number,
    feeBps: number = 30, // 0.3% default
    protocolFeeBps: number = 10 // 0.1% default
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const arena = await this.getArena(arenaPDA);
    if (!arena) {
      throw new Error("Arena not found");
    }

    // Derive PDAs
    const [outcomeShare] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("outcome_share"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const [pool] = this.getPoolPDA(arenaPDA, outcomeIndex);
    const [lpTokenMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("lp_token"),
        pool.toBuffer(),
      ],
      this.program.programId
    );

    const [shareMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_mint"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const [poolTokenVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool_token_vault"),
        pool.toBuffer(),
      ],
      this.program.programId
    );

    const signature = await this.program.methods
      .initializePool(outcomeIndex, feeBps, protocolFeeBps)
      .accounts({
        arena: arenaPDA,
        outcomeShare,
        pool,
        lpTokenMint,
        shareMint,
        poolTokenVault,
        creator: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return signature;
  }

  /**
   * Add liquidity to an AMM pool
   */
  async addLiquidity(
    arenaPDA: PublicKey,
    outcomeIndex: number,
    tokenAmount: number, // in lamports
    solAmount: number, // in lamports
    minLpTokens: number = 0 // slippage protection
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Derive PDAs
    const [pool] = this.getPoolPDA(arenaPDA, outcomeIndex);
    const [lpTokenMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("lp_token"),
        pool.toBuffer(),
      ],
      this.program.programId
    );

    const [poolTokenVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool_token_vault"),
        pool.toBuffer(),
      ],
      this.program.programId
    );

    const [shareMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_mint"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const providerTokenAccount = await getAssociatedTokenAddress(
      shareMint,
      this.wallet.publicKey
    );

    const providerLpTokenAccount = await getAssociatedTokenAddress(
      lpTokenMint,
      this.wallet.publicKey
    );

    const [liquidityPosition] = this.getLiquidityPositionPDA(pool, this.wallet.publicKey);

    const [poolSolVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool_sol_vault"),
        pool.toBuffer(),
      ],
      this.program.programId
    );

    const signature = await this.program.methods
      .addLiquidity(new BN(tokenAmount), new BN(solAmount), new BN(minLpTokens))
      .accounts({
        arena: arenaPDA,
        pool,
        lpTokenMint,
        poolTokenVault,
        providerTokenAccount,
        providerLpTokenAccount,
        liquidityPosition,
        provider: this.wallet.publicKey,
        poolSolVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return signature;
  }

  /**
   * Remove liquidity from an AMM pool
   */
  async removeLiquidity(
    arenaPDA: PublicKey,
    outcomeIndex: number,
    lpTokensToBurn: number, // in lamports
    minTokenAmount: number = 0, // slippage protection
    minSolAmount: number = 0 // slippage protection
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Derive PDAs
    const [pool] = this.getPoolPDA(arenaPDA, outcomeIndex);
    const [lpTokenMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("lp_token"),
        pool.toBuffer(),
      ],
      this.program.programId
    );

    const [poolTokenVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool_token_vault"),
        pool.toBuffer(),
      ],
      this.program.programId
    );

    const [shareMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_mint"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const providerTokenAccount = await getAssociatedTokenAddress(
      shareMint,
      this.wallet.publicKey
    );

    const providerLpTokenAccount = await getAssociatedTokenAddress(
      lpTokenMint,
      this.wallet.publicKey
    );

    const [liquidityPosition] = this.getLiquidityPositionPDA(pool, this.wallet.publicKey);

    const [poolSolVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool_sol_vault"),
        pool.toBuffer(),
      ],
      this.program.programId
    );

    const signature = await this.program.methods
      .removeLiquidity(new BN(lpTokensToBurn), new BN(minTokenAmount), new BN(minSolAmount))
      .accounts({
        arena: arenaPDA,
        pool,
        lpTokenMint,
        poolTokenVault,
        providerTokenAccount,
        providerLpTokenAccount,
        liquidityPosition,
        provider: this.wallet.publicKey,
        poolSolVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return signature;
  }

  /**
   * Swap tokens using the AMM pool
   */
  async swap(
    arenaPDA: PublicKey,
    outcomeIndex: number,
    amountIn: number, // in lamports
    minAmountOut: number, // slippage protection
    isTokenToSol: boolean // true = token -> SOL, false = SOL -> token
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Derive PDAs
    const [pool] = this.getPoolPDA(arenaPDA, outcomeIndex);
    const [poolTokenVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool_token_vault"),
        pool.toBuffer(),
      ],
      this.program.programId
    );

    const [shareMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_mint"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      shareMint,
      this.wallet.publicKey
    );

    const [poolSolVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool_sol_vault"),
        pool.toBuffer(),
      ],
      this.program.programId
    );

    // Protocol fee recipient (can be set to a specific address or pool for now)
    const protocolFeeRecipient = poolSolVault; // For now, fees stay in pool

    const signature = await this.program.methods
      .swap(new BN(amountIn), new BN(minAmountOut), isTokenToSol)
      .accounts({
        arena: arenaPDA,
        pool,
        poolTokenVault,
        userTokenAccount,
        user: this.wallet.publicKey,
        poolSolVault,
        protocolFeeRecipient,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return signature;
  }

  /**
   * Get AMM pool data
   */
  async getPool(
    arenaPDA: PublicKey,
    outcomeIndex: number
  ): Promise<any | null> {
    try {
      const [pool] = this.getPoolPDA(arenaPDA, outcomeIndex);
      // @ts-ignore - Account namespace may not exist if accounts array is empty
      const data = await this.program.account.ammPool?.fetch(pool);
      return data;
    } catch (error) {
      console.error("Error fetching pool:", error);
      return null;
    }
  }

  /**
   * Get user's liquidity position
   */
  async getLiquidityPosition(
    arenaPDA: PublicKey,
    outcomeIndex: number
  ): Promise<any | null> {
    if (!this.wallet.publicKey) {
      return null;
    }

    try {
      const [pool] = this.getPoolPDA(arenaPDA, outcomeIndex);
      const [liquidityPosition] = this.getLiquidityPositionPDA(pool, this.wallet.publicKey);
      // @ts-ignore - Account namespace may not exist if accounts array is empty
      const data = await this.program.account.liquidityPosition?.fetch(liquidityPosition);
      return data;
    } catch (error) {
      // User doesn't have a liquidity position yet
      return null;
    }
  }

  // ========== ORDER BOOK METHODS ==========

  /**
   * Get Order Book PDA
   */
  getOrderBookPDA(arenaPDA: PublicKey, outcomeIndex: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("order_book"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );
  }

  /**
   * Get Limit Order PDA
   */
  getLimitOrderPDA(arenaPDA: PublicKey, outcomeIndex: number, orderId: number): [PublicKey, number] {
    const orderIdBuffer = Buffer.allocUnsafe(8);
    orderIdBuffer.writeBigUInt64LE(BigInt(orderId), 0);
    
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("limit_order"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
        orderIdBuffer,
      ],
      this.program.programId
    );
  }

  /**
   * Place a limit order
   */
  async placeLimitOrder(
    arenaPDA: PublicKey,
    outcomeIndex: number,
    params: {
      orderType: { limit?: {}; market?: {}; stopLoss?: {}; takeProfit?: {}; twap?: {} };
      side: { buy?: {}; sell?: {} };
      price: number; // in lamports
      size: number; // in lamports
      expiresAt?: number; // Unix timestamp, 0 = no expiration
      stopPrice?: number;
      visibleSize?: number;
      twapInterval?: number;
    }
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Derive PDAs
    const [orderBook] = this.getOrderBookPDA(arenaPDA, outcomeIndex);
    
    // We need to fetch order book to get next_order_id
    let orderBookData;
    try {
      // @ts-ignore - Account namespace may not exist if accounts array is empty
      orderBookData = await this.program.account.orderBook?.fetch(orderBook);
    } catch (error) {
      throw new Error("Order book not initialized. Please initialize it first.");
    }

    const nextOrderId = orderBookData.nextOrderId.toNumber();
    const [limitOrder] = this.getLimitOrderPDA(arenaPDA, outcomeIndex, nextOrderId);

    const [orderEscrow] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("order_escrow"),
        limitOrder.toBuffer(),
      ],
      this.program.programId
    );

    const [shareMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_mint"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const ownerTokenAccount = await getAssociatedTokenAddress(
      shareMint,
      this.wallet.publicKey
    );

    const signature = await this.program.methods
      .placeLimitOrder(
        outcomeIndex,
        {
          orderType: params.orderType,
          side: params.side,
          price: new BN(params.price),
          size: new BN(params.size),
          expiresAt: new BN(params.expiresAt || 0),
          stopPrice: params.stopPrice ? new BN(params.stopPrice) : null,
          visibleSize: params.visibleSize ? new BN(params.visibleSize) : null,
          twapInterval: params.twapInterval ? new BN(params.twapInterval) : null,
        }
      )
      .accounts({
        arena: arenaPDA,
        orderBook,
        limitOrder,
        ownerTokenAccount,
        orderEscrow,
        owner: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return signature;
  }

  /**
   * Cancel a limit order
   */
  async cancelOrder(
    arenaPDA: PublicKey,
    outcomeIndex: number,
    orderId: number
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Derive PDAs
    const [orderBook] = this.getOrderBookPDA(arenaPDA, outcomeIndex);
    const [limitOrder] = this.getLimitOrderPDA(arenaPDA, outcomeIndex, orderId);

    const [orderEscrow] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("order_escrow"),
        limitOrder.toBuffer(),
      ],
      this.program.programId
    );

    const [shareMint] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("share_mint"),
        arenaPDA.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      this.program.programId
    );

    const ownerTokenAccount = await getAssociatedTokenAddress(
      shareMint,
      this.wallet.publicKey
    );

    const signature = await this.program.methods
      .cancelOrder()
      .accounts({
        arena: arenaPDA,
        orderBook,
        limitOrder,
        ownerTokenAccount,
        orderEscrow,
        owner: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return signature;
  }

  /**
   * Get order book data
   */
  async getOrderBook(
    arenaPDA: PublicKey,
    outcomeIndex: number
  ): Promise<any | null> {
    try {
      const [orderBook] = this.getOrderBookPDA(arenaPDA, outcomeIndex);
      // @ts-ignore - Account namespace may not exist if accounts array is empty
      const data = await this.program.account.orderBook?.fetch(orderBook);
      return data;
    } catch (error) {
      console.error("Error fetching order book:", error);
      return null;
    }
  }

  /**
   * Get a specific limit order
   */
  async getLimitOrder(
    arenaPDA: PublicKey,
    outcomeIndex: number,
    orderId: number
  ): Promise<any | null> {
    try {
      const [limitOrder] = this.getLimitOrderPDA(arenaPDA, outcomeIndex, orderId);
      // @ts-ignore - Account namespace may not exist if accounts array is empty
      const data = await this.program.account.limitOrder?.fetch(limitOrder);
      return data;
    } catch (error) {
      console.error("Error fetching limit order:", error);
      return null;
    }
  }

  /**
   * Get user's orders (requires fetching all orders and filtering)
   * Note: This is a helper that would ideally be done via indexer
   */
  async getUserOrders(
    arenaPDA: PublicKey,
    outcomeIndex: number
  ): Promise<any[]> {
    if (!this.wallet.publicKey) {
      return [];
    }

    // This would ideally be done via an indexer
    // For now, we can fetch the order book and try to get orders
    // In production, use an indexer service
    const orderBook = await this.getOrderBook(arenaPDA, outcomeIndex);
    if (!orderBook) {
      return [];
    }

    // Note: This is a simplified version. In production, use an indexer
    // to fetch all orders for a user efficiently
    const orders: any[] = [];
    
    // We would need to iterate through order IDs, but without an indexer
    // this is not efficient. This is a placeholder.
    return orders;
  }
}

