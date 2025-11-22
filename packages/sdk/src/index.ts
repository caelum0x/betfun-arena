import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
// @ts-ignore - JSON import
import idl from './idl/betfun.json';

// ========== PROGRAM ID ==========
// Deployed program ID on devnet
let PROGRAM_ID: PublicKey;
try {
  const programIdString = process.env.NEXT_PUBLIC_PROGRAM_ID || 'HrS1KpYRWfg9xUom8jnGqoRAayVCxHxukeb18C4WKAkE';
  PROGRAM_ID = new PublicKey(programIdString);
} catch (error) {
  console.warn("⚠️  Invalid PROGRAM_ID, using deployed program ID as fallback");
  PROGRAM_ID = new PublicKey('HrS1KpYRWfg9xUom8jnGqoRAayVCxHxukeb18C4WKAkE');
}
export { PROGRAM_ID };

// ========== CONSTANTS ==========
export const MIN_ENTRY_FEE = 0.001 * LAMPORTS_PER_SOL; // 0.001 SOL
export const MAX_ENTRY_FEE = 10 * LAMPORTS_PER_SOL; // 10 SOL
export const CREATOR_FEE_BPS = 500; // 5%

// ========== PDA DERIVATION ==========

/**
 * Derive Arena PDA
 */
export function getArenaPDA(creator: PublicKey, title: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('arena'),
      creator.toBuffer(),
      Buffer.from(title),
    ],
    PROGRAM_ID
  );
}

/**
 * Derive Participant PDA
 */
export function getParticipantPDA(
  arena: PublicKey, 
  user: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('participant'),
      arena.toBuffer(),
      user.toBuffer(),
    ],
    PROGRAM_ID
  );
}

// ========== TRANSACTION BUILDERS ==========

/**
 * Build Create Arena transaction using Anchor Program
 * Note: Requires the Anchor program to be built and IDL to be available
 */
export async function buildCreateArenaTransaction(
  connection: Connection,
  creator: PublicKey,
  params: {
    title: string;
    description: string;
    question: string;
    outcomes: string[];
    tags?: string[];
    entryFee: number; // in lamports
    endTime: number; // Unix timestamp
    manualResolve?: boolean;
    oracle?: PublicKey;
    tokenMint?: PublicKey;
  }
): Promise<Transaction> {
  // Derive arena PDA
  const [arenaPDA] = getArenaPDA(creator, params.title);
  
  // Create a minimal wallet-like object for AnchorProvider
  // Note: This is a read-only provider, actual signing happens in the wallet
  const wallet = {
    publicKey: creator,
    signTransaction: async (tx: Transaction) => tx,
    signAllTransactions: async (txs: Transaction[]) => txs,
  };
  
  const provider = new AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
  });
  
  // Create program instance with actual IDL
  const program = new Program(idl as any, PROGRAM_ID, provider);
  
  // Build instruction using Anchor's method builder
  // Anchor converts snake_case to camelCase, so create_arena becomes createArena
  const instruction = await program.methods
    .createArena(
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
      creator: creator,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  
  const transaction = new Transaction().add(instruction);
  
  return transaction;
}

/**
 * Minimal IDL structure for create_arena instruction
 * This will be replaced by the actual IDL once the program is built
 * To get the actual IDL:
 * 1. cd packages/anchor
 * 2. anchor build
 * 3. Copy target/idl/betfun.json to packages/sdk/src/idl/betfun.json
 * 4. Import and use it instead of this minimal IDL
 */
function getMinimalIDL(): any {
  return {
    version: "0.1.0",
    name: "betfun",
    instructions: [
      {
        name: "createArena",
        accounts: [
          { name: "arena", isMut: true, isSigner: false },
          { name: "creator", isMut: true, isSigner: true },
          { name: "systemProgram", isMut: false, isSigner: false },
        ],
        args: [
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "question", type: "string" },
          { name: "outcomes", type: { vec: "string" } },
          { name: "tags", type: { vec: "string" } },
          { name: "entryFee", type: "u64" },
          { name: "endTime", type: "i64" },
          { name: "manualResolve", type: "bool" },
          { name: "oracle", type: { option: "publicKey" } },
          { name: "tokenMint", type: { option: "publicKey" } },
        ],
      },
    ],
    accounts: [],
    types: [],
    metadata: {
      address: PROGRAM_ID.toString(),
    },
  };
}

/**
 * Build Join Arena transaction
 */
export async function buildJoinArenaTransaction(
  connection: Connection,
  arena: PublicKey,
  user: PublicKey,
  outcomeChosen: number
): Promise<Transaction> {
  const [participantPDA] = getParticipantPDA(arena, user);
  
  const transaction = new Transaction();
  
  // Add join arena instruction (implement with actual program instruction)
  
  return transaction;
}

