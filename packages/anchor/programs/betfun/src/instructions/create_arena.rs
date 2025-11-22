use anchor_lang::prelude::*;
use crate::state::Arena;
use crate::error::BetFunError;

#[derive(Accounts)]
#[instruction(title: String)]
pub struct CreateArena<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 4 + 80 + 4 + 280 + 4 + 200 + 4 + (6 * 44) + 4 + (5 * 24) + 8 + 8 + 4 + (6 * 4) + (6 * 8) + 1 + 1 + 1 + 8 + 1 + 1 + 32 + 1 + 32 + 2 + 8 + 1 + 128,
        seeds = [
            b"arena",
            creator.key().as_ref(),
            title.as_bytes()
        ],
        bump
    )]
    pub arena: Account<'info, Arena>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateArena>,
    title: String,
    description: String,
    question: String,
    outcomes: Vec<String>,
    tags: Vec<String>,
    entry_fee: u64,
    end_time: i64,
    manual_resolve: bool,
    oracle: Option<Pubkey>,
    token_mint: Option<Pubkey>,
) -> Result<()> {
    let arena = &mut ctx.accounts.arena;
    let current_time = Clock::get()?.unix_timestamp;
    
    // ========== VALIDATION ==========
    
    // Title validation
    require!(!title.is_empty(), BetFunError::InvalidConfiguration);
    require!(
        title.len() <= Arena::MAX_TITLE_LEN,
        BetFunError::TitleTooLong
    );
    require!(
        title.trim().len() >= 3, // Minimum 3 characters
        BetFunError::InvalidConfiguration
    );
    
    // Description validation (optional but if provided, must be valid)
    require!(
        description.len() <= Arena::MAX_DESC_LEN,
        BetFunError::DescriptionTooLong
    );
    
    // Question validation
    require!(!question.is_empty(), BetFunError::InvalidConfiguration);
    require!(
        question.len() <= Arena::MAX_QUESTION_LEN,
        BetFunError::InvalidConfiguration
    );
    require!(
        question.trim().len() > 0,
        BetFunError::InvalidConfiguration
    );
    require!(
        question.trim().len() >= 10, // Minimum question length
        BetFunError::InvalidConfiguration
    );
    
    // Outcomes validation
    require!(
        outcomes.len() >= Arena::MIN_OUTCOMES,
        BetFunError::TooFewOutcomes
    );
    require!(
        outcomes.len() <= Arena::MAX_OUTCOMES,
        BetFunError::TooManyOutcomes
    );
    
    // Validate each outcome
    for (idx, outcome) in outcomes.iter().enumerate() {
        require!(
            !outcome.is_empty(),
            BetFunError::InvalidConfiguration
        );
        require!(
            outcome.len() <= Arena::MAX_OUTCOME_LEN,
            BetFunError::InvalidConfiguration
        );
        require!(
            outcome.trim().len() >= 1, // Minimum 1 character
            BetFunError::InvalidConfiguration
        );
        
        // Check for duplicates (case-insensitive)
        for other_idx in (idx + 1)..outcomes.len() {
            require!(
                outcome.trim().to_lowercase() != outcomes[other_idx].trim().to_lowercase(),
                BetFunError::InvalidConfiguration
            );
        }
    }
    
    // Tags validation
    require!(
        tags.len() <= Arena::MAX_TAGS,
        BetFunError::InvalidConfiguration
    );
    
    for tag in tags.iter() {
        require!(
            tag.len() <= Arena::MAX_TAG_LEN,
            BetFunError::InvalidConfiguration
        );
        require!(
            !tag.is_empty(),
            BetFunError::InvalidConfiguration
        );
    }
    
    // Entry fee validation (minimum 0.001 SOL = 1_000_000 lamports)
    const MIN_ENTRY_FEE: u64 = 1_000_000; // 0.001 SOL
    const MAX_ENTRY_FEE: u64 = 10_000_000_000; // 10 SOL
    require!(
        entry_fee >= MIN_ENTRY_FEE,
        BetFunError::InsufficientEntryFee
    );
    require!(
        entry_fee <= MAX_ENTRY_FEE,
        BetFunError::InvalidConfiguration
    );
    
    // End time validation
    let final_end_time = if !manual_resolve {
        require!(
            end_time > current_time,
            BetFunError::InvalidEndTime
        );
        
        // Maximum arena duration: 1 year
        const MAX_DURATION: i64 = 365 * 24 * 60 * 60;
        require!(
            end_time <= current_time + MAX_DURATION,
            BetFunError::InvalidEndTime
        );
        
        end_time
    } else {
        // For manual resolve, set end_time to far future (1 year)
        // This allows creator to resolve at any time
        current_time + (365 * 24 * 60 * 60)
    };
    
    // Oracle validation (if provided)
    if let Some(oracle_pubkey) = oracle {
        require!(
            oracle_pubkey != ctx.accounts.creator.key(),
            BetFunError::InvalidConfiguration
        );
    }
    
    // ========== INITIALIZATION ==========
    
    // Initialize outcome counts and pots
    let outcomes_count = outcomes.len();
    let outcome_counts = vec![0u32; outcomes_count];
    let outcome_pots = vec![0u64; outcomes_count];
    
    // Set arena data
    arena.creator = ctx.accounts.creator.key();
    arena.title = title.trim().to_string();
    arena.description = description.trim().to_string();
    arena.question = question.trim().to_string();
    arena.outcomes = outcomes.iter().map(|o| o.trim().to_string()).collect();
    arena.tags = tags.iter().map(|t| t.trim().to_string()).collect();
    arena.entry_fee = entry_fee;
    arena.pot = 0;
    arena.participants_count = 0;
    arena.outcome_counts = outcome_counts;
    arena.outcome_pots = outcome_pots;
    arena.resolved = false;
    arena.winner_outcome = None;
    arena.end_time = final_end_time;
    arena.manual_resolve = manual_resolve;
    arena.oracle = oracle;
    arena.token_mint = token_mint;
    arena.creator_fee_bps = Arena::DEFAULT_CREATOR_FEE_BPS;
    arena.created_at = current_time;
    arena.bump = ctx.bumps.arena;
    
    // ========== LOGGING ==========
    msg!("Arena created successfully");
    msg!("Arena PDA: {}", arena.key());
    msg!("Creator: {}", arena.creator);
    msg!("Title: {}", arena.title);
    msg!("Question: {}", arena.question);
    msg!("Entry fee: {} lamports ({:.4} SOL)", arena.entry_fee, arena.entry_fee as f64 / 1e9);
    msg!("Outcomes: {:?}", arena.outcomes);
    msg!("Tags: {:?}", arena.tags);
    msg!("Manual resolve: {}", arena.manual_resolve);
    msg!("End time: {} (Unix timestamp)", arena.end_time);
    if let Some(oracle) = arena.oracle {
        msg!("Oracle: {}", oracle);
    }
    if let Some(token_mint) = arena.token_mint {
        msg!("Token mint: {}", token_mint);
    }
    
    // Emit event (if events are set up)
    emit!(ArenaCreated {
        arena: arena.key(),
        creator: arena.creator,
        title: arena.title.clone(),
        entry_fee: arena.entry_fee,
        outcomes_count: outcomes_count as u8,
    });
    
    Ok(())
}

#[event]
pub struct ArenaCreated {
    pub arena: Pubkey,
    pub creator: Pubkey,
    pub title: String,
    pub entry_fee: u64,
    pub outcomes_count: u8,
}
