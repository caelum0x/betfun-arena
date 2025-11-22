"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SlippageSettingsProps {
  slippage: number; // in percentage (e.g., 0.5 for 0.5%)
  onSlippageChange: (slippage: number) => void;
}

const PRESET_SLIPPAGE = [0.1, 0.5, 1.0, 3.0];

export function SlippageSettings({
  slippage,
  onSlippageChange,
}: SlippageSettingsProps) {
  const [customSlippage, setCustomSlippage] = useState(
    PRESET_SLIPPAGE.includes(slippage) ? "" : slippage.toString()
  );
  const [isCustom, setIsCustom] = useState(!PRESET_SLIPPAGE.includes(slippage));

  const handlePresetClick = (preset: number) => {
    setCustomSlippage("");
    setIsCustom(false);
    onSlippageChange(preset);
  };

  const handleCustomChange = (value: string) => {
    setCustomSlippage(value);
    setIsCustom(true);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
      onSlippageChange(numValue);
    }
  };

  const isWarning = slippage > 1.0;
  const isDanger = slippage > 5.0;

  return (
    <Card className="bg-slate-900/50 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-300">
            Slippage Tolerance
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-slate-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Slippage is the difference between the expected price and the
                  actual execution price. Higher slippage tolerance means you're
                  willing to accept a larger price difference.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {PRESET_SLIPPAGE.map((preset) => (
            <Button
              key={preset}
              variant={!isCustom && slippage === preset ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(preset)}
              className="flex-1"
            >
              {preset}%
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom-slippage" className="text-slate-400 text-sm">
            Custom
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="custom-slippage"
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={customSlippage}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="0.0"
              className={`flex-1 ${
                isDanger
                  ? "border-red-500"
                  : isWarning
                  ? "border-yellow-500"
                  : ""
              }`}
            />
            <span className="text-slate-400 text-sm">%</span>
          </div>
        </div>

        {isWarning && (
          <div
            className={`text-xs p-2 rounded ${
              isDanger
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
            }`}
          >
            {isDanger
              ? "⚠️ Very high slippage tolerance. You may experience significant price impact."
              : "⚠️ High slippage tolerance. Consider using a lower value for better execution."}
          </div>
        )}

        {slippage < 0.1 && (
          <div className="text-xs p-2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            ℹ️ Very low slippage tolerance. Your transaction may fail if the
            price moves slightly.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

