import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAMMPool, calculateSwapOutput, calculatePriceImpact, AMMPoolData } from "./amm";

// ========== SMART ORDER ROUTER SDK ==========

/**
 * Execution venue type
 */
export enum VenueType {
  AMM = "AMM",
  OrderBook = "OrderBook",
}

/**
 * Route for order execution
 */
export interface ExecutionRoute {
  venue: VenueType;
  percentage: number; // Percentage of order to execute on this venue (0-100)
  expectedPrice: number;
  priceImpact: number;
  estimatedOutput: number;
  fees: number;
}

/**
 * Complete routing plan
 */
export interface RoutingPlan {
  routes: ExecutionRoute[];
  totalOutput: number;
  avgPrice: number;
  totalFees: number;
  totalPriceImpact: number;
  estimatedSlippage: number;
}

/**
 * Order book state (simplified)
 */
export interface OrderBookState {
  bestBid: BN;
  bestAsk: BN;
  bidDepth: number; // Total size at best bid
  askDepth: number; // Total size at best ask
  spread: BN;
}

// ========== ROUTING LOGIC ==========

/**
 * Calculate best execution route for an order
 */
export async function calculateBestRoute(
  program: Program,
  arena: PublicKey,
  outcomeIndex: number,
  amountIn: number,
  isBuy: boolean,
  maxSlippage: number = 100 // in basis points (1%)
): Promise<RoutingPlan> {
  // Fetch AMM pool data
  const ammPool = await getAMMPool(program, arena, outcomeIndex);
  
  // Fetch order book data (would need to implement order book data fetching)
  const orderBook = await getOrderBookState(program, arena, outcomeIndex);

  // Calculate AMM route
  const ammRoute = calculateAMMRoute(ammPool, amountIn, isBuy);
  
  // Calculate order book route
  const obRoute = calculateOrderBookRoute(orderBook, amountIn, isBuy);

  // Determine optimal split
  const routes = determineOptimalSplit(ammRoute, obRoute, amountIn, maxSlippage);

  // Calculate totals
  const totalOutput = routes.reduce((sum, r) => sum + r.estimatedOutput, 0);
  const totalFees = routes.reduce((sum, r) => sum + r.fees, 0);
  const weightedPrice = routes.reduce((sum, r) => sum + (r.expectedPrice * r.percentage / 100), 0);
  const totalPriceImpact = routes.reduce((sum, r) => sum + (r.priceImpact * r.percentage / 100), 0);

  return {
    routes,
    totalOutput,
    avgPrice: weightedPrice,
    totalFees,
    totalPriceImpact,
    estimatedSlippage: totalPriceImpact,
  };
}

/**
 * Calculate AMM execution route
 */
function calculateAMMRoute(
  pool: AMMPoolData | null,
  amountIn: number,
  isBuy: boolean
): ExecutionRoute | null {
  if (!pool) return null;

  const [reserveIn, reserveOut] = isBuy 
    ? [pool.solReserve, pool.tokenReserve]
    : [pool.tokenReserve, pool.solReserve];

  const output = calculateSwapOutput(amountIn, reserveIn, reserveOut, pool.feeBps);
  const priceImpact = calculatePriceImpact(amountIn, reserveIn, reserveOut, pool.feeBps);
  const fees = (amountIn * pool.feeBps) / 10000;
  const price = amountIn / output;

  return {
    venue: VenueType.AMM,
    percentage: 0, // Will be set by optimizer
    expectedPrice: price,
    priceImpact,
    estimatedOutput: output,
    fees,
  };
}

/**
 * Calculate order book execution route
 */
function calculateOrderBookRoute(
  orderBook: OrderBookState | null,
  amountIn: number,
  isBuy: boolean
): ExecutionRoute | null {
  if (!orderBook) return null;

  const price = isBuy 
    ? orderBook.bestAsk.toNumber()
    : orderBook.bestBid.toNumber();

  const depth = isBuy ? orderBook.askDepth : orderBook.bidDepth;
  
  // Can only fill up to available depth
  const fillableAmount = Math.min(amountIn, depth);
  const output = isBuy 
    ? fillableAmount / price
    : fillableAmount * price;

  // Order book has minimal price impact if within depth
  const priceImpact = fillableAmount < amountIn ? 100 : 10; // 1% if partial, 0.1% if full

  // Assume 0.3% taker fee
  const fees = (fillableAmount * 30) / 10000;

  return {
    venue: VenueType.OrderBook,
    percentage: 0, // Will be set by optimizer
    expectedPrice: price,
    priceImpact,
    estimatedOutput: output,
    fees,
  };
}

/**
 * Determine optimal split between venues
 */
function determineOptimalSplit(
  ammRoute: ExecutionRoute | null,
  obRoute: ExecutionRoute | null,
  totalAmount: number,
  maxSlippage: number
): ExecutionRoute[] {
  const routes: ExecutionRoute[] = [];

  // If only one venue available, use it 100%
  if (!ammRoute && obRoute) {
    return [{ ...obRoute, percentage: 100 }];
  }
  if (ammRoute && !obRoute) {
    return [{ ...ammRoute, percentage: 100 }];
  }
  if (!ammRoute && !obRoute) {
    return [];
  }

  // Both venues available - optimize split
  // Strategy: Use order book first (better price), then AMM for remainder

  // Check if order book can handle full amount with acceptable slippage
  if (obRoute!.priceImpact <= maxSlippage) {
    // Order book is sufficient
    return [{ ...obRoute!, percentage: 100 }];
  }

  // Check if AMM can handle full amount with acceptable slippage
  if (ammRoute!.priceImpact <= maxSlippage) {
    // AMM is sufficient
    return [{ ...ammRoute!, percentage: 100 }];
  }

  // Need to split between both venues
  // Use order book for as much as possible, AMM for remainder
  const obPercentage = Math.min(
    50, // Max 50% to order book for safety
    (obRoute!.estimatedOutput / (obRoute!.estimatedOutput + ammRoute!.estimatedOutput)) * 100
  );
  const ammPercentage = 100 - obPercentage;

  routes.push({
    ...obRoute!,
    percentage: obPercentage,
    estimatedOutput: obRoute!.estimatedOutput * (obPercentage / 100),
    fees: obRoute!.fees * (obPercentage / 100),
  });

  routes.push({
    ...ammRoute!,
    percentage: ammPercentage,
    estimatedOutput: ammRoute!.estimatedOutput * (ammPercentage / 100),
    fees: ammRoute!.fees * (ammPercentage / 100),
  });

  return routes;
}

