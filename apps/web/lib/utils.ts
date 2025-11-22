import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncate wallet address
 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format SOL amount
 */
export function formatSOL(lamports: number | string): string {
  const sol = typeof lamports === "string" ? parseInt(lamports) : lamports;
  return (sol / 1e9).toFixed(2);
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num.toString();
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - target.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) return target.toLocaleDateString();
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
}

/**
 * Format countdown timer
 */
export function formatCountdown(endTime: Date | string): string {
  const now = new Date();
  const target = typeof endTime === "string" ? new Date(endTime) : endTime;
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) return "Ended";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Calculate hotness score for arena sorting
 */
export function calculateHotness(
  pot: number,
  participantsCount: number,
  createdAt: Date | string
): number {
  const now = new Date();
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const ageHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  // Decay factor: newer arenas get higher score
  const ageFactor = Math.max(0, 1 - ageHours / 168); // Decay over 1 week

  // Volume factor
  const volumeFactor = Math.log10(pot + 1);

  // Participant factor
  const participantFactor = Math.log10(participantsCount + 1);

  return (volumeFactor + participantFactor) * ageFactor;
}

/**
 * Generate share text for Twitter
 */
export function generateShareText(params: {
  type: "create" | "join" | "win";
  arenaTitle: string;
  amount?: number;
  outcome?: string;
}): string {
  const { type, arenaTitle, amount, outcome } = params;

  switch (type) {
    case "create":
      return `Just created a prediction arena on @BetFunArena! 🎯\n\n"${arenaTitle}"\n\nJoin the battle! ⚔️`;
    case "join":
      return `Just bet ${amount} SOL on ${outcome} in "${arenaTitle}" 💰\n\n@BetFunArena`;
    case "win":
      return `Just won ${amount} SOL on @BetFunArena! 🎉⚔️\n\nArena: "${arenaTitle}"\n\nCome get your wins! 💪`;
    default:
      return `Check out @BetFunArena - Prediction battles on Solana! ⚔️`;
  }
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

/**
 * Play sound effect
 */
export function playSound(soundFile: string, volume = 0.5) {
  if (typeof window === "undefined") return;

  const soundEnabled = localStorage.getItem("betfun_sound") !== "false";
  if (!soundEnabled) return;

  const audio = new Audio(`/sounds/${soundFile}`);
  audio.volume = volume;
  audio.play().catch((err) => console.error("Failed to play sound:", err));
}

/**
 * Trigger haptic feedback (mobile)
 */
export function triggerHaptic(type: "light" | "medium" | "heavy" = "medium") {
  if (typeof window === "undefined") return;
  if (!("vibrate" in navigator)) return;

  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30],
  };

  navigator.vibrate(patterns[type]);
}

