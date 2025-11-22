"use client";

import { Button } from "./ui/button";
import { TWITTER_SHARE_URL } from "../lib/constants";
import { generateShareText } from "../lib/utils";

interface ShareToXButtonProps {
  type: "create" | "join" | "win";
  arenaTitle: string;
  arenaUrl: string;
  amount?: number;
  outcome?: string;
  className?: string;
}

export function ShareToXButton({
  type,
  arenaTitle,
  arenaUrl,
  amount,
  outcome,
  className,
}: ShareToXButtonProps) {
  const handleShare = () => {
    // Generate share text based on type
    let text = "";
    switch (type) {
      case "win":
        text = `Just won ${amount?.toFixed(2) || "X"} SOL on BetFun Arena! 💰\n\n"${arenaTitle}"\n\nJoin the arena:`;
        break;
      case "create":
        text = `I just created a prediction battle: "${arenaTitle}"\n\n⚔️ Join the arena:`;
        break;
      case "join":
        text = `Just bet ${amount?.toFixed(2) || "X"} SOL that ${outcome || "this"} will happen! Who's with me? 🚀\n\n"${arenaTitle}"\n\nJoin the battle:`;
        break;
      default:
        text = `Check out this prediction battle on BetFun Arena ⚔️\n\n"${arenaTitle}"\n\n`;
    }

    // Add UTM params to URL
    const urlWithParams = new URL(arenaUrl);
    urlWithParams.searchParams.set("utm_source", "twitter");
    urlWithParams.searchParams.set("utm_medium", "share");
    urlWithParams.searchParams.set("utm_campaign", type);

    const shareUrl = `${TWITTER_SHARE_URL}?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(urlWithParams.toString())}`;
    
    window.open(shareUrl, "_blank", "width=550,height=420");
  };

  return (
    <Button onClick={handleShare} variant="secondary" className={className}>
      <span className="mr-2">𝕏</span>
      Share to X
    </Button>
  );
}

