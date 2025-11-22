import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "@/lib/idl/betfun.json";
import { BETFUN_PROGRAM_ID } from "@/lib/constants";

const PROGRAM_ID = BETFUN_PROGRAM_ID;

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    if (!wallet.publicKey) return null;

    const provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: "confirmed" }
    );

    return new Program(idl as any, PROGRAM_ID, provider);
  }, [connection, wallet]);

  return program;
}

export function useProvider() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (!wallet.publicKey) return null;

    return new AnchorProvider(
      connection,
      wallet as any,
      { commitment: "confirmed" }
    );
  }, [connection, wallet]);

  return provider;
}

