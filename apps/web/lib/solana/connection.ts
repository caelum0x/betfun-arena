import { Connection, ConnectionConfig } from "@solana/web3.js";
import { NETWORK, RPC_ENDPOINTS } from "../constants";

/**
 * Get Solana connection with optimal configuration
 */
export function getSolanaConnection(): Connection {
  const endpoint = RPC_ENDPOINTS[NETWORK];
  
  const config: ConnectionConfig = {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000,
  };

  return new Connection(endpoint, config);
}

/**
 * Singleton connection instance
 */
let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = getSolanaConnection();
  }
  return connection;
}

