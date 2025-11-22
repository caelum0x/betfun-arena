'use client';

import { useMemo } from 'react';

export interface OrderLevel {
  price: number;
  volume: number;
  count: number;
}

export interface OrderBookData {
  bids: OrderLevel[];
  asks: OrderLevel[];
}

interface OrderBookDepthProps {
  data: OrderBookData;
  height?: number;
}

export function OrderBookDepth({ data, height = 400 }: OrderBookDepthProps) {
  const { bids, asks } = data;

  // Calculate cumulative volumes
  const processedBids = useMemo(() => {
    let cumulative = 0;
    return bids.map(level => {
      cumulative += level.volume;
      return { ...level, cumulative };
    });
  }, [bids]);

  const processedAsks = useMemo(() => {
    let cumulative = 0;
    return asks.map(level => {
      cumulative += level.volume;
      return { ...level, cumulative };
    });
  }, [asks]);

  const maxCumulative = Math.max(
    processedBids[processedBids.length - 1]?.cumulative || 0,
    processedAsks[processedAsks.length - 1]?.cumulative || 0
  );

  return (
    <div className="bg-gray-900 rounded-lg p-4" style={{ height }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Order Book</h3>
        <div className="flex gap-4 text-sm">
          <span className="text-green-500">
            Bid: {bids[0]?.price.toFixed(2) || '--'}
          </span>
          <span className="text-red-500">
            Ask: {asks[0]?.price.toFixed(2) || '--'}
          </span>
          <span className="text-gray-400">
            Spread: {asks[0] && bids[0] ? (asks[0].price - bids[0].price).toFixed(2) : '--'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4" style={{ height: height - 60 }}>
        {/* Bids (Buy Orders) */}
        <div className="overflow-y-auto">
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-2 sticky top-0 bg-gray-900 py-2">
            <div>Price</div>
            <div className="text-right">Volume</div>
            <div className="text-right">Total</div>
          </div>
          <div className="space-y-1">
            {processedBids.map((level, i) => (
              <div
                key={i}
                className="grid grid-cols-3 gap-2 text-sm relative py-1 px-2 rounded"
              >
                <div
                  className="absolute inset-0 bg-green-500/10"
                  style={{
                    width: `${(level.cumulative / maxCumulative) * 100}%`,
                  }}
                />
                <div className="relative z-10 text-green-500">
                  {level.price.toFixed(2)}
                </div>
                <div className="relative z-10 text-right">
                  {level.volume.toFixed(2)}
                </div>
                <div className="relative z-10 text-right text-gray-400">
                  {level.cumulative.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Asks (Sell Orders) */}
        <div className="overflow-y-auto">
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-2 sticky top-0 bg-gray-900 py-2">
            <div>Price</div>
            <div className="text-right">Volume</div>
            <div className="text-right">Total</div>
          </div>
          <div className="space-y-1">
            {processedAsks.map((level, i) => (
              <div
                key={i}
                className="grid grid-cols-3 gap-2 text-sm relative py-1 px-2 rounded"
              >
                <div
                  className="absolute inset-0 bg-red-500/10"
                  style={{
                    width: `${(level.cumulative / maxCumulative) * 100}%`,
                  }}
                />
                <div className="relative z-10 text-red-500">
                  {level.price.toFixed(2)}
                </div>
                <div className="relative z-10 text-right">
                  {level.volume.toFixed(2)}
                </div>
                <div className="relative z-10 text-right text-gray-400">
                  {level.cumulative.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate sample order book data
export function generateSampleOrderBook(): OrderBookData {
  const midPrice = 50;
  const bids: OrderLevel[] = [];
  const asks: OrderLevel[] = [];

  // Generate bids (descending prices)
  for (let i = 0; i < 20; i++) {
    bids.push({
      price: midPrice - (i * 0.1) - 0.1,
      volume: Math.random() * 100 + 10,
      count: Math.floor(Math.random() * 10) + 1,
    });
  }

  // Generate asks (ascending prices)
  for (let i = 0; i < 20; i++) {
    asks.push({
      price: midPrice + (i * 0.1) + 0.1,
      volume: Math.random() * 100 + 10,
      count: Math.floor(Math.random() * 10) + 1,
    });
  }

  return { bids, asks };
}

