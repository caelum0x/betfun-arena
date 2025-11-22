import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import { Betfun } from "../target/types/betfun";

describe("create_arena", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Betfun as Program<Betfun>;
  const creator = provider.wallet;

  it("Creates an arena successfully", async () => {
    const arenaId = Keypair.generate().publicKey.toString();
    const [arenaPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("arena"), Buffer.from(arenaId)],
      program.programId
    );

    const title = "Will BTC reach $100k?";
    const description = "Prediction for Bitcoin price";
    const question = "Will Bitcoin reach $100,000 by end of year?";
    const outcomes = ["Yes", "No"];
    const entryFee = new anchor.BN(100_000_000); // 0.1 SOL
    const endTime = new anchor.BN(Date.now() / 1000 + 86400 * 30); // 30 days

    await program.methods
      .createArena(
        arenaId,
        title,
        description,
        question,
        outcomes,
        entryFee,
        endTime,
        null // no oracle
      )
      .accounts({
        arena: arenaPda,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const arena = await program.account.arena.fetch(arenaPda);

    assert.equal(arena.creator.toBase58(), creator.publicKey.toBase58());
    assert.equal(arena.title, title);
    assert.equal(arena.question, question);
    assert.equal(arena.outcomes.length, 2);
    assert.equal(arena.entryFee.toNumber(), entryFee.toNumber());
    assert.equal(arena.totalPot.toNumber(), 0);
    assert.equal(arena.participantsCount, 0);
    assert.equal(arena.resolved, false);
  });

  it("Fails with title too short", async () => {
    const arenaId = Keypair.generate().publicKey.toString();
    const [arenaPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("arena"), Buffer.from(arenaId)],
      program.programId
    );

    try {
      await program.methods
        .createArena(
          arenaId,
          "BT", // Too short (min 3 chars)
          "Description",
          "Will Bitcoin reach $100k?",
          ["Yes", "No"],
          new anchor.BN(100_000_000),
          new anchor.BN(Date.now() / 1000 + 86400),
          null
        )
        .accounts({
          arena: arenaPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have failed with title too short");
    } catch (err) {
      assert.include(err.toString(), "TitleTooShort");
    }
  });

  it("Fails with title too long", async () => {
    const arenaId = Keypair.generate().publicKey.toString();
    const [arenaPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("arena"), Buffer.from(arenaId)],
      program.programId
    );

    const longTitle = "A".repeat(81); // Max 80 chars

    try {
      await program.methods
        .createArena(
          arenaId,
          longTitle,
          "Description",
          "Will Bitcoin reach $100k?",
          ["Yes", "No"],
          new anchor.BN(100_000_000),
          new anchor.BN(Date.now() / 1000 + 86400),
          null
        )
        .accounts({
          arena: arenaPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have failed with title too long");
    } catch (err) {
      assert.include(err.toString(), "TitleTooLong");
    }
  });

  it("Fails with too few outcomes", async () => {
    const arenaId = Keypair.generate().publicKey.toString();
    const [arenaPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("arena"), Buffer.from(arenaId)],
      program.programId
    );

    try {
      await program.methods
        .createArena(
          arenaId,
          "Test Arena",
          "Description",
          "Test question?",
          ["Only One"], // Need at least 2
          new anchor.BN(100_000_000),
          new anchor.BN(Date.now() / 1000 + 86400),
          null
        )
        .accounts({
          arena: arenaPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have failed with too few outcomes");
    } catch (err) {
      assert.include(err.toString(), "TooFewOutcomes");
    }
  });

  it("Fails with too many outcomes", async () => {
    const arenaId = Keypair.generate().publicKey.toString();
    const [arenaPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("arena"), Buffer.from(arenaId)],
      program.programId
    );

    try {
      await program.methods
        .createArena(
          arenaId,
          "Test Arena",
          "Description",
          "Test question?",
          ["1", "2", "3", "4", "5", "6", "7"], // Max 6
          new anchor.BN(100_000_000),
          new anchor.BN(Date.now() / 1000 + 86400),
          null
        )
        .accounts({
          arena: arenaPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have failed with too many outcomes");
    } catch (err) {
      assert.include(err.toString(), "TooManyOutcomes");
    }
  });

  it("Fails with duplicate outcomes", async () => {
    const arenaId = Keypair.generate().publicKey.toString();
    const [arenaPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("arena"), Buffer.from(arenaId)],
      program.programId
    );

    try {
      await program.methods
        .createArena(
          arenaId,
          "Test Arena",
          "Description",
          "Test question?",
          ["Yes", "yes"], // Case-insensitive duplicate
          new anchor.BN(100_000_000),
          new anchor.BN(Date.now() / 1000 + 86400),
          null
        )
        .accounts({
          arena: arenaPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have failed with duplicate outcomes");
    } catch (err) {
      assert.include(err.toString(), "DuplicateOutcome");
    }
  });

  it("Fails with entry fee below minimum", async () => {
    const arenaId = Keypair.generate().publicKey.toString();
    const [arenaPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("arena"), Buffer.from(arenaId)],
      program.programId
    );

    try {
      await program.methods
        .createArena(
          arenaId,
          "Test Arena",
          "Description",
          "Test question?",
          ["Yes", "No"],
          new anchor.BN(500_000), // 0.0005 SOL (min is 0.001)
          new anchor.BN(Date.now() / 1000 + 86400),
          null
        )
        .accounts({
          arena: arenaPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have failed with entry fee too low");
    } catch (err) {
      assert.include(err.toString(), "EntryFeeTooLow");
    }
  });

  it("Fails with entry fee above maximum", async () => {
    const arenaId = Keypair.generate().publicKey.toString();
    const [arenaPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("arena"), Buffer.from(arenaId)],
      program.programId
    );

    try {
      await program.methods
        .createArena(
          arenaId,
          "Test Arena",
          "Description",
          "Test question?",
          ["Yes", "No"],
          new anchor.BN(11_000_000_000), // 11 SOL (max is 10)
          new anchor.BN(Date.now() / 1000 + 86400),
          null
        )
        .accounts({
          arena: arenaPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have failed with entry fee too high");
    } catch (err) {
      assert.include(err.toString(), "EntryFeeTooHigh");
    }
  });

  it("Fails with end time in the past", async () => {
    const arenaId = Keypair.generate().publicKey.toString();
    const [arenaPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("arena"), Buffer.from(arenaId)],
      program.programId
    );

    try {
      await program.methods
        .createArena(
          arenaId,
          "Test Arena",
          "Description",
          "Test question?",
          ["Yes", "No"],
          new anchor.BN(100_000_000),
          new anchor.BN(Date.now() / 1000 - 1000), // Past timestamp
          null
        )
        .accounts({
          arena: arenaPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have failed with end time in past");
    } catch (err) {
      assert.include(err.toString(), "EndTimeInPast");
    }
  });
});

