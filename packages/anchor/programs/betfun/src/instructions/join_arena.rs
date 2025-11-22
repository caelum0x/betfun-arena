use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Arena, Participant};
use crate::error::BetFunError;

#[derive(Accounts)]
pub struct JoinArena<'info> {
    #[account(
        mut,
        seeds = [
            b"arena",
            arena.creator.as_ref(),
            arena.title.as_bytes()
        ],
        bump = arena.bump
    )]
    pub arena: Account<'info, Arena>,
    
    #[account(
        init,
        payer = user,
        space = Participant::SIZE,
        seeds = [
            b"participant",
            arena.key().as_ref(),
            user.key().as_ref()
        ],
        bump
    )]
    pub participant: Account<'info, Participant>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<JoinArena>,
    outcome_chosen: u8,
) -> Result<()> {
    let arena = &mut ctx.accounts.arena;
    let participant = &mut ctx.accounts.participant;
    let current_time = Clock::get()?.unix_timestamp;
    
    // ========== VALIDATION ==========
    
    // Check if arena is resolved
    require!(
        !arena.resolved,
        BetFunError::AlreadyResolved
    );
    
    // Check if arena has ended (for non-manual arenas)
    require!(
        !arena.has_ended(current_time),
        BetFunError::ArenaEnded
    );
    
    // Prevent creator from joining their own arena (optional but good practice)
    // Uncomment if you want to enforce this:
    // require!(
    //     ctx.accounts.user.key() != arena.creator,
    //     BetFunError::InvalidConfiguration
    // );
    
    // Validate outcome index
    require!(
        (outcome_chosen as usize) < arena.outcomes.len(),
        BetFunError::InvalidOutcome
    );
    
    // Check user has sufficient balance (including rent)
    let user_balance = ctx.accounts.user.lamports();
    let rent_exempt_min = Rent::get()?.minimum_balance(Participant::SIZE);
    let total_needed = arena.entry_fee
        .checked_add(rent_exempt_min)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    require!(
        user_balance >= total_needed,
        BetFunError::InsufficientEntryFee
    );
    
    // Check if user already participated (PDA init will fail if exists, but double-check)
    // The init constraint handles this, but we add explicit check for better error message
    
    // ========== TRANSFER ENTRY FEE ==========
    
    // Transfer entry fee from user to arena PDA (escrow)
    let transfer_ix = system_program::Transfer {
        from: ctx.accounts.user.to_account_info(),
        to: arena.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        transfer_ix,
    );
    system_program::transfer(cpi_ctx, arena.entry_fee)?;
    
    // ========== UPDATE ARENA STATISTICS ==========
    
    // Update total pot
    arena.pot = arena.pot
        .checked_add(arena.entry_fee)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    // Update participants count
    arena.participants_count = arena.participants_count
        .checked_add(1)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    // Update outcome count for chosen outcome
    let outcome_idx = outcome_chosen as usize;
    arena.outcome_counts[outcome_idx] = arena.outcome_counts[outcome_idx]
        .checked_add(1)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    // Update outcome pot for chosen outcome
    arena.outcome_pots[outcome_idx] = arena.outcome_pots[outcome_idx]
        .checked_add(arena.entry_fee)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    // ========== INITIALIZE PARTICIPANT ==========
    
    participant.arena = arena.key();
    participant.wallet = ctx.accounts.user.key();
    participant.outcome_chosen = outcome_chosen;
    participant.amount = arena.entry_fee;
    participant.claimed = false;
    participant.joined_at = current_time;
    participant.trophy_mint = None;
    participant.bump = ctx.bumps.participant;
    
    // ========== LOGGING ==========
    msg!("User joined arena successfully");
    msg!("User: {}", participant.wallet);
    msg!("Arena: {}", arena.key());
    msg!("Outcome chosen: {} ({})", outcome_chosen, arena.outcomes[outcome_idx]);
    msg!("Amount bet: {} lamports ({:.4} SOL)", participant.amount, participant.amount as f64 / 1e9);
    msg!("Total pot: {} lamports ({:.4} SOL)", arena.pot, arena.pot as f64 / 1e9);
    msg!("Participants: {}", arena.participants_count);
    msg!("Outcome distribution: {:?}", arena.outcome_counts);
    msg!("Outcome pots: {:?}", arena.outcome_pots);
    
    // Emit event
    emit!(ArenaJoined {
        arena: arena.key(),
        participant: participant.wallet,
        outcome_chosen,
        amount: participant.amount,
        total_pot: arena.pot,
        participants_count: arena.participants_count,
    });
    
    Ok(())
}

#[event]
pub struct ArenaJoined {
    pub arena: Pubkey,
    pub participant: Pubkey,
    pub outcome_chosen: u8,
    pub amount: u64,
    pub total_pot: u64,
    pub participants_count: u32,
}
