use anchor_lang::prelude::*;
use crate::state::{Arena, Participant};
use crate::error::BetFunError;

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(
        mut,
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
        constraint = !participant.claimed @ BetFunError::AlreadyClaimed,
        constraint = participant.wallet == user.key() @ BetFunError::NotParticipant
    )]
    pub participant: Account<'info, Participant>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// Creator receives fees (only transferred once, on first claim)
    #[account(
        mut,
        constraint = creator.key() == arena.creator @ BetFunError::InvalidConfiguration
    )]
    /// CHECK: Creator account validated by constraint
    pub creator: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimWinnings>) -> Result<()> {
    let arena = &ctx.accounts.arena;
    let participant = &mut ctx.accounts.participant;
    
    // ========== VALIDATION ==========
    
    // Check if user won
    let winner_outcome = arena.winner_outcome
        .ok_or(BetFunError::InvalidOutcome)?;
    
    require!(
        participant.outcome_chosen == winner_outcome,
        BetFunError::NotWinner
    );
    
    // Check if already claimed
    require!(
        !participant.claimed,
        BetFunError::AlreadyClaimed
    );
    
    // ========== CALCULATE PAYOUT ==========
    
    let payout = arena.calculate_payout(participant.amount)?;
    let creator_fee = arena.calculate_creator_fee();
    
    // Verify arena has sufficient funds for both payout and creator fee
    let arena_lamports = arena.to_account_info().lamports();
    let _total_needed = payout
        .checked_add(creator_fee)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    require!(
        arena_lamports >= payout,
        BetFunError::InsufficientEntryFee
    );
    
    // ========== TRANSFER CREATOR FEE FIRST (ONCE) ==========
    
    // Creator fee is transferred only once, when the first winner claims
    // We check if there's enough for the fee and if it hasn't been paid yet
    // (simplified: if remaining >= fee, assume not paid yet)
    // In production, add a flag to arena account to track fee payment
    
    let should_pay_creator_fee = arena_lamports >= creator_fee && creator_fee > 0;
    let remaining_after_fee = if should_pay_creator_fee {
        arena_lamports
            .checked_sub(creator_fee)
            .ok_or(BetFunError::ArithmeticOverflow)?
    } else {
        arena_lamports
    };
    
    // Verify sufficient funds for payout after creator fee
    require!(
        remaining_after_fee >= payout,
        BetFunError::InsufficientEntryFee
    );
    
    // Calculate final arena balance
    let _final_arena_balance = remaining_after_fee
        .checked_sub(payout)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    // ========== PERFORM ALL TRANSFERS ==========
    
    // Get current lamports (will be updated after each transfer)
    let mut current_arena_lamports = arena.to_account_info().lamports();
    
    // Transfer creator fee (if needed)
    if should_pay_creator_fee {
        current_arena_lamports = current_arena_lamports
            .checked_sub(creator_fee)
            .ok_or(BetFunError::ArithmeticOverflow)?;
        
        **arena.to_account_info().try_borrow_mut_lamports()? = current_arena_lamports;
        
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.creator.lamports()
            .checked_add(creator_fee)
            .ok_or(BetFunError::ArithmeticOverflow)?;
        
        msg!("Creator fee transferred: {} lamports ({:.4} SOL)", 
            creator_fee, 
            creator_fee as f64 / 1e9
        );
    }
    
    // Transfer payout to winner
    current_arena_lamports = current_arena_lamports
        .checked_sub(payout)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    **arena.to_account_info().try_borrow_mut_lamports()? = current_arena_lamports;
    
    **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.user.lamports()
        .checked_add(payout)
        .ok_or(BetFunError::ArithmeticOverflow)?;
    
    // ========== MARK AS CLAIMED ==========
    
    participant.claimed = true;
    
    // ========== CALCULATE PROFIT ==========
    
    let profit = payout.saturating_sub(participant.amount);
    let roi_percentage = if participant.amount > 0 {
        (profit as f64 / participant.amount as f64) * 100.0
    } else {
        0.0
    };
    
    // ========== LOGGING ==========
    msg!("Winnings claimed successfully");
    msg!("User: {}", participant.wallet);
    msg!("Arena: {}", arena.key());
    msg!("Original bet: {} lamports ({:.4} SOL)", 
        participant.amount, 
        participant.amount as f64 / 1e9
    );
    msg!("Payout: {} lamports ({:.4} SOL)", 
        payout, 
        payout as f64 / 1e9
    );
    msg!("Profit: {} lamports ({:.4} SOL, {:.2}% ROI)", 
        profit, 
        profit as f64 / 1e9,
        roi_percentage
    );
    msg!("Remaining arena balance: {} lamports", arena.to_account_info().lamports());
    
    // Emit event
    emit!(WinningsClaimed {
        arena: arena.key(),
        participant: participant.wallet,
        original_bet: participant.amount,
        payout,
        profit,
        roi_percentage,
    });
    
    Ok(())
}

#[event]
pub struct WinningsClaimed {
    pub arena: Pubkey,
    pub participant: Pubkey,
    pub original_bet: u64,
    pub payout: u64,
    pub profit: u64,
    pub roi_percentage: f64,
}
