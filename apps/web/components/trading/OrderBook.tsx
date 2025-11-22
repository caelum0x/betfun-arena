"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, TrendingUp, TrendingDown, X, Loader2, AlertCircle } from "lucide-react";
import { useOrderBook } from "@/hooks/useOrderBook";
import { toast } from "sonner";

interface OrderBookProps {
  arena: string | PublicKey; // Accept string or PublicKey
  outcomeIndex: number;
  outcomeName: string;
}

interface Order {
  orderId: number;
  price: number;
  size: number;
  total: number;
  isOwn: boolean;
}

export function OrderBook({ arena, outcomeIndex, outcomeName }: OrderBookProps) {
  const { publicKey } = useWallet();
  const arenaAddress = typeof arena === "string" ? arena : arena.toString();
  
  const {
    orderBook: orderBookData,
    userOrders,
    loading: dataLoading,
    processing,
    placeLimitOrder,
    cancelOrder,
  } = useOrderBook(arenaAddress, outcomeIndex);
  
  // Place order state
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState("");

  // Process user orders into display format
  const buyOrders: Order[] = [];
  const sellOrders: Order[] = [];
  const myOrders = userOrders || [];

  // Note: In production, you'd fetch all orders from an indexer
  // For now, we show user's orders
  userOrders.forEach((order: any) => {
    const orderData: Order = {
      orderId: order.orderId.toNumber(),
      price: order.price.toNumber() / 1e9,
      size: order.remainingSize.toNumber() / 1e9,
      total: (order.price.toNumber() * order.remainingSize.toNumber()) / 1e18,
      isOwn: true,
    };

    if (order.side?.buy) {
      buyOrders.push(orderData);
    } else if (order.side?.sell) {
      sellOrders.push(orderData);
    }
  });

  // Sort orders
  buyOrders.sort((a, b) => b.price - a.price); // Highest bid first
  sellOrders.sort((a, b) => a.price - b.price); // Lowest ask first

  const handlePlaceOrder = async () => {
    if (!publicKey || !price || !size) {
      toast.error("Please enter price and size");
      return;
    }

    try {
      const priceNum = Math.floor(parseFloat(price) * 1e9);
      const sizeNum = Math.floor(parseFloat(size) * 1e9);

      const signature = await placeLimitOrder({
        orderType: { limit: {} },
        side: orderType === "buy" ? { buy: {} } : { sell: {} },
        price: priceNum,
        size: sizeNum,
        expiresAt: 0, // No expiration
      });

      toast.success("Order placed successfully!", {
        description: `Transaction: ${signature.slice(0, 8)}...`,
      });

      setPrice("");
      setSize("");
    } catch (error: any) {
      console.error("Place order error:", error);
      const { formatErrorForDisplay } = await import("@/lib/errorHandler");
      const errorInfo = formatErrorForDisplay(error);
      toast.error(errorInfo.title, {
        description: errorInfo.message,
        action: errorInfo.retryable ? {
          label: "Retry",
          onClick: () => handlePlaceOrder(),
        } : undefined,
      });
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!publicKey) return;

    try {
      const signature = await cancelOrder(orderId);
      toast.success("Order cancelled successfully!", {
        description: `Transaction: ${signature.slice(0, 8)}...`,
      });
    } catch (error: any) {
      console.error("Cancel order error:", error);
      const { formatErrorForDisplay } = await import("@/lib/errorHandler");
      const errorInfo = formatErrorForDisplay(error);
      toast.error(errorInfo.title, {
        description: errorInfo.message,
      });
    }
  };

  const spread = orderBookData && orderBookData.bestAsk && orderBookData.bestBid
    ? (orderBookData.bestAsk.toNumber() - orderBookData.bestBid.toNumber()) / 1e9
    : 0;

  if (dataLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading order book...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-400" />
            Order Book: {outcomeName}
          </CardTitle>
          {orderBookData && (
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
              Spread: {spread.toFixed(6)} SOL
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Order Book Stats */}
        {orderBookData && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
              <p className="text-xs text-slate-400">Best Bid</p>
              <p className="text-sm font-bold text-emerald-400">
                {(orderBookData.bestBid.toNumber() / 1e9).toFixed(6)}
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
              <p className="text-xs text-slate-400">Best Ask</p>
              <p className="text-sm font-bold text-red-400">
                {(orderBookData.bestAsk.toNumber() / 1e9).toFixed(6)}
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
              <p className="text-xs text-slate-400">Last Trade</p>
              <p className="text-sm font-bold text-white">
                {(orderBookData.lastTradePrice.toNumber() / 1e9).toFixed(6)}
              </p>
            </div>
          </div>
        )}

        {/* Order Book Display */}
        <div className="grid grid-cols-2 gap-3">
          {/* Sell Orders (Asks) */}
          <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <p className="text-sm font-semibold text-white">Sell Orders</p>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {sellOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No sell orders</p>
              ) : (
                sellOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className={`flex justify-between text-xs p-1.5 rounded ${
                      order.isOwn ? "bg-red-500/10 border border-red-500/30" : ""
                    }`}
                  >
                    <span className="text-red-400">{order.price.toFixed(6)}</span>
                    <span className="text-slate-300">{order.size.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Buy Orders (Bids) */}
          <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <p className="text-sm font-semibold text-white">Buy Orders</p>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {buyOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No buy orders</p>
              ) : (
                buyOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className={`flex justify-between text-xs p-1.5 rounded ${
                      order.isOwn ? "bg-emerald-500/10 border border-emerald-500/30" : ""
                    }`}
                  >
                    <span className="text-emerald-400">{order.price.toFixed(6)}</span>
                    <span className="text-slate-300">{order.size.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Place Order */}
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
          <p className="text-sm font-semibold text-white mb-3">Place Limit Order</p>
          
          <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "buy" | "sell")}>
            <TabsList className="grid w-full grid-cols-2 bg-slate-800 mb-3">
              <TabsTrigger
                value="buy"
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
              >
                Buy
              </TabsTrigger>
              <TabsTrigger
                value="sell"
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
              >
                Sell
              </TabsTrigger>
            </TabsList>

            <div className="space-y-3">
              <div>
                <Label htmlFor="order-price" className="text-slate-300 text-xs">
                  Price (SOL)
                </Label>
                <Input
                  id="order-price"
                  type="number"
                  placeholder="0.000000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white h-9"
                  step="0.000001"
                />
              </div>

              <div>
                <Label htmlFor="order-size" className="text-slate-300 text-xs">
                  Size (shares)
                </Label>
                <Input
                  id="order-size"
                  type="number"
                  placeholder="0.00"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white h-9"
                  step="0.01"
                />
              </div>

              <Button
                onClick={handlePlaceOrder}
                disabled={!publicKey || processing || !price || !size}
                className={`w-full ${
                  orderType === "buy"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                } text-white`}
                size="sm"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Placing...
                  </>
                ) : (
                  `Place ${orderType === "buy" ? "Buy" : "Sell"} Order`
                )}
              </Button>
            </div>
          </Tabs>
        </div>

        {/* My Orders */}
        {myOrders.length > 0 && (
          <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700">
            <p className="text-sm font-semibold text-white mb-2">My Orders</p>
            <div className="space-y-2">
              {myOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="flex items-center justify-between bg-slate-800/50 rounded p-2"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={order.side.buy ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {order.side.buy ? "BUY" : "SELL"}
                      </Badge>
                      <span className="text-xs text-white">
                        {(order.price.toNumber() / 1e9).toFixed(6)} SOL
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {(order.remainingSize.toNumber() / 1e9).toFixed(2)} /{" "}
                      {(order.size.toNumber() / 1e9).toFixed(2)} shares
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelOrder(order.orderId)}
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <Alert className="bg-purple-500/10 border-purple-500/50">
          <AlertCircle className="h-4 w-4 text-purple-400" />
          <AlertDescription className="text-purple-400 text-xs">
            Limit orders • Best execution • 0.3% taker fee • No maker fee
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

