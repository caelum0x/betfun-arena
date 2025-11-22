import { formatSOL, formatNumber } from "../lib/utils";

interface VolumeBadgeProps {
  pot: number;
}

export function VolumeBadge({ pot }: VolumeBadgeProps) {
  const potSOL = parseFloat(formatSOL(pot));
  const isWhale = potSOL > 100;

  return (
    <span className="flex items-center gap-1 text-sol-blue font-bold">
      💰 <span>{formatNumber(potSOL)} SOL</span>
      {isWhale && <span className="text-hot-pink">🔥</span>}
    </span>
  );
}

