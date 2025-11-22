import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";

// ========== SHARE TOKEN SDK ==========

/**
 * Get OutcomeShare PDA
 */
export function getOutcomeSharePda(
  arena: PublicKey,
  outcomeIndex: number,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("outcome_share"),
      arena.toBuffer(),
      Buffer.from([outcomeIndex]),
    ],
    programId
  );
}

/**
 * Get ShareMint PDA
 */
export function getShareMintPda(
  arena: PublicKey,
  outcomeIndex: number,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("share_mint"),
      arena.toBuffer(),
      Buffer.from([outcomeIndex]),
    ],
    programId
  );
}

/**
 * Get ShareBalance PDA
 */
export function getShareBalancePda(
  outcomeShare: PublicKey,
  owner: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("share_balance"),
      outcomeShare.toBuffer(),
      owner.toBuffer(),
    ],
    programId
  );
}

/**
 * Get Arena PDA
 */
export function getArenaPda(
  creator: PublicKey,
  title: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("arena"),
      creator.toBuffer(),
      Buffer.from(title),
    ],
    programId
  );
}

// ========== CREATE SHARE TOKENS ==========

export interface CreateShareTokensParams {
  program: Program;
  arena: PublicKey;
  outcomeIndex: number;
  initialPrice: number; // in SOL
  creator: PublicKey;
}

