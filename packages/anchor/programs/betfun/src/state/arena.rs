use anchor_lang::prelude::*;

#[account]
pub struct Arena {
    /// Arena creator
    pub creator: Pubkey,
    
    /// Arena title (max 80 chars)
    pub title: String,
    
    /// Arena description (max 280 chars)
    pub description: String,
    
    /// Question being predicted
    pub question: String,
    
    /// Possible outcomes (2-6 options)
    pub outcomes: Vec<String>,
    
    /// Tags for categorization
    pub tags: Vec<String>,
    
    /// Entry fee in lamports
    pub entry_fee: u64,
    
    /// Total pot accumulated
    pub pot: u64,
    
    /// Number of participants
    pub participants_count: u32,
    
    /// Outcome distribution (count per outcome)
    pub outcome_counts: Vec<u32>,
    
    /// Outcome pot distribution (lamports per outcome)
    pub outcome_pots: Vec<u64>,
    
    /// Whether arena is resolved
    pub resolved: bool,
    
    /// Winning outcome index (if resolved)
    pub winner_outcome: Option<u8>,
    
    /// End timestamp (Unix)
    pub end_time: i64,
    
    /// Manual resolution flag
    pub manual_resolve: bool,
    
    /// Oracle pubkey (for automated resolution)
    pub oracle: Option<Pubkey>,
    
    /// Optional token mint for tokenized arenas
    pub token_mint: Option<Pubkey>,
    
    /// Creator fee percentage (basis points, e.g., 500 = 5%)
    pub creator_fee_bps: u16,
    
    /// Created timestamp
    pub created_at: i64,
    
    /// Bump for PDA
    pub bump: u8,
}

impl Arena {
    pub const MAX_TITLE_LEN: usize = 80;
    pub const MAX_DESC_LEN: usize = 280;
    pub const MAX_QUESTION_LEN: usize = 200;
    pub const MAX_OUTCOME_LEN: usize = 40;
    pub const MAX_OUTCOMES: usize = 6;
    pub const MIN_OUTCOMES: usize = 2;
    pub const MAX_TAGS: usize = 5;
    pub const MAX_TAG_LEN: usize = 20;
    pub const DEFAULT_CREATOR_FEE_BPS: u16 = 500; // 5%
    
    /// Calculate space needed for Arena account
    pub fn space(
        title_len: usize,
        desc_len: usize,
        question_len: usize,
        outcomes_count: usize,
        tags_count: usize,
    ) -> usize {
        8 + // discriminator
        32 + // creator
        4 + title_len + // title (String)
        4 + desc_len + // description
        4 + question_len + // question
        4 + (outcomes_count * (4 + Self::MAX_OUTCOME_LEN)) + // outcomes Vec
        4 + (tags_count * (4 + Self::MAX_TAG_LEN)) + // tags Vec
        8 + // entry_fee
        8 + // pot
        4 + // participants_count
        4 + (outcomes_count * 4) + // outcome_counts Vec<u32>
        4 + (outcomes_count * 8) + // outcome_pots Vec<u64>
        1 + // resolved bool
        1 + 1 + // winner_outcome Option<u8>
        8 + // end_time
        1 + // manual_resolve
        1 + 32 + // oracle Option<Pubkey>
        1 + 32 + // token_mint Option<Pubkey>
        2 + // creator_fee_bps
        8 + // created_at
        1 + // bump
        128 // padding for future fields
    }
    
    /// Check if arena has ended
    pub fn has_ended(&self, current_time: i64) -> bool {
        !self.manual_resolve && current_time >= self.end_time
    }
    
    /// Calculate creator fee from pot
    pub fn calculate_creator_fee(&self) -> u64 {
        (self.pot as u128)
            .checked_mul(self.creator_fee_bps as u128)
            .and_then(|v| v.checked_div(10000))
            .and_then(|v| u64::try_from(v).ok())
            .unwrap_or(0)
    }
    
    /// Calculate winner's payout
    pub fn calculate_payout(&self, participant_amount: u64) -> Result<u64> {
        require!(self.resolved, crate::error::BetFunError::NotResolved);
        
        let winner_outcome = self.winner_outcome
            .ok_or(crate::error::BetFunError::InvalidOutcome)?;
        
        let winner_pot = self.outcome_pots[winner_outcome as usize];
        
        if winner_pot == 0 {
            return Ok(participant_amount); // Return original if no one else won
        }
        
        let creator_fee = self.calculate_creator_fee();
        let distributable_pot = self.pot
            .checked_sub(creator_fee)
            .ok_or(crate::error::BetFunError::ArithmeticOverflow)?;
        
        // Calculate proportional payout
        let payout = (participant_amount as u128)
            .checked_mul(distributable_pot as u128)
            .and_then(|v| v.checked_div(winner_pot as u128))
            .and_then(|v| u64::try_from(v).ok())
            .ok_or(crate::error::BetFunError::ArithmeticOverflow)?;
        
        Ok(payout)
    }
}

