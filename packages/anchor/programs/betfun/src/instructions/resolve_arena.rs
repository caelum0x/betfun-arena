use anchor_lang::prelude::*;
use crate::state::Arena;
use crate::error::BetFunError;

#[derive(Accounts)]
pub struct ResolveArena<'info> {
    #[account(
        mut,
        seeds = [
            b"arena",
            arena.creator.as_ref(),
            arena.title.as_bytes()
        ],
        bump = arena.bump,
        constraint = !arena.resolved @ BetFunError::AlreadyResolved
    )]
    pub arena: Account<'info, Arena>,
    
    /// Can be creator or oracle (for automated resolution)
    pub resolver: Signer<'info>,
}

pub fn handler(
    ctx: Context<ResolveArena>,
    winner_outcome: u8,
) -> Result<()> {
    let arena = &mut ctx.accounts.arena;
    let current_time = Clock::get()?.unix_timestamp;
    
    // ========== AUTHORIZATION CHECK ==========
    
    let is_creator = ctx.accounts.resolver.key() == arena.creator;
    let is_oracle = arena.oracle
        .map(|oracle_pubkey| oracle_pubkey == ctx.accounts.resolver.key())
        .unwrap_or(false);
    
    require!(
        is_creator || is_oracle,
        BetFunError::UnauthorizedResolver
    );
    
    // ========== RESOLUTION VALIDATION ==========
    
    // For non-manual arenas, check if ended
    if !arena.manual_resolve {
        require!(
            arena.has_ended(current_time),
            BetFunError::ArenaNotEnded
        );
    }
    // For manual arenas, creator can resolve at any time
    
    // Validate winner outcome index
    require!(
        (winner_outcome as usize) < arena.outcomes.len(),
        BetFunError::InvalidOutcome
    );
    
    // Check if there are participants
    require!(
        arena.participants_count > 0,
        BetFunError::InvalidConfiguration
    );
    
    // Check if chosen outcome has participants
    let winner_count = arena.outcome_counts[winner_outcome as usize];
    require!(
        winner_count > 0,
        BetFunError::InvalidOutcome
    );
    
    // ========== RESOLVE ARENA ==========
    
    arena.resolved = true;
    arena.winner_outcome = Some(winner_outcome);
    
    // ========== CALCULATE STATISTICS ==========
    
    let winner_pot = arena.outcome_pots[winner_outcome as usize];
    let creator_fee = arena.calculate_creator_fee();
    let distributable_pot = arena.pot
        .checked_sub(creator_fee)
        .unwrap_or(0);
    
    // ========== LOGGING ==========
    msg!("Arena resolved successfully");
    msg!("Arena: {}", arena.key());
    msg!("Resolver: {} ({})", 
        ctx.accounts.resolver.key(),
        if is_creator { "creator" } else { "oracle" }
    );
    msg!("Winner outcome: {} ({})", 
        winner_outcome, 
        arena.outcomes[winner_outcome as usize]
    );
    msg!("Total pot: {} lamports ({:.4} SOL)", arena.pot, arena.pot as f64 / 1e9);
    msg!("Winner pot: {} lamports ({:.4} SOL)", winner_pot, winner_pot as f64 / 1e9);
    msg!("Winners count: {}", winner_count);
    msg!("Creator fee: {} lamports ({:.4} SOL)", creator_fee, creator_fee as f64 / 1e9);
    msg!("Distributable pot: {} lamports ({:.4} SOL)", distributable_pot, distributable_pot as f64 / 1e9);
    msg!("Total participants: {}", arena.participants_count);
    
    // Emit event
    emit!(ArenaResolved {
        arena: arena.key(),
        resolver: ctx.accounts.resolver.key(),
        winner_outcome,
        total_pot: arena.pot,
        winner_pot,
        winners_count: winner_count,
        creator_fee,
        distributable_pot,
    });
    
    Ok(())
}

#[event]
pub struct ArenaResolved {
    pub arena: Pubkey,
    pub resolver: Pubkey,
    pub winner_outcome: u8,
    pub total_pot: u64,
    pub winner_pot: u64,
    pub winners_count: u32,
    pub creator_fee: u64,
    pub distributable_pot: u64,
}
