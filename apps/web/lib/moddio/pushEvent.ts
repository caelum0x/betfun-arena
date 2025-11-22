import { MODDIO_SECRET_KEY, MODDIO_WORLD_ID, MODDIO_API_URL } from "../constants";

interface ModdioEvent {
  event: "bigbet" | "resolution" | "whale";
  data: Record<string, any>;
}

/**
 * Push event to Moddio game world
 * OFFICIAL API from SPONSOR_APIS.md
 */
export async function pushModdioEvent(event: ModdioEvent): Promise<void> {
  if (!MODDIO_SECRET_KEY || !MODDIO_WORLD_ID) {
    console.warn("Moddio not configured, skipping event push");
    return;
  }

  try {
    // OFFICIAL Moddio Events API from SPONSOR_APIS.md
    const response = await fetch(
      `${MODDIO_API_URL}/worlds/${MODDIO_WORLD_ID}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MODDIO_SECRET_KEY}`,
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw new Error(`Moddio API error: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Failed to push Moddio event:", error);
  }
}

/**
 * Push big bet alert to Moddio
 * OFFICIAL format from SPONSOR_APIS.md
 */
export async function pushBigBetAlert(
  arenaId: string,
  wallet: string,
  amount: number,
  side: "yes" | "no"
): Promise<void> {
  await pushModdioEvent({
    event: "bigbet",
    data: {
      amount: amount / 1e9, // Convert to SOL
      side,
      wallet: wallet.substring(0, 8),
    },
  });
}

/**
 * Push winner announcement to Moddio
 * OFFICIAL format from SPONSOR_APIS.md
 */
export async function pushWinnerAnnouncement(
  arenaId: string,
  winner: "yes" | "no",
  totalPot: number
): Promise<void> {
  await pushModdioEvent({
    event: "resolution",
    data: {
      winner,
      amount: totalPot / 1e9, // Convert to SOL
    },
  });
}

/**
 * Push whale alert for bets > threshold
 */
export async function pushWhaleAlert(
  amount: number,
  side: "yes" | "no"
): Promise<void> {
  await pushModdioEvent({
    event: "whale",
    data: {
      amount: amount / 1e9,
      side,
    },
  });
}

