import { z } from 'zod'

/**
 * Zod schemas for request validation
 */

export const CreateArenaSchema = z.object({
  arenaAccount: z.string().min(32).max(44),
  title: z.string().min(3).max(80),
  description: z.string().max(280).optional(),
  question: z.string().min(10).max(200),
  outcomes: z.array(z.string().min(1).max(40)).min(2).max(6),
  entryFee: z.number().min(0),
  endTime: z.number().positive(),
  creator: z.string().min(32).max(44),
  tags: z.array(z.string()).optional(),
})

export const JoinArenaSchema = z.object({
  arenaAccount: z.string().min(32).max(44),
  wallet: z.string().min(32).max(44),
  outcomeChosen: z.number().int().min(0),
  amount: z.number().positive(),
  signature: z.string().min(88).max(88),
})

export const ResolveArenaSchema = z.object({
  arenaAccount: z.string().min(32).max(44),
  winnerOutcome: z.number().int().min(0),
})

export const ClaimWinningsSchema = z.object({
  arenaAccount: z.string().min(32).max(44),
  wallet: z.string().min(32).max(44),
})

/**
 * Validate request data against schema
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, errors: result.error }
  }
}

