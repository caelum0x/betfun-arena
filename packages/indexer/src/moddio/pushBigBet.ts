const MODDIO_API_URL = process.env.MODDIO_API_URL || "https://api.modd.io";
const MODDIO_SECRET_KEY = process.env.MODDIO_SECRET_KEY || "";

export async function pushBigBetAlert(
  arenaId: string,
  wallet: string,
  amount: number,
  outcome: string
): Promise<void> {
  if (!MODDIO_SECRET_KEY) {
    console.warn("Moddio secret key not configured");
    return;
  }

  try {
    await fetch(`${MODDIO_API_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MODDIO_SECRET_KEY}`,
      },
      body: JSON.stringify({
        type: "BIG_BET",
        arenaId,
        data: { wallet, amount, outcome },
      }),
    });

    console.log("Big bet alert pushed to Moddio:", wallet, amount);
  } catch (error) {
    console.error("Failed to push to Moddio:", error);
  }
}

export async function pushWinnerAnnouncement(
  arenaId: string,
  winnerOutcome: string,
  totalPot: number
): Promise<void> {
  if (!MODDIO_SECRET_KEY) return;

  try {
    await fetch(`${MODDIO_API_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MODDIO_SECRET_KEY}`,
      },
      body: JSON.stringify({
        type: "WINNER_ANNOUNCED",
        arenaId,
        data: { winnerOutcome, totalPot },
      }),
    });

    console.log("Winner announcement pushed to Moddio");
  } catch (error) {
    console.error("Failed to push to Moddio:", error);
  }
}

