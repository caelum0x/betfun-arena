import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";
import { Betfun } from "../target/types/betfun";

describe("resolve_arena and claim_winnings", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Betfun as Program<Betfun>;
  const creator = provider.wallet;

  let arenaPda: PublicKey;
  let arenaId: string;
  const entryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

  beforeEach(async () => {
    // Create arena
    arenaId = Keypair.generate().publicKey.toString();
    [arenaPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("arena"), Buffer.from(arenaId)],
      program.programId
    );

    await program.methods
      .createArena(
        arenaId,
        "Test Arena",
        "Test Description",
        "Will this test pass?",
        ["Yes", "No"],
        entryFee,
        new anchor.BN(Date.now() / 1000 + 86400),
        null
      )
      .accounts({
        arena: arenaPda,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  });

  it("Resolves arena and claims winnings successfully", async () => {
    const winner = Keypair.generate();
    const loser = Keypair.generate();

    // Airdrop
    await provider.connection.requestAirdrop(winner.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(loser.publicKey, 2 * LAMPORTS_PER_SOL);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Both join
    const [winnerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("participant"), arenaPda.toBuffer(), winner.publicKey.toBuffer()],
      program.programId
    );

    const [loserPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("participant"), arenaPda.toBuffer(), loser.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .joinArena(0)
      .accounts({
        arena: arenaPda,
        participant: winnerPda,
        user: winner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([winner])
      .rpc();

    await program.methods
      .joinArena(1)
      .accounts({
        arena: arenaPda,
        participant: loserPda,
        user: loser.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([loser])
      .rpc();

    const winnerBalanceBefore = await provider.connection.getBalance(winner.publicKey);
    const creatorBalanceBefore = await provider.connection.getBalance(creator.publicKey);

    // Resolve with outcome 0 (winner)
    await program.methods
      .resolveArena(0)
      .accounts({
        arena: arenaPda,
        authority: creator.publicKey,
      })
      .rpc();

    const arena = await program.account.arena.fetch(arenaPda);
    assert.equal(arena.resolved, true);
    assert.equal(arena.winnerOutcome, 0);

    // Winner claims
    await program.methods
      .claimWinnings()
      .accounts({
        arena: arenaPda,
        participant: winnerPda,
        user: winner.publicKey,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([winner])
      .rpc();

    const winnerBalanceAfter = await provider.connection.getBalance(winner.publicKey);
    const creatorBalanceAfter = await provider.connection.getBalance(creator.publicKey);
    const participantAccount = await program.account.participant.fetch(winnerPda);

    assert.equal(participantAccount.claimed, true);

    // Winner should receive payout (minus creator fee)
    const totalPot = entryFee.toNumber() * 2;
    const creatorFee = Math.floor(totalPot * 0.02); // 2%
    const payout = totalPot - creatorFee;

    assert.approximately(
      winnerBalanceAfter - winnerBalanceBefore,
      payout,
      100000 // Allow small variance for tx fees
    );

    // Creator should receive fee
    assert.approximately(
      creatorBalanceAfter - creatorBalanceBefore,
      creatorFee,
      100000
    );
  });

  it("Fails to resolve with invalid outcome", async () => {
    try {
      await program.methods
        .resolveArena(99) // Invalid
        .accounts({
          arena: arenaPda,
          authority: creator.publicKey,
        })
        .rpc();
      assert.fail("Should have failed with invalid outcome");
    } catch (err) {
      assert.include(err.toString(), "InvalidOutcome");
    }
  });

  it("Fails to claim if not a winner", async () => {
    const winner = Keypair.generate();
    const loser = Keypair.generate();

    await provider.connection.requestAirdrop(winner.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(loser.publicKey, 2 * LAMPORTS_PER_SOL);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const [winnerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("participant"), arenaPda.toBuffer(), winner.publicKey.toBuffer()],
      program.programId
    );

    const [loserPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("participant"), arenaPda.toBuffer(), loser.publicKey.toBuffer()],
      program.programId
    );

    await program.methods.joinArena(0).accounts({
      arena: arenaPda,
      participant: winnerPda,
      user: winner.publicKey,
      systemProgram: SystemProgram.programId,
    }).signers([winner]).rpc();

    await program.methods.joinArena(1).accounts({
      arena: arenaPda,
      participant: loserPda,
      user: loser.publicKey,
      systemProgram: SystemProgram.programId,
    }).signers([loser]).rpc();

    // Resolve with outcome 0
    await program.methods
      .resolveArena(0)
      .accounts({
        arena: arenaPda,
        authority: creator.publicKey,
      })
      .rpc();

    // Loser tries to claim
    try {
      await program.methods
        .claimWinnings()
        .accounts({
          arena: arenaPda,
          participant: loserPda,
          user: loser.publicKey,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([loser])
        .rpc();
      assert.fail("Should have failed - not a winner");
    } catch (err) {
      assert.include(err.toString(), "NotAWinner");
    }
  });

  it("Fails to claim twice", async () => {
    const winner = Keypair.generate();

    await provider.connection.requestAirdrop(winner.publicKey, 2 * LAMPORTS_PER_SOL);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const [winnerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("participant"), arenaPda.toBuffer(), winner.publicKey.toBuffer()],
      program.programId
    );

    await program.methods.joinArena(0).accounts({
      arena: arenaPda,
      participant: winnerPda,
      user: winner.publicKey,
      systemProgram: SystemProgram.programId,
    }).signers([winner]).rpc();

    await program.methods
      .resolveArena(0)
      .accounts({
        arena: arenaPda,
        authority: creator.publicKey,
      })
      .rpc();

    // Claim once (success)
    await program.methods
      .claimWinnings()
      .accounts({
        arena: arenaPda,
        participant: winnerPda,
        user: winner.publicKey,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([winner])
      .rpc();

    // Try to claim again
    try {
      await program.methods
        .claimWinnings()
        .accounts({
          arena: arenaPda,
          participant: winnerPda,
          user: winner.publicKey,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([winner])
        .rpc();
      assert.fail("Should have failed - already claimed");
    } catch (err) {
      assert.include(err.toString(), "AlreadyClaimed");
    }
  });

  it("Only creator can resolve", async () => {
    const attacker = Keypair.generate();

    await provider.connection.requestAirdrop(attacker.publicKey, 2 * LAMPORTS_PER_SOL);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      await program.methods
        .resolveArena(0)
        .accounts({
          arena: arenaPda,
          authority: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();
      assert.fail("Should have failed - not authorized");
    } catch (err) {
      assert.include(err.toString(), "Unauthorized");
    }
  });
});

