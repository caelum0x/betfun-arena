import { useState, useEffect, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl, BN } from "@coral-xyz/anchor";
import { Arena, PROGRAM_ID } from "@betfun/sdk";
// @ts-ignore
import idl from "@/lib/idl/betfun.json";
import { generateMockArenas } from "@/lib/mockArenas";

// Create a read-only client for fetching arenas without wallet
function createReadOnlyClient(connection: Connection): Program<Idl> {
  const wallet = {
    publicKey: PublicKey.default,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };

  const provider = new AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
  });

  const idlWithAddress = {
    ...idl,
    address: idl.address || PROGRAM_ID.toBase58(),
  };

  // @ts-ignore
  return new Program<Idl>(idlWithAddress as Idl, provider);
}

export function useAllArenas() {
  const { connection } = useConnection();
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMockData, setIsMockData] = useState(false);

  const fetchAllArenas = useCallback(async () => {
    if (!connection) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("🔍 Fetching arenas from program:", PROGRAM_ID.toBase58());
      console.log("🔍 Connection endpoint:", connection.rpcEndpoint);
      
      // Verify program account exists
      let programExists = false;
      try {
        const programInfo = await connection.getAccountInfo(PROGRAM_ID);
        if (!programInfo) {
          console.warn("⚠️ Program account not found! Using mock data for demonstration purposes.");
          console.warn(`   Program ${PROGRAM_ID.toBase58()} not found on ${connection.rpcEndpoint}`);
          console.warn("💡 Note: Real arenas can be created if users have enough SOL for transaction fees.");
          programExists = false;
        } else {
          console.log("✅ Program account found, executable:", programInfo.executable);
          programExists = true;
        }
      } catch (programCheckError: any) {
        console.warn("⚠️ Error checking program account. Using mock data for demonstration purposes:", programCheckError);
        console.warn("💡 Note: Real arenas can be created if users have enough SOL for transaction fees.");
        programExists = false;
      }
      
      // If program doesn't exist, show mock data
      if (!programExists) {
        const mockArenas = generateMockArenas();
        setArenas(mockArenas);
        setIsMockData(true);
        setError(`Program ${PROGRAM_ID.toBase58()} not found on ${connection.rpcEndpoint}. Showing mock data for demonstration purposes. Real arenas can be created if users have enough SOL.`);
        return;
      }
      
      // Create read-only program instance
      const program = createReadOnlyClient(connection);

      // Try to use Anchor's account namespace first (if available)
      // @ts-ignore - account namespace may not exist
      if (program.account && program.account.arena && typeof program.account.arena.all === 'function') {
        try {
          console.log("✅ Trying Anchor account.arena.all()...");
          const arenaAccounts = await program.account.arena.all();
          console.log(`📊 Found ${arenaAccounts.length} arenas via Anchor account.all()`);
          
          if (arenaAccounts.length === 0) {
            console.log("ℹ️ No arenas found. This could mean:");
            console.log("   1. No arenas have been created yet");
            console.log("   2. Arenas were created on a different network");
            console.log("   3. Program ID doesn't match the deployed program");
            console.log(`   Current program: ${PROGRAM_ID.toBase58()}`);
            console.log(`   Current network: ${connection.rpcEndpoint}`);
          }
          
          const fetchedArenas: Arena[] = arenaAccounts.map((account: any) => ({
            address: account.publicKey,
            creator: account.account.creator,
            title: account.account.title,
            description: account.account.description || "",
            question: account.account.question,
            outcomes: account.account.outcomes || [],
            tags: account.account.tags || [],
            entryFee: account.account.entryFee || account.account.entry_fee || new BN(0),
            endTime: account.account.endTime || account.account.end_time || new BN(0),
            resolved: account.account.resolved || false,
            winnerOutcome: account.account.winnerOutcome !== undefined 
              ? account.account.winnerOutcome 
              : (account.account.winner_outcome !== null ? account.account.winner_outcome : null),
            totalPot: account.account.totalPot || account.account.pot || new BN(0),
            participantCount: account.account.participantCount || account.account.participantsCount || account.account.participants_count || 0,
            createdAt: account.account.createdAt || account.account.created_at || new BN(0),
          }));
          
          console.log(`✅ Successfully fetched ${fetchedArenas.length} arenas`);
          
          // If no real arenas found, use mock data for demonstration
          if (fetchedArenas.length === 0) {
            console.log("📝 No real arenas found. Using mock data for demonstration purposes.");
            console.log("💡 Note: Real arenas can be created if users have enough SOL for transaction fees.");
            const mockArenas = generateMockArenas();
            setArenas(mockArenas);
            setIsMockData(true);
            return;
          }
          
          setArenas(fetchedArenas);
          setIsMockData(false);
          return;
        } catch (err: any) {
          console.warn("⚠️ Failed to use Anchor account.all(), falling back to getProgramAccounts:", err?.message || err);
        }
      } else {
        console.log("⚠️ Anchor account.arena.all() not available, using getProgramAccounts");
      }

      // First, try fetching ALL accounts to see if there are any at all
      console.log("🔍 Fetching all program accounts...");
      const allAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          {
            dataSize: 100, // Minimum size filter to get any accounts
          },
        ],
      });
      console.log(`📊 Found ${allAccounts.length} total accounts for program`);

      if (allAccounts.length === 0) {
        console.log("ℹ️ No accounts found for this program. Using mock data for demonstration purposes.");
        console.log("💡 Note: Real arenas can be created if users have enough SOL for transaction fees.");
        const mockArenas = generateMockArenas();
        setArenas(mockArenas);
        setIsMockData(true);
        return;
      }

      // Check first few accounts to see their discriminators
      if (allAccounts.length > 0) {
        const firstAccount = allAccounts[0];
        const discriminator = Array.from(firstAccount.account.data.slice(0, 8));
        console.log("🔍 First account discriminator:", discriminator);
        console.log("🔍 Expected Arena discriminator:", [243, 215, 44, 44, 231, 211, 232, 168]);
      }

      // Filter accounts manually by discriminator (more reliable than RPC filter)
      // Arena discriminator: [243, 215, 44, 44, 231, 211, 232, 168]
      const ARENA_DISCRIMINATOR = [243, 215, 44, 44, 231, 211, 232, 168];
      
      console.log("🔍 Filtering accounts by Arena discriminator...");
      const accounts = allAccounts.filter(({ account }) => {
        if (account.data.length < 8) return false;
        const discriminator = Array.from(account.data.slice(0, 8));
        return discriminator.every((byte, i) => byte === ARENA_DISCRIMINATOR[i]);
      });
      
      console.log(`📊 Found ${accounts.length} accounts matching Arena discriminator`);

      const fetchedArenas: Arena[] = [];

      // Try to decode each account as an Arena
      for (const { pubkey, account: accountInfo } of accounts) {
        try {
          // Check discriminator manually first
          const accountDiscriminator = Array.from(accountInfo.data.slice(0, 8));
          const expectedDiscriminator = [243, 215, 44, 44, 231, 211, 232, 168];
          
          const isArena = accountDiscriminator.every((byte, i) => byte === expectedDiscriminator[i]);
          
          if (!isArena) {
            // Skip non-Arena accounts
            continue;
          }

          // Try to fetch as Arena account using Anchor
          // @ts-ignore - account namespace may not exist
          let arenaData;
          try {
            arenaData = await program.account.arena?.fetch(pubkey);
          } catch (fetchError) {
            // If Anchor fetch fails, try manual decoding
            console.warn(`⚠️ Anchor fetch failed for ${pubkey.toBase58()}, skipping:`, fetchError);
            continue;
          }
          
          if (arenaData) {
            // Convert to Arena format
            // Handle both snake_case (from Anchor) and camelCase (from SDK) field names
            const arena: Arena = {
              address: pubkey,
              creator: arenaData.creator,
              title: arenaData.title,
              description: arenaData.description || "",
              question: arenaData.question,
              outcomes: arenaData.outcomes || [],
              tags: arenaData.tags || [],
              entryFee: arenaData.entryFee || arenaData.entry_fee || new BN(0),
              endTime: arenaData.endTime || arenaData.end_time || new BN(0),
              resolved: arenaData.resolved || false,
              winnerOutcome: arenaData.winnerOutcome !== undefined ? arenaData.winnerOutcome : (arenaData.winner_outcome !== null ? arenaData.winner_outcome : null),
              totalPot: arenaData.totalPot || arenaData.pot || new BN(0),
              participantCount: arenaData.participantCount || arenaData.participantsCount || arenaData.participants_count || 0,
              createdAt: arenaData.createdAt || arenaData.created_at || new BN(0),
            };
            fetchedArenas.push(arena);
          }
        } catch (err) {
          // Not an Arena account, skip
          continue;
        }
      }

      console.log(`✅ Successfully decoded ${fetchedArenas.length} Arena accounts`);
      
      // If no real arenas found, use mock data for demonstration
      if (fetchedArenas.length === 0) {
        console.log("📝 No real arenas found. Using mock data for demonstration purposes.");
        console.log("💡 Note: Real arenas can be created if users have enough SOL for transaction fees.");
        const mockArenas = generateMockArenas();
        setArenas(mockArenas);
        setIsMockData(true);
        return;
      }
      
      setArenas(fetchedArenas);
      setIsMockData(false);
    } catch (err: any) {
      console.error("❌ Error fetching all arenas:", err);
      console.log("📝 Error occurred. Using mock data for demonstration purposes.");
      console.log("💡 Note: Real arenas can be created if users have enough SOL for transaction fees.");
      setError(err.message || "Failed to fetch arenas");
      // Still show mock data even on error for demonstration
      const mockArenas = generateMockArenas();
      setArenas(mockArenas);
      setIsMockData(true);
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    fetchAllArenas();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAllArenas, 30000);
    return () => clearInterval(interval);
  }, [fetchAllArenas]);

  return {
    arenas,
    loading,
    error,
    isMockData,
    refetch: fetchAllArenas,
  };
}

