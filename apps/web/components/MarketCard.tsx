"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, DollarSign, Clock } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface MarketCardProps {
  id: string;
  title: string;
  category: string;
  outcomes: string[];
  volume: number;
  participants: number;
  endTime: number;
  trending?: boolean;
  featured?: boolean;
  probabilities?: number[];
}

export function MarketCard({
  id,
  title,
  category,
  outcomes,
  volume,
  participants,
  endTime,
  trending = false,
  featured = false,
  probabilities = [50, 50],
}: MarketCardProps) {
  const daysLeft = Math.floor((endTime - Date.now()) / (24 * 60 * 60 * 1000));

  return (
    <Link href={`/market/${id}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all cursor-pointer h-full">
          <CardContent className="p-6">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-3">
              {trending && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Trending
                </Badge>
              )}
              {featured && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                  ⭐ Featured
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {category}
              </Badge>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-white mb-3 line-clamp-2 min-h-[3.5rem]">
              {title}
            </h3>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Volume
                </p>
                <p className="text-sm font-semibold text-white">
                  {(volume / 1e9).toFixed(2)} SOL
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Participants
                </p>
                <p className="text-sm font-semibold text-white">
                  {participants.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Outcomes */}
            <div className="space-y-2 mb-4">
              {outcomes.slice(0, 2).map((outcome, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{outcome}</span>
                  <span className="text-sm font-medium text-white">
                    {probabilities[index]?.toFixed(1) || 50}%
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-700">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3 w-3" />
                <span>{daysLeft > 0 ? `${daysLeft}d left` : 'Ending soon'}</span>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Trade
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

