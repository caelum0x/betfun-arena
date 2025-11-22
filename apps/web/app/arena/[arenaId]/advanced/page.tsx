'use client';

import { use } from 'react';
import { TradingViewChart, generateSampleChartData } from '@/components/charts/TradingViewChart';
import { OrderBookDepth, generateSampleOrderBook } from '@/components/charts/OrderBookDepth';
import { useArenaUpdates } from '@/hooks/useWebSocket';

export default function AdvancedArenaPage({
  params,
}: {
  params: Promise<{ arenaId: string }>;
}) {
  const { arenaId } = use(params);
  
  // Real-time data
  const { arenaData, recentBets } = useArenaUpdates(arenaId);
  
  // Sample data for now
  const chartData = generateSampleChartData(100);
  const orderBookData = generateSampleOrderBook();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Advanced Trading View</h1>
        <p className="text-gray-400">Arena: {arenaId}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Price Chart</h2>
            <TradingViewChart data={chartData} height={500} />
          </div>

          {/* Recent Trades */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Recent Trades</h2>
            <div className="space-y-2">
              {recentBets.map((bet, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800">
                  <div className="flex items-center gap-4">
                    <span className={bet.outcome === 0 ? 'text-green-500' : 'text-red-500'}>
                      {bet.outcome === 0 ? 'YES' : 'NO'}
                    </span>
                    <span className="text-sm text-gray-400">
                      {bet.wallet.slice(0, 6)}...{bet.wallet.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>{(bet.amount / 1e9).toFixed(4)} SOL</span>
                    <span className="text-xs text-gray-500">
                      {new Date(bet.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {recentBets.length === 0 && (
                <p className="text-center text-gray-500 py-8">No recent trades</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Arena Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Pot</span>
                <span className="font-semibold">
                  {arenaData ? (arenaData.pot / 1e9).toFixed(2) : '--'} SOL
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Participants</span>
                <span className="font-semibold">{arenaData?.participantsCount || '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Volume (24h)</span>
                <span className="font-semibold">--</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Liquidity</span>
                <span className="font-semibold">--</span>
              </div>
            </div>
          </div>

          {/* Order Book */}
          <OrderBookDepth data={orderBookData} height={600} />

          {/* Market Info */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Market Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Entry Fee</span>
                <span>-- SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Platform Fee</span>
                <span>5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Creator Fee</span>
                <span>5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