/**
 * Build Resolve Arena transaction
 */
export async function buildResolveArenaTransaction(
  connection: Connection,
  arena: PublicKey,
  resolver: PublicKey,
  winnerOutcome: number
): Promise<Transaction> {
  const transaction = new Transaction();
  
  // Add resolve arena instruction
  
  return transaction;
}

/**
 * Build Claim Winnings transaction
 */
export async function buildClaimWinningsTransaction(
  connection: Connection,
  arena: PublicKey,
  user: PublicKey,
  creator: PublicKey
): Promise<Transaction> {
  const [participantPDA] = getParticipantPDA(arena, user);
  
  const transaction = new Transaction();
  
  // Add claim winnings instruction
  
  return transaction;
}

// ========== DATA FETCHING ==========

/**
 * Fetch Arena account data
 */
export async function fetchArena(
  connection: Connection,
  arenaPDA: PublicKey
): Promise<any> {
  const accountInfo = await connection.getAccountInfo(arenaPDA);
  
  if (!accountInfo) {
    throw new Error('Arena account not found');
  }
  
  // TODO: Deserialize account data using Anchor
  // For now, return raw data
  return {
    address: arenaPDA.toBase58(),
    data: accountInfo.data,
    lamports: accountInfo.lamports,
  };
}

/**
 * Fetch Participant account data
 */
export async function fetchParticipant(
  connection: Connection,
  participantPDA: PublicKey
): Promise<any> {
  const accountInfo = await connection.getAccountInfo(participantPDA);
  
  if (!accountInfo) {
    throw new Error('Participant account not found');
  }
  
  return {
    address: participantPDA.toBase58(),
    data: accountInfo.data,
    lamports: accountInfo.lamports,
  };
}

/**
 * Fetch all arenas for a creator
 */
export async function fetchCreatorArenas(
  connection: Connection,
  creator: PublicKey
): Promise<PublicKey[]> {
  // Use getProgramAccounts with filter
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: creator.toBase58(),
        },
      },
    ],
  });
  
  return accounts.map(account => account.pubkey);
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Calculate expected payout for a winner
 */
export function calculatePayout(
  totalPot: number,
  winnerPot: number,
  participantStake: number
): number {
  const creatorFee = Math.floor(totalPot * (CREATOR_FEE_BPS / 10000));
  const distributablePot = totalPot - creatorFee;
  
  if (winnerPot === 0) {
    return participantStake;
  }
  
  return Math.floor((participantStake / winnerPot) * distributablePot);
}

/**
 * Calculate ROI percentage
 */
export function calculateROI(payout: number, stake: number): number {
  const profit = payout - stake;
  return (profit / stake) * 100;
}

/**
 * Validate arena parameters
 */
export function validateArenaParams(params: {
  title: string;
  description: string;
  question: string;
  outcomes: string[];
  entryFee: number;
  endTime: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Title validation
  if (params.title.length < 3 || params.title.length > 80) {
    errors.push('Title must be between 3 and 80 characters');
  }
  
  // Description validation
  if (params.description.length > 280) {
    errors.push('Description must be max 280 characters');
  }
  
  // Question validation
  if (params.question.length < 10 || params.question.length > 200) {
    errors.push('Question must be between 10 and 200 characters');
  }
  
  // Outcomes validation
  if (params.outcomes.length < 2 || params.outcomes.length > 6) {
    errors.push('Must have between 2 and 6 outcomes');
  }
  
  for (const outcome of params.outcomes) {
    if (outcome.length === 0 || outcome.length > 40) {
      errors.push('Each outcome must be between 1 and 40 characters');
    }
  }
  
  // Check for duplicates
  const uniqueOutcomes = new Set(params.outcomes.map(o => o.toLowerCase()));
  if (uniqueOutcomes.size !== params.outcomes.length) {
    errors.push('Outcomes must be unique');
  }
  
  // Entry fee validation
  if (params.entryFee < MIN_ENTRY_FEE || params.entryFee > MAX_ENTRY_FEE) {
    errors.push('Entry fee must be between 0.001 and 10 SOL');
  }
  
  // End time validation
  const now = Date.now() / 1000;
  if (params.endTime <= now) {
    errors.push('End time must be in the future');
  }
  
  const maxDuration = 365 * 24 * 60 * 60; // 1 year
  if (params.endTime > now + maxDuration) {
    errors.push('End time must be within 1 year');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Format SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

// ========== EXPORTS ==========

export {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  BN,
} from '@solana/web3.js';

export type { Provider } from '@coral-xyz/anchor';

// Export client
export { createBetFunClient, BetFunClient } from './client';
export type { Arena, Participant } from './client';

// Export batch utilities
export {
  TransactionBatcher,
  createTransactionBatcher,
  batchJoinArenas,
  batchBuyShares,
} from './batch';
