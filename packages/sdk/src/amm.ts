import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";

// ========== AMM POOL SDK ==========

/**
 * Get AMMPool PDA
 */
export function getAMMPoolPda(
  arena: PublicKey,
  outcomeIndex: number,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("amm_pool"),
      arena.toBuffer(),
      Buffer.from([outcomeIndex]),
    ],
    programId
  );
}

/**
 * Get LP Token Mint PDA
 */
export function getLPTokenMintPda(
  pool: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("lp_token"),
      pool.toBuffer(),
    ],
    programId
  );
}

/**
 * Get Pool Token Vault PDA
 */
export function getPoolTokenVaultPda(
  pool: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_token_vault"),
      pool.toBuffer(),
    ],
    programId
  );
}

/**
 * Get Pool SOL Vault PDA
 */
export function getPoolSOLVaultPda(
  pool: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_sol_vault"),
      pool.toBuffer(),
    ],
    programId
  );
}

/**
 * Get Liquidity Position PDA
 */
export function getLiquidityPositionPda(
  pool: PublicKey,
  provider: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("liquidity_position"),
      pool.toBuffer(),
      provider.toBuffer(),
    ],
    programId
  );
}

// ========== INITIALIZE POOL ==========

export interface InitializePoolParams {
  program: Program;
  arena: PublicKey;
  outcomeIndex: number;
  feeBps: number; // e.g., 30 = 0.3%
  protocolFeeBps: number; // e.g., 10 = 0.1%
  creator: PublicKey;
}

