/**
 * Moddio world health check
 */

import { MODDIO_BASE_URL, MODDIO_WORLD_ID } from "../constants";

export interface HealthCheckResult {
  healthy: boolean;
  worldId: string;
  error?: string;
  latency?: number;
}

/**
 * Check if Moddio world is available
 */
export async function checkModdioHealth(): Promise<HealthCheckResult> {
  if (!MODDIO_WORLD_ID) {
    return {
      healthy: false,
      worldId: "",
      error: "MODDIO_WORLD_ID not configured",
    };
  }

  const startTime = Date.now();

  try {
    // Try to load the world URL (iframe src check)
    const worldUrl = `${MODDIO_BASE_URL}/${MODDIO_WORLD_ID}`;
    
    // Use a simple fetch to check if the world is accessible
    // Note: This is a basic check - actual world availability
    // might require loading the iframe
    const response = await fetch(worldUrl, {
      method: "HEAD",
      mode: "no-cors", // CORS might block, but we just want to know if it's reachable
    });

    const latency = Date.now() - startTime;

    return {
      healthy: true,
      worldId: MODDIO_WORLD_ID,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      healthy: false,
      worldId: MODDIO_WORLD_ID,
      error: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}

/**
 * Check health with timeout
 */
export async function checkModdioHealthWithTimeout(
  timeoutMs: number = 5000
): Promise<HealthCheckResult> {
  return Promise.race([
    checkModdioHealth(),
    new Promise<HealthCheckResult>((resolve) =>
      setTimeout(
        () =>
          resolve({
            healthy: false,
            worldId: MODDIO_WORLD_ID || "",
            error: "Health check timeout",
          }),
        timeoutMs
      )
    ),
  ]);
}

