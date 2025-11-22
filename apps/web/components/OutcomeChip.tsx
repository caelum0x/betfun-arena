import { cn } from "../lib/utils";

interface OutcomeChipProps {
  outcome: string;
  isWinner?: boolean;
  className?: string;
}

export function OutcomeChip({
  outcome,
  isWinner = false,
  className,
}: OutcomeChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1 rounded-sm text-xs font-bold",
        isWinner
          ? "bg-neon-green/20 text-neon-green border border-neon-green"
          : "bg-medium-gray text-white",
        className
      )}
    >
      {isWinner && "🏆"}
      {outcome}
    </span>
  );
}