/**
 * Get order book state (stub - would need actual implementation)
 */
async function getOrderBookState(
  program: Program,
  arena: PublicKey,
  outcomeIndex: number
): Promise<OrderBookState | null> {
  try {
    const [orderBookPda] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from("order_book"),
        arena.toBuffer(),
        Buffer.from([outcomeIndex]),
      ],
      program.programId
    );

    const orderBook = await program.account.orderBook.fetch(orderBookPda);
    
    return {
      bestBid: orderBook.bestBid,
      bestAsk: orderBook.bestAsk,
      bidDepth: 1000000, // Would need to calculate from actual orders
      askDepth: 1000000, // Would need to calculate from actual orders
      spread: orderBook.spread,
    };
  } catch (error) {
    return null;
  }
}

// ========== EXECUTION ==========

/**
 * Execute a routing plan
 */
export async function executeRoutingPlan(
  program: Program,
  arena: PublicKey,
  outcomeIndex: number,
  plan: RoutingPlan,
  user: PublicKey,
  isBuy: boolean
): Promise<string[]> {
  const txs: string[] = [];

  for (const route of plan.routes) {
    if (route.percentage === 0) continue;

    if (route.venue === VenueType.AMM) {
      // Execute on AMM
      const { swap } = await import("./amm");
      const amountIn = Math.floor((route.percentage / 100) * route.estimatedOutput);
      
      const tx = await swap({
        program,
        arena,
        outcomeIndex,
        amountIn,
        minAmountOut: Math.floor(route.estimatedOutput * 0.99), // 1% slippage tolerance
        isTokenToSol: !isBuy,
        user,
        protocolFeeRecipient: user, // Would be actual protocol address
      });
      
      txs.push(tx);
    } else {
      // Execute on order book
      // Would need to implement order book execution
      console.log("Order book execution not yet implemented");
    }
  }

  return txs;
}

// ========== PRICE COMPARISON ==========

/**
 * Compare prices across venues
 */
export interface PriceComparison {
  ammPrice: number | null;
  orderBookPrice: number | null;
  bestPrice: number;
  bestVenue: VenueType;
  priceDifference: number; // in basis points
}

export async function comparePrices(
  program: Program,
  arena: PublicKey,
  outcomeIndex: number,
  isBuy: boolean
): Promise<PriceComparison> {
  const ammPool = await getAMMPool(program, arena, outcomeIndex);
  const orderBook = await getOrderBookState(program, arena, outcomeIndex);

  const ammPrice = ammPool 
    ? ammPool.solReserve.toNumber() / ammPool.tokenReserve.toNumber()
    : null;

  const obPrice = orderBook
    ? (isBuy ? orderBook.bestAsk.toNumber() : orderBook.bestBid.toNumber())
    : null;

  let bestPrice: number;
  let bestVenue: VenueType;

  if (ammPrice && obPrice) {
    if (isBuy) {
      bestPrice = Math.min(ammPrice, obPrice);
      bestVenue = ammPrice < obPrice ? VenueType.AMM : VenueType.OrderBook;
    } else {
      bestPrice = Math.max(ammPrice, obPrice);
      bestVenue = ammPrice > obPrice ? VenueType.AMM : VenueType.OrderBook;
    }
  } else if (ammPrice) {
    bestPrice = ammPrice;
    bestVenue = VenueType.AMM;
  } else if (obPrice) {
    bestPrice = obPrice;
    bestVenue = VenueType.OrderBook;
  } else {
    bestPrice = 0;
    bestVenue = VenueType.AMM;
  }

  const priceDifference = ammPrice && obPrice
    ? Math.abs((ammPrice - obPrice) / bestPrice) * 10000
    : 0;

  return {
    ammPrice,
    orderBookPrice: obPrice,
    bestPrice,
    bestVenue,
    priceDifference,
  };
}

// ========== FORMATTING ==========

/**
 * Format routing plan for display
 */
export function formatRoutingPlan(plan: RoutingPlan): string {
  let output = "Execution Plan:\n";
  
  for (const route of plan.routes) {
    output += `  ${route.venue}: ${route.percentage}% @ ${route.expectedPrice.toFixed(6)} SOL\n`;
    output += `    Output: ${route.estimatedOutput.toFixed(4)}, Impact: ${(route.priceImpact / 100).toFixed(2)}%\n`;
  }
  
  output += `\nTotal Output: ${plan.totalOutput.toFixed(4)}\n`;
  output += `Avg Price: ${plan.avgPrice.toFixed(6)} SOL\n`;
  output += `Total Fees: ${plan.totalFees.toFixed(4)} SOL\n`;
  output += `Est. Slippage: ${(plan.estimatedSlippage / 100).toFixed(2)}%\n`;
  
  return output;
}

// ========== EXPORTS ==========

export default {
  calculateBestRoute,
  executeRoutingPlan,
  comparePrices,
  formatRoutingPlan,
};

