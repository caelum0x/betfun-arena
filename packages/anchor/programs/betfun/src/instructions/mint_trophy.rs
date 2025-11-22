use anchor_lang::prelude::*;
use crate::state::{Arena, Participant};
use crate::error::BetFunError;

/// Record trophy NFT mint for winner
/// Note: Actual cNFT minting happens off-chain via Metaplex Bubblegum
/// This instruction records the mint address on-chain for verification
#[derive(Accounts)]
pub struct MintTrophy<'info> {
    #[account(
        seeds = [
            b"arena",
            arena.creator.as_ref(),
            arena.title.as_bytes()
        ],
        bump = arena.bump,
        constraint = arena.resolved @ BetFunError::NotResolved
    )]
    pub arena: Account<'info, Arena>,
    
    #[account(
        mut,
        seeds = [
            b"participant",
            arena.key().as_ref(),
            user.key().as_ref()
        ],
        bump = participant.bump,
        constraint = participant.wallet == user.key() @ BetFunError::NotParticipant,
        constraint = participant.claimed @ BetFunError::NotResolved
    )]
    pub participant: Account<'info, Participant>,
    
    pub user: Signer<'info>,
}

pub fn handler(
    ctx: Context<MintTrophy>,
    trophy_mint: Pubkey,
) -> Result<()> {
    let arena = &ctx.accounts.arena;
    let participant = &mut ctx.accounts.participant;
    
    // ========== VALIDATION ==========
    
    // Verify arena is resolved
    require!(
        arena.resolved,
        BetFunError::NotResolved
    );
    
    // Verify user won
    let winner_outcome = arena.winner_outcome
        .ok_or(BetFunError::InvalidOutcome)?;
    
    require!(
        participant.outcome_chosen == winner_outcome,
        BetFunError::NotWinner
    );
    
    // Verify winnings have been claimed (trophy is minted after claiming)
    require!(
        participant.claimed,
        BetFunError::NotResolved
    );
    
    // Verify trophy hasn't been minted yet
    require!(
        participant.trophy_mint.is_none(),
        BetFunError::AlreadyClaimed
    );
    
    // Verify mint address is not zero/empty
    require!(
        trophy_mint != Pubkey::default(),
        BetFunError::InvalidConfiguration
    );
    
    // ========== STORE TROPHY MINT ==========
    
    participant.trophy_mint = Some(trophy_mint);
    
    // ========== LOGGING ==========
    msg!("Trophy mint recorded successfully");
    msg!("User: {}", participant.wallet);
    msg!("Arena: {}", arena.key());
    msg!("Trophy mint: {}", trophy_mint);
    msg!("Outcome won: {} ({})", 
        participant.outcome_chosen,
        arena.outcomes[participant.outcome_chosen as usize]
    );
    msg!("Amount won: {} lamports ({:.4} SOL)", 
        participant.amount,
        participant.amount as f64 / 1e9
    );
    
    // Emit event
    emit!(TrophyMinted {
        arena: arena.key(),
        participant: participant.wallet,
        trophy_mint,
        outcome_won: participant.outcome_chosen,
        amount_won: participant.amount,
    });
    
    Ok(())
}

#[event]
pub struct TrophyMinted {
    pub arena: Pubkey,
    pub participant: Pubkey,
    pub trophy_mint: Pubkey,
    pub outcome_won: u8,
    pub amount_won: u64,
}

// Trophy metadata structure (for off-chain minting reference)
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TrophyMetadata {
    pub arena_title: String,
    pub arena_question: String,
    pub outcome_won: String,
    pub amount_won: u64,
    pub rarity: TrophyRarity,
    pub minted_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum TrophyRarity {
    Common,    // Regular win (< 1 SOL bet)
    Rare,      // Medium win (1-10 SOL bet)
    Epic,      // Large win (10-100 SOL bet)
    Legendary, // Whale win (> 100 SOL bet)
}

impl TrophyRarity {
    pub fn from_amount(amount: u64) -> Self {
        let sol_amount = amount as f64 / 1e9;
        
        if sol_amount >= 100.0 {
            TrophyRarity::Legendary
        } else if sol_amount >= 10.0 {
            TrophyRarity::Epic
        } else if sol_amount >= 1.0 {
            TrophyRarity::Rare
        } else {
            TrophyRarity::Common
        }
    }
}
