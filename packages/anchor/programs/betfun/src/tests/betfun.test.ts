import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Betfun } from "../target/types/betfun";
import { assert } from "chai";

describe("betfun", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Betfun as Program<Betfun>;
  const provider = anchor.getProvider();

  it("Creates an arena", async () => {
    const creator = (provider.wallet as anchor.Wallet).payer;
    const title = "Will BTC hit $100k?";
    const description = "Predict if Bitcoin reaches $100,000 by end of year";
    const question = "Will BTC hit $100k by EOY 2025?";
    const outcomes = ["Yes", "No"];
    const tags = ["crypto", "bitcoin"];
    const entryFee = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.05);
    const endTime = new anchor.BN(Date.now() / 1000 + 86400); // 1 day from now
    const manualResolve = false;

    const [arenaPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("arena"),
        creator.publicKey.toBuffer(),
        Buffer.from(title),
      ],
      program.programId
    );

    await program.methods
      .createArena(
        title,
        description,
        question,
        outcomes,
        tags,
        entryFee,
        endTime,
        manualResolve,
        null,
        null
      )
      .accounts({
        arena: arenaPda,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const arena = await program.account.arena.fetch(arenaPda);
    assert.equal(arena.title, title);
    assert.equal(arena.creator.toBase58(), creator.publicKey.toBase58());
    assert.equal(arena.outcomes.length, 2);
    assert.equal(arena.resolved, false);
  });

  it("Joins an arena", async () => {
    const creator = (provider.wallet as anchor.Wallet).payer;
    const title = "Test Arena Join";
    const description = "Test";
    const question = "Test?";
    const outcomes = ["Yes", "No"];
    const tags = [];
    const entryFee = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 0.01);
    const endTime = new anchor.BN(Date.now() / 1000 + 86400);

    const [arenaPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("arena"),
        creator.publicKey.toBuffer(),
        Buffer.from(title),
      ],
      program.programId
    );

    // Create arena
    await program.methods
      .createArena(
        title,
        description,
        question,
        outcomes,
        tags,
        entryFee,
        endTime,
        false,
        null,
        null
      )
      .accounts({
        arena: arenaPda,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Join arena
    const user = creator; // Using same wallet for test
    const outcomeChosen = 0; // Choose "Yes"

    const [participantPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        arenaPda.toBuffer(),
        user.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .joinArena(outcomeChosen)
      .accounts({
        arena: arenaPda,
        participant: participantPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const arena = await program.account.arena.fetch(arenaPda);
    const participant = await program.account.participant.fetch(participantPda);

    assert.equal(arena.participantsCount, 1);
    assert.equal(participant.outcomeChosen, outcomeChosen);
    assert.equal(participant.amount.toString(), entryFee.toString());
  });
});

