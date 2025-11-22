use anchor_lang::prelude::*;

#[account]
pub struct Participant {
    /// Arena this participant joined
    pub arena: Pubkey,
    
    /// Participant's wallet
    pub wallet: Pubkey,
    
    /// Outcome chosen by participant
    pub outcome_chosen: u8,
    
    /// Amount staked in lamports
    pub amount: u64,
    
    /// Whether winnings have been claimed
    pub claimed: bool,
    
    /// Timestamp when joined
    pub joined_at: i64,
    
    /// Trophy NFT mint (if winner minted trophy)
    pub trophy_mint: Option<Pubkey>,
    
    /// Bump for PDA
    pub bump: u8,
}

impl Participant {
    /// Calculate space needed for Participant account
    pub const SIZE: usize = 
        8 +   // discriminator
        32 +  // arena
        32 +  // wallet
        1 +   // outcome_chosen
        8 +   // amount
        1 +   // claimed
        8 +   // joined_at
        1 + 32 + // trophy_mint Option<Pubkey>
        1 +   // bump
        32;   // padding
}
