import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";
import { Betfun } from "../target/types/betfun";

describe("join_arena", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Betfun as Program<Betfun>;
  const creator = provider.wallet;

  let arenaPda: PublicKey;
  let arenaId: string;
  const entryFee = new anchor.BN(0.1 * LAMPORTS_PER_SOL);

  beforeEach(async () => {
    // Create a test arena
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
        new anchor.BN(Date.now() / 1000 + 86400), // 1 day
        null
      )
      .accounts({
        arena: arenaPda,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  });

  it("Joins an arena successfully", async () => {
    const participant = Keypair.generate();

    // Airdrop SOL to participant
    await provider.connection.requestAirdrop(
      participant.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const [participantPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        arenaPda.toBuffer(),
        participant.publicKey.toBuffer(),
      ],
      program.programId
    );

    const outcomeChosen = 0;
    const arenaBalanceBefore = await provider.connection.getBalance(arenaPda);

    await program.methods
      .joinArena(outcomeChosen)
      .accounts({
        arena: arenaPda,
        participant: participantPda,
        user: participant.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([participant])
      .rpc();

    const participantAccount = await program.account.participant.fetch(
      participantPda
    );
    const arenaAccount = await program.account.arena.fetch(arenaPda);
    const arenaBalanceAfter = await provider.connection.getBalance(arenaPda);

    assert.equal(
      participantAccount.user.toBase58(),
      participant.publicKey.toBase58()
    );
    assert.equal(participantAccount.outcomeChosen, outcomeChosen);
    assert.equal(participantAccount.amount.toNumber(), entryFee.toNumber());
    assert.equal(participantAccount.claimed, false);

    assert.equal(arenaAccount.participantsCount, 1);
    assert.equal(
      arenaAccount.totalPot.toNumber(),
      entryFee.toNumber()
    );
    assert.equal(
      arenaAccount.outcomeCounts[outcomeChosen],
      1
    );
    assert.equal(
      arenaAccount.outcomePots[outcomeChosen].toNumber(),
      entryFee.toNumber()
    );

    // Arena should have received the entry fee
    assert.equal(
      arenaBalanceAfter - arenaBalanceBefore,
      entryFee.toNumber()
    );
  });

  it("Multiple users can join with different outcomes", async () => {
    const participant1 = Keypair.generate();
    const participant2 = Keypair.generate();

    // Airdrop SOL
    await provider.connection.requestAirdrop(
      participant1.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      participant2.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Join with outcome 0
    const [participantPda1] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        arenaPda.toBuffer(),
        participant1.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .joinArena(0)
      .accounts({
        arena: arenaPda,
        participant: participantPda1,
        user: participant1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([participant1])
      .rpc();

    // Join with outcome 1
    const [participantPda2] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        arenaPda.toBuffer(),
        participant2.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .joinArena(1)
      .accounts({
        arena: arenaPda,
        participant: participantPda2,
        user: participant2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([participant2])
      .rpc();

    const arena = await program.account.arena.fetch(arenaPda);

    assert.equal(arena.participantsCount, 2);
    assert.equal(arena.totalPot.toNumber(), entryFee.toNumber() * 2);
    assert.equal(arena.outcomeCounts[0], 1);
    assert.equal(arena.outcomeCounts[1], 1);
  });

  it("Fails when joining with invalid outcome", async () => {
    const participant = Keypair.generate();

    await provider.connection.requestAirdrop(
      participant.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const [participantPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        arenaPda.toBuffer(),
        participant.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .joinArena(99) // Invalid outcome index
        .accounts({
          arena: arenaPda,
          participant: participantPda,
          user: participant.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participant])
        .rpc();
      assert.fail("Should have failed with invalid outcome");
    } catch (err) {
      assert.include(err.toString(), "InvalidOutcome");
    }
  });

  it("Fails when joining an already resolved arena", async () => {
    const participant = Keypair.generate();

    await provider.connection.requestAirdrop(
      participant.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Resolve the arena first
    await program.methods
      .resolveArena(0)
      .accounts({
        arena: arenaPda,
        authority: creator.publicKey,
      })
      .rpc();

    const [participantPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        arenaPda.toBuffer(),
        participant.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .joinArena(0)
        .accounts({
          arena: arenaPda,
          participant: participantPda,
          user: participant.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participant])
        .rpc();
      assert.fail("Should have failed - arena already resolved");
    } catch (err) {
      assert.include(err.toString(), "ArenaAlreadyResolved");
    }
  });

  it("Fails when user has insufficient balance", async () => {
    const participant = Keypair.generate();

    // Give very little SOL (not enough for entry fee)
    await provider.connection.requestAirdrop(
      participant.publicKey,
      1000000 // 0.001 SOL
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const [participantPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        arenaPda.toBuffer(),
        participant.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .joinArena(0)
        .accounts({
          arena: arenaPda,
          participant: participantPda,
          user: participant.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([participant])
        .rpc();
      assert.fail("Should have failed with insufficient balance");
    } catch (err) {
      assert.include(err.toString(), "InsufficientBalance");
    }
  });
});

