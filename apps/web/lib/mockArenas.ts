import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { Arena } from "@betfun/sdk";

/**
 * Generate mock arenas for development/testing
 * These are displayed when no real arenas are found on-chain
 */
export function generateMockArenas(): Arena[] {
  const now = Math.floor(Date.now() / 1000);
  const oneDay = 24 * 60 * 60;
  const oneWeek = 7 * oneDay;

  // Generate a deterministic PublicKey from a string seed
  const createMockPublicKey = (seed: string): PublicKey => {
    // Use a simple hash-like approach to create deterministic keys
    const buffer = Buffer.from(seed.padEnd(32, '0'));
    return new PublicKey(buffer);
  };

  return [
    {
      address: createMockPublicKey("mock-arena-1"),
      creator: createMockPublicKey("mock-creator-1"),
      title: "Will Bitcoin hit $100k by end of 2024?",
      description: "Predict whether Bitcoin will reach $100,000 USD by December 31, 2024. This is a popular prediction market with high participation.",
      question: "Will Bitcoin reach $100,000 by December 31, 2024?",
      outcomes: ["Yes", "No"],
      tags: ["crypto", "bitcoin", "price-prediction"],
      entryFee: new BN(100000000), // 0.1 SOL
      endTime: new BN(now + oneWeek),
      resolved: false,
      winnerOutcome: null,
      totalPot: new BN(5000000000), // 5 SOL
      participantCount: 47,
      createdAt: new BN(now - 2 * oneDay),
    },
    {
      address: createMockPublicKey("mock-arena-2"),
      creator: createMockPublicKey("mock-creator-2"),
      title: "Ethereum Layer 2 Adoption",
      description: "Which Layer 2 solution will have the highest TVL by Q2 2024?",
      question: "Which Ethereum L2 will have the highest TVL by Q2 2024?",
      outcomes: ["Arbitrum", "Optimism", "Base", "Polygon zkEVM"],
      tags: ["ethereum", "defi", "layer2"],
      entryFee: new BN(50000000), // 0.05 SOL
      endTime: new BN(now + 3 * oneDay),
      resolved: false,
      winnerOutcome: null,
      totalPot: new BN(2500000000), // 2.5 SOL
      participantCount: 32,
      createdAt: new BN(now - oneDay),
    },
    {
      address: createMockPublicKey("mock-arena-3"),
      creator: createMockPublicKey("mock-creator-3"),
      title: "Solana Network Performance",
      description: "Will Solana handle 100k TPS by mid-2024?",
      question: "Will Solana achieve 100k TPS by June 2024?",
      outcomes: ["Yes", "No"],
      tags: ["solana", "scalability", "blockchain"],
      entryFee: new BN(200000000), // 0.2 SOL
      endTime: new BN(now + 5 * oneDay),
      resolved: false,
      winnerOutcome: null,
      totalPot: new BN(8000000000), // 8 SOL
      participantCount: 89,
      createdAt: new BN(now - 3 * oneDay),
    },
    {
      address: createMockPublicKey("mock-arena-4"),
      creator: createMockPublicKey("mock-creator-4"),
      title: "AI Model Competition",
      description: "Which AI model will win the next benchmark test?",
      question: "Which AI model will score highest on the next MLPerf benchmark?",
      outcomes: ["GPT-5", "Claude 4", "Gemini Ultra", "Llama 3"],
      tags: ["ai", "technology", "competition"],
      entryFee: new BN(150000000), // 0.15 SOL
      endTime: new BN(now + oneWeek),
      resolved: false,
      winnerOutcome: null,
      totalPot: new BN(12000000000), // 12 SOL
      participantCount: 156,
      createdAt: new BN(now - 4 * oneDay),
    },
    {
      address: createMockPublicKey("mock-arena-5"),
      creator: createMockPublicKey("mock-creator-5"),
      title: "Sports Championship Winner",
      description: "Who will win the 2024 NBA Championship?",
      question: "Which team will win the 2024 NBA Championship?",
      outcomes: ["Lakers", "Warriors", "Celtics", "Bucks", "Nuggets"],
      tags: ["sports", "nba", "basketball"],
      entryFee: new BN(100000000), // 0.1 SOL
      endTime: new BN(now + 2 * oneWeek),
      resolved: false,
      winnerOutcome: null,
      totalPot: new BN(3000000000), // 3 SOL
      participantCount: 24,
      createdAt: new BN(now - oneDay),
    },
    {
      address: createMockPublicKey("mock-arena-6"),
      creator: createMockPublicKey("mock-creator-6"),
      title: "Election Prediction",
      description: "Who will win the next major election?",
      question: "Who will win the 2024 US Presidential Election?",
      outcomes: ["Candidate A", "Candidate B", "Third Party"],
      tags: ["politics", "election", "prediction"],
      entryFee: new BN(50000000), // 0.05 SOL
      endTime: new BN(now + 6 * oneDay),
      resolved: false,
      winnerOutcome: null,
      totalPot: new BN(1500000000), // 1.5 SOL
      participantCount: 18,
      createdAt: new BN(now - 2 * oneDay),
    },
    {
      address: createMockPublicKey("mock-arena-7"),
      creator: createMockPublicKey("mock-creator-7"),
      title: "Stock Market Prediction",
      description: "Will the S&P 500 hit a new all-time high?",
      question: "Will the S&P 500 reach a new all-time high by Q3 2024?",
      outcomes: ["Yes", "No"],
      tags: ["stocks", "finance", "market"],
      entryFee: new BN(250000000), // 0.25 SOL
      endTime: new BN(now + oneWeek),
      resolved: false,
      winnerOutcome: null,
      totalPot: new BN(10000000000), // 10 SOL
      participantCount: 203,
      createdAt: new BN(now - 5 * oneDay),
    },
    {
      address: createMockPublicKey("mock-arena-8"),
      creator: createMockPublicKey("mock-creator-8"),
      title: "Gaming Release Date",
      description: "When will the next major game release?",
      question: "When will GTA 6 be released?",
      outcomes: ["Q1 2024", "Q2 2024", "Q3 2024", "Q4 2024", "2025 or later"],
      tags: ["gaming", "entertainment", "release"],
      entryFee: new BN(75000000), // 0.075 SOL
      endTime: new BN(now + 4 * oneDay),
      resolved: false,
      winnerOutcome: null,
      totalPot: new BN(4500000000), // 4.5 SOL
      participantCount: 67,
      createdAt: new BN(now - 3 * oneDay),
    },
    {
      address: createMockPublicKey("mock-arena-9"),
      creator: createMockPublicKey("mock-creator-9"),
      title: "RESOLVED: Tech Stock Performance",
      description: "Which tech stock performed best in Q1 2024?",
      question: "Which tech stock had the best performance in Q1 2024?",
      outcomes: ["Apple", "Microsoft", "Google", "Amazon"],
      tags: ["stocks", "tech", "resolved"],
      entryFee: new BN(100000000), // 0.1 SOL
      endTime: new BN(now - oneDay),
      resolved: true,
      winnerOutcome: 1, // Microsoft
      totalPot: new BN(6000000000), // 6 SOL
      participantCount: 92,
      createdAt: new BN(now - 2 * oneWeek),
    },
  ];
}