export async function initializePool(
  params: InitializePoolParams
): Promise<string> {
  const { program, arena, outcomeIndex, feeBps, protocolFeeBps, creator } = params;

  // Derive PDAs
  const [pool] = getAMMPoolPda(arena, outcomeIndex, program.programId);
  const [lpTokenMint] = getLPTokenMintPda(pool, program.programId);
  const [poolTokenVault] = getPoolTokenVaultPda(pool, program.programId);
  
  // Get outcome share
  const [outcomeShare] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("outcome_share"),
      arena.toBuffer(),
      Buffer.from([outcomeIndex]),
    ],
    program.programId
  );

  // Build transaction
  const tx = await program.methods
    .initializePool(outcomeIndex, feeBps, protocolFeeBps)
    .accounts({
      arena,
      outcomeShare,
      pool,
      lpTokenMint,
      poolTokenVault,
      creator,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  return tx;
}

// ========== ADD LIQUIDITY ==========

export interface AddLiquidityParams {
  program: Program;
  arena: PublicKey;
  outcomeIndex: number;
  tokenAmount: number;
  solAmount: number;
  minLpTokens: number;
  provider: PublicKey;
}

export async function addLiquidity(
  params: AddLiquidityParams
): Promise<string> {
  const { program, arena, outcomeIndex, tokenAmount, solAmount, minLpTokens, provider } = params;

  // Convert to BN
  const tokenAmountBN = new BN(tokenAmount);
  const solAmountBN = new BN(solAmount);
  const minLpTokensBN = new BN(minLpTokens);

  // Derive PDAs
  const [pool] = getAMMPoolPda(arena, outcomeIndex, program.programId);
  const [lpTokenMint] = getLPTokenMintPda(pool, program.programId);
  const [poolTokenVault] = getPoolTokenVaultPda(pool, program.programId);
  const [poolSOLVault] = getPoolSOLVaultPda(pool, program.programId);
  const [liquidityPosition] = getLiquidityPositionPda(pool, provider, program.programId);

  // Get pool data to find share mint
  const poolData = await program.account.ammPool.fetch(pool);
  
  // Get provider's token account
  const providerTokenAccount = await getAssociatedTokenAddress(
    poolData.shareMint,
    provider
  );

  // Get provider's LP token account
  const providerLpTokenAccount = await getAssociatedTokenAddress(
    lpTokenMint,
    provider
  );

  // Build transaction
  const tx = await program.methods
    .addLiquidity(tokenAmountBN, solAmountBN, minLpTokensBN)
    .accounts({
      arena,
      pool,
      lpTokenMint,
      poolTokenVault,
      providerTokenAccount,
      providerLpTokenAccount,
      liquidityPosition,
      provider,
      poolSolVault: poolSOLVault,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  return tx;
}

// ========== REMOVE LIQUIDITY ==========

export interface RemoveLiquidityParams {
  program: Program;
  arena: PublicKey;
  outcomeIndex: number;
  lpTokensToBurn: number;
  minTokenAmount: number;
  minSolAmount: number;
  provider: PublicKey;
}

export async function removeLiquidity(
  params: RemoveLiquidityParams
): Promise<string> {
  const { program, arena, outcomeIndex, lpTokensToBurn, minTokenAmount, minSolAmount, provider } = params;

  // Convert to BN
  const lpTokensBN = new BN(lpTokensToBurn);
  const minTokenBN = new BN(minTokenAmount);
  const minSolBN = new BN(minSolAmount);

  // Derive PDAs
  const [pool] = getAMMPoolPda(arena, outcomeIndex, program.programId);
  const [lpTokenMint] = getLPTokenMintPda(pool, program.programId);
  const [poolTokenVault] = getPoolTokenVaultPda(pool, program.programId);
  const [poolSOLVault] = getPoolSOLVaultPda(pool, program.programId);
  const [liquidityPosition] = getLiquidityPositionPda(pool, provider, program.programId);

  // Get pool data
  const poolData = await program.account.ammPool.fetch(pool);
  
  // Get provider's token account
  const providerTokenAccount = await getAssociatedTokenAddress(
    poolData.shareMint,
    provider
  );

  // Get provider's LP token account
  const providerLpTokenAccount = await getAssociatedTokenAddress(
    lpTokenMint,
    provider
  );

  // Build transaction
  const tx = await program.methods
    .removeLiquidity(lpTokensBN, minTokenBN, minSolBN)
    .accounts({
      arena,
      pool,
      lpTokenMint,
      poolTokenVault,
      providerTokenAccount,
      providerLpTokenAccount,
      liquidityPosition,
      provider,
      poolSolVault: poolSOLVault,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// ========== SWAP ==========

export interface SwapParams {
  program: Program;
  arena: PublicKey;
  outcomeIndex: number;
  amountIn: number;
  minAmountOut: number;
  isTokenToSol: boolean;
  user: PublicKey;
  protocolFeeRecipient: PublicKey;
}

export async function swap(
  params: SwapParams
): Promise<string> {
  const { program, arena, outcomeIndex, amountIn, minAmountOut, isTokenToSol, user, protocolFeeRecipient } = params;

  // Convert to BN
  const amountInBN = new BN(amountIn);
  const minAmountOutBN = new BN(minAmountOut);

  // Derive PDAs
  const [pool] = getAMMPoolPda(arena, outcomeIndex, program.programId);
  const [poolTokenVault] = getPoolTokenVaultPda(pool, program.programId);
  const [poolSOLVault] = getPoolSOLVaultPda(pool, program.programId);

  // Get pool data
  const poolData = await program.account.ammPool.fetch(pool);
  
  // Get user's token account
  const userTokenAccount = await getAssociatedTokenAddress(
    poolData.shareMint,
    user
  );

  // Build transaction
  const tx = await program.methods
    .swap(amountInBN, minAmountOutBN, isTokenToSol)
    .accounts({
      arena,
      pool,
      poolTokenVault,
      userTokenAccount,
      user,
      poolSolVault: poolSOLVault,
      protocolFeeRecipient,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// ========== FETCH DATA ==========

export interface AMMPoolData {
  arena: PublicKey;
  outcomeIndex: number;
  shareMint: PublicKey;
  tokenReserve: BN;
  solReserve: BN;
  k: BN;
  lpTokenMint: PublicKey;
  totalLpTokens: BN;
  feeBps: number;
  protocolFeeBps: number;
  feesCollected: BN;
  volume24h: BN;
  swapCount: BN;
  lastSwapAt: BN;
  lastPrice: BN;
  price24hAgo: BN;
  bump: number;
}

export async function getAMMPool(
  program: Program,
  arena: PublicKey,
  outcomeIndex: number
): Promise<AMMPoolData | null> {
  const [poolPda] = getAMMPoolPda(arena, outcomeIndex, program.programId);
  
  try {
    const data = await program.account.ammPool.fetch(poolPda);
    return data as AMMPoolData;
  } catch (error) {
    return null;
  }
}

export interface LiquidityPositionData {
  pool: PublicKey;
  provider: PublicKey;
  lpTokens: BN;
  tokensDeposited: BN;
  solDeposited: BN;
  createdAt: BN;
  feesEarned: BN;
  bump: number;
}

export async function getLiquidityPosition(
  program: Program,
  pool: PublicKey,
  provider: PublicKey
): Promise<LiquidityPositionData | null> {
  const [positionPda] = getLiquidityPositionPda(pool, provider, program.programId);
  
  try {
    const data = await program.account.liquidityPosition.fetch(positionPda);
    return data as LiquidityPositionData;
  } catch (error) {
    return null;
  }
}

// ========== CALCULATIONS ==========

/**
 * Calculate output amount for a swap (constant product formula)
 */
export function calculateSwapOutput(
  amountIn: number,
  reserveIn: BN,
  reserveOut: BN,
  feeBps: number
): number {
  const amountInWithFee = (amountIn * (10000 - feeBps)) / 10000;
  const numerator = amountInWithFee * reserveOut.toNumber();
  const denominator = reserveIn.toNumber() + amountInWithFee;
  return Math.floor(numerator / denominator);
}

/**
 * Calculate price impact for a swap (in basis points)
 */
export function calculatePriceImpact(
  amountIn: number,
  reserveIn: BN,
  reserveOut: BN,
  feeBps: number
): number {
  const currentPrice = reserveOut.toNumber() / reserveIn.toNumber();
  const amountOut = calculateSwapOutput(amountIn, reserveIn, reserveOut, feeBps);
  
  const newReserveIn = reserveIn.toNumber() + amountIn;
  const newReserveOut = reserveOut.toNumber() - amountOut;
  const newPrice = newReserveOut / newReserveIn;
  
  const priceChange = Math.abs(newPrice - currentPrice) / currentPrice;
  return Math.floor(priceChange * 10000); // Convert to basis points
}

/**
 * Calculate LP tokens to receive when adding liquidity
 */
export function calculateLPTokens(
  tokenAmount: number,
  solAmount: number,
  tokenReserve: BN,
  solReserve: BN,
  totalLpTokens: BN
): number {
  if (totalLpTokens.isZero()) {
    // First liquidity provider
    return Math.floor(Math.sqrt(tokenAmount * solAmount));
  } else {
    // Subsequent providers
    const lpFromTokens = (totalLpTokens.toNumber() * tokenAmount) / tokenReserve.toNumber();
    const lpFromSol = (totalLpTokens.toNumber() * solAmount) / solReserve.toNumber();
    return Math.floor(Math.min(lpFromTokens, lpFromSol));
  }
}

/**
 * Calculate amounts to receive when removing liquidity
 */
export function calculateWithdrawAmounts(
  lpTokens: number,
  tokenReserve: BN,
  solReserve: BN,
  totalLpTokens: BN
): { tokenAmount: number; solAmount: number } {
  const tokenAmount = Math.floor((tokenReserve.toNumber() * lpTokens) / totalLpTokens.toNumber());
  const solAmount = Math.floor((solReserve.toNumber() * lpTokens) / totalLpTokens.toNumber());
  return { tokenAmount, solAmount };
}

/**
 * Calculate current pool price (SOL per token)
 */
export function calculatePoolPrice(pool: AMMPoolData): number {
  if (pool.tokenReserve.isZero()) return 0;
  return pool.solReserve.toNumber() / pool.tokenReserve.toNumber();
}

/**
 * Calculate 24h price change percentage
 */
export function calculatePriceChange24h(pool: AMMPoolData): number {
  if (pool.price24hAgo.isZero()) return 0;
  const change = pool.lastPrice.toNumber() - pool.price24hAgo.toNumber();
  return (change * 100) / pool.price24hAgo.toNumber();
}

/**
 * Calculate impermanent loss for a position
 */
export function calculateImpermanentLoss(
  position: LiquidityPositionData,
  pool: AMMPoolData
): number {
  const { tokenAmount, solAmount } = calculateWithdrawAmounts(
    position.lpTokens.toNumber(),
    pool.tokenReserve,
    pool.solReserve,
    pool.totalLpTokens
  );
  
  const currentPrice = calculatePoolPrice(pool);
  const currentValue = solAmount + (tokenAmount * currentPrice);
  
  const initialPrice = position.solDeposited.toNumber() / position.tokensDeposited.toNumber();
  const initialValue = position.solDeposited.toNumber() + (position.tokensDeposited.toNumber() * currentPrice);
  
  return ((currentValue - initialValue) / initialValue) * 100;
}

/**
 * Calculate total fees earned by a position
 */
export function calculateFeesEarned(
  position: LiquidityPositionData,
  pool: AMMPoolData
): number {
  const { tokenAmount, solAmount } = calculateWithdrawAmounts(
    position.lpTokens.toNumber(),
    pool.tokenReserve,
    pool.solReserve,
    pool.totalLpTokens
  );
  
  const tokenGain = tokenAmount - position.tokensDeposited.toNumber();
  const solGain = solAmount - position.solDeposited.toNumber();
  
  return solGain + (tokenGain * calculatePoolPrice(pool));
}

/**
 * Format liquidity value in SOL
 */
export function formatLiquidityValue(tokenAmount: number, solAmount: number, price: number): string {
  const totalValue = solAmount + (tokenAmount * price);
  return (totalValue / 1e9).toFixed(4) + " SOL";
}

/**
 * Format APR percentage
 */
export function formatAPR(feesEarned: number, invested: number, days: number): string {
  if (invested === 0 || days === 0) return "0.00%";
  const dailyReturn = feesEarned / invested / days;
  const apr = dailyReturn * 365 * 100;
  return apr.toFixed(2) + "%";
}

// ========== EXPORTS ==========

export default {
  // PDAs
  getAMMPoolPda,
  getLPTokenMintPda,
  getPoolTokenVaultPda,
  getPoolSOLVaultPda,
  getLiquidityPositionPda,
  
  // Instructions
  initializePool,
  addLiquidity,
  removeLiquidity,
  swap,
  
  // Fetch
  getAMMPool,
  getLiquidityPosition,
  
  // Calculations
  calculateSwapOutput,
  calculatePriceImpact,
  calculateLPTokens,
  calculateWithdrawAmounts,
  calculatePoolPrice,
  calculatePriceChange24h,
  calculateImpermanentLoss,
  calculateFeesEarned,
  
  // Formatting
  formatLiquidityValue,
  formatAPR,
};

