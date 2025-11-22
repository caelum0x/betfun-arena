use anchor_lang::prelude::*;

#[error_code]
pub enum BetFunError {
    #[msg("Arena has already ended")]
    ArenaEnded,
    
    #[msg("Arena has not ended yet")]
    ArenaNotEnded,
    
    #[msg("Invalid outcome index")]
    InvalidOutcome,
    
    #[msg("User has already joined this arena")]
    AlreadyJoined,
    
    #[msg("Arena is already resolved")]
    AlreadyResolved,
    
    #[msg("Arena is not resolved yet")]
    NotResolved,
    
    #[msg("Only creator or oracle can resolve")]
    UnauthorizedResolver,
    
    #[msg("User did not participate in this arena")]
    NotParticipant,
    
    #[msg("User did not win")]
    NotWinner,
    
    #[msg("Winnings already claimed")]
    AlreadyClaimed,
    
    #[msg("Insufficient entry fee")]
    InsufficientEntryFee,
    
    #[msg("Invalid arena configuration")]
    InvalidConfiguration,
    
    #[msg("Too many outcomes (max 6)")]
    TooManyOutcomes,
    
    #[msg("Too few outcomes (min 2)")]
    TooFewOutcomes,
    
    #[msg("Arena title too long (max 80 chars)")]
    TitleTooLong,
    
    #[msg("Arena description too long (max 280 chars)")]
    DescriptionTooLong,
    
    #[msg("End time must be in the future")]
    InvalidEndTime,
    
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Insufficient funds")]
    InsufficientFunds,
    
    #[msg("Invalid amount")]
    InvalidAmount,
    
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
    
    #[msg("Slippage tolerance exceeded")]
    SlippageToleranceExceeded,
    
    #[msg("Insufficient output amount")]
    InsufficientOutputAmount,
    
    #[msg("Insufficient liquidity minted")]
    InsufficientLiquidityMinted,
}

