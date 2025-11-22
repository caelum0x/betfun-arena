/**
 * Helius webhook signature verification
 * Based on Helius webhook documentation
 */

import { createHmac } from "crypto";

/**
 * Verify Helius webhook signature
 * @param payload - Raw request body as string
 * @param signature - Signature from X-Helius-Signature header
 * @param secret - Webhook secret from environment
 * @returns true if signature is valid
 */
export function verifyHeliusWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret || !signature) {
    return false;
  }

  try {
    // Helius uses HMAC-SHA256
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    // Compare signatures (constant-time comparison)
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    let match = 0;
    for (let i = 0; i < signature.length; i++) {
      match |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }

    return match === 0;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

/**
 * Extract signature from request headers
 */
export function extractSignature(headers: Record<string, string | string[] | undefined>): string | null {
  const signature = headers["x-helius-signature"] || headers["X-Helius-Signature"];
  
  if (!signature) {
    return null;
  }

  // Handle array or string
  if (Array.isArray(signature)) {
    return signature[0] || null;
  }

  return signature;
}