export async function createShareTokens(
  params: CreateShareTokensParams
): Promise<string> {
  const { program, arena, outcomeIndex, initialPrice, creator } = params;

  // Convert SOL to lamports
  const initialPriceLamports = new BN(initialPrice * 1e9);

  // Derive PDAs
  const [outcomeShare] = getOutcomeSharePda(arena, outcomeIndex, program.programId);
  const [shareMint] = getShareMintPda(arena, outcomeIndex, program.programId);

  // Build transaction
  const tx = await program.methods
    .createShareTokens(outcomeIndex, initialPriceLamports)
    .accounts({
      arena,
      creator,
      outcomeShare,
      shareMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  return tx;
}

// ========== BUY SHARES ==========

export interface BuySharesParams {
  program: Program;
  arena: PublicKey;
  outcomeIndex: number;
  amount: number; // number of shares
  buyer: PublicKey;
}

export async function buyShares(
  params: BuySharesParams
): Promise<string> {
  const { program, arena, outcomeIndex, amount, buyer } = params;

  // Convert to BN
  const amountBN = new BN(amount);

  // Derive PDAs
  const [outcomeShare] = getOutcomeSharePda(arena, outcomeIndex, program.programId);
  const [shareMint] = getShareMintPda(arena, outcomeIndex, program.programId);
  const [shareBalance] = getShareBalancePda(outcomeShare, buyer, program.programId);

  // Get associated token account
  const buyerTokenAccount = await getAssociatedTokenAddress(
    shareMint,
    buyer
  );

  // Build transaction
  const tx = await program.methods
    .buyShares(amountBN)
    .accounts({
      arena,
      outcomeShare,
      shareMint,
      shareBalance,
      buyerTokenAccount,
      buyer,
      arenaEscrow: arena, // Arena PDA is the escrow
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  return tx;
}

// ========== SELL SHARES ==========

export interface SellSharesParams {
  program: Program;
  arena: PublicKey;
  outcomeIndex: number;
  amount: number; // number of shares
  seller: PublicKey;
}

export async function sellShares(
  params: SellSharesParams
): Promise<string> {
  const { program, arena, outcomeIndex, amount, seller } = params;

  // Convert to BN
  const amountBN = new BN(amount);

  // Derive PDAs
  const [outcomeShare] = getOutcomeSharePda(arena, outcomeIndex, program.programId);
  const [shareMint] = getShareMintPda(arena, outcomeIndex, program.programId);
  const [shareBalance] = getShareBalancePda(outcomeShare, seller, program.programId);

  // Get associated token account
  const sellerTokenAccount = await getAssociatedTokenAddress(
    shareMint,
    seller
  );

  // Build transaction
  const tx = await program.methods
    .sellShares(amountBN)
    .accounts({
      arena,
      outcomeShare,
      shareMint,
      shareBalance,
      sellerTokenAccount,
      seller,
      arenaEscrow: arena,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// ========== REDEEM SHARES ==========

export interface RedeemSharesParams {
  program: Program;
  arena: PublicKey;
  outcomeIndex: number;
  amount: number; // number of shares
  redeemer: PublicKey;
}

export async function redeemShares(
  params: RedeemSharesParams
): Promise<string> {
  const { program, arena, outcomeIndex, amount, redeemer } = params;

  // Convert to BN
  const amountBN = new BN(amount);

  // Derive PDAs
  const [outcomeShare] = getOutcomeSharePda(arena, outcomeIndex, program.programId);
  const [shareMint] = getShareMintPda(arena, outcomeIndex, program.programId);
  const [shareBalance] = getShareBalancePda(outcomeShare, redeemer, program.programId);

  // Get associated token account
  const redeemerTokenAccount = await getAssociatedTokenAddress(
    shareMint,
    redeemer
  );

  // Build transaction
  const tx = await program.methods
    .redeemShares(amountBN)
    .accounts({
      arena,
      outcomeShare,
      shareMint,
      shareBalance,
      redeemerTokenAccount,
      redeemer,
      arenaEscrow: arena,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// ========== FETCH DATA ==========

export interface OutcomeShareData {
  arena: PublicKey;
  outcomeIndex: number;
  tokenMint: PublicKey;
  totalSupply: BN;
  currentPrice: BN;
  volume24h: BN;
  tradeCount: BN;
  lastTradeAt: BN;
  high24h: BN;
  low24h: BN;
  price24hAgo: BN;
  bump: number;
}

export async function getOutcomeShare(
  program: Program,
  arena: PublicKey,
  outcomeIndex: number
): Promise<OutcomeShareData | null> {
  const [outcomeSharePda] = getOutcomeSharePda(arena, outcomeIndex, program.programId);
  
  try {
    const data = await program.account.outcomeShare.fetch(outcomeSharePda);
    return data as OutcomeShareData;
  } catch (error) {
    return null;
  }
}

export interface ShareBalanceData {
  owner: PublicKey;
  outcomeShare: PublicKey;
  balance: BN;
  avgCostBasis: BN;
  totalInvested: BN;
  realizedPnl: BN;
  bump: number;
}

export async function getShareBalance(
  program: Program,
  outcomeShare: PublicKey,
  owner: PublicKey
): Promise<ShareBalanceData | null> {
  const [shareBalancePda] = getShareBalancePda(outcomeShare, owner, program.programId);
  
  try {
    const data = await program.account.shareBalance.fetch(shareBalancePda);
    return data as ShareBalanceData;
  } catch (error) {
    return null;
  }
}

// ========== CALCULATIONS ==========

/**
 * Calculate unrealized P&L
 */
export function calculateUnrealizedPnl(
  balance: BN,
  avgCostBasis: BN,
  currentPrice: BN
): number {
  const currentValue = balance.mul(currentPrice).div(new BN(1e9));
  const cost = balance.mul(avgCostBasis).div(new BN(1e9));
  return currentValue.sub(cost).toNumber() / 1e9; // Convert to SOL
}

/**
 * Calculate total P&L
 */
export function calculateTotalPnl(
  balance: BN,
  avgCostBasis: BN,
  currentPrice: BN,
  realizedPnl: BN
): number {
  const unrealizedPnl = calculateUnrealizedPnl(balance, avgCostBasis, currentPrice);
  return unrealizedPnl + (realizedPnl.toNumber() / 1e9);
}

/**
 * Calculate 24h price change percentage
 */
export function calculatePriceChange24h(
  currentPrice: BN,
  price24hAgo: BN
): number {
  if (price24hAgo.isZero()) return 0;
  
  const change = currentPrice.sub(price24hAgo);
  return (change.toNumber() * 100) / price24hAgo.toNumber();
}

/**
 * Calculate cost to buy shares
 */
export function calculateBuyCost(
  amount: number,
  pricePerShare: BN
): number {
  const amountBN = new BN(amount);
  const cost = amountBN.mul(pricePerShare).div(new BN(1e9));
  return cost.toNumber() / 1e9; // Convert to SOL
}

/**
 * Calculate proceeds from selling shares
 */
export function calculateSellProceeds(
  amount: number,
  pricePerShare: BN
): number {
  return calculateBuyCost(amount, pricePerShare);
}

/**
 * Format price in SOL
 */
export function formatPrice(priceLamports: BN): string {
  return (priceLamports.toNumber() / 1e9).toFixed(4) + " SOL";
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return (value >= 0 ? "+" : "") + value.toFixed(2) + "%";
}

// ========== EXPORTS ==========

export default {
  // PDAs
  getOutcomeSharePda,
  getShareMintPda,
  getShareBalancePda,
  getArenaPda,
  
  // Instructions
  createShareTokens,
  buyShares,
  sellShares,
  redeemShares,
  
  // Fetch
  getOutcomeShare,
  getShareBalance,
  
  // Calculations
  calculateUnrealizedPnl,
  calculateTotalPnl,
  calculatePriceChange24h,
  calculateBuyCost,
  calculateSellProceeds,
  
  // Formatting
  formatPrice,
  formatPercentage,
};

