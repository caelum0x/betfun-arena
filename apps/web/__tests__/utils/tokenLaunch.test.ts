import { describe, it, expect, vi, beforeEach } from 'vitest'
import { launchToken, getBondingCurveData } from '../../lib/indie-fun/tokenLaunch'

// Mock fetch globally
global.fetch = vi.fn()

describe('Indie.fun Token Launch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('launchToken', () => {
    it('should successfully launch a token', async () => {
      const mockResponse = {
        tokenMint: 'TokenMint123',
        bondingCurveAddress: 'BondingCurve456',
        success: true,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await launchToken({
        name: 'Test Token',
        symbol: 'TEST',
        description: 'Test Description',
        creatorWallet: 'Creator123',
        arenaId: 'Arena456',
      })

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should throw error when API key is not configured', async () => {
      const originalEnv = process.env.INDIE_FUN_API_KEY
      delete process.env.INDIE_FUN_API_KEY

      await expect(
        launchToken({
          name: 'Test',
          symbol: 'TEST',
          description: 'Test',
          creatorWallet: 'Creator',
          arenaId: 'Arena',
        })
      ).rejects.toThrow('Indie.fun API key not configured')

      process.env.INDIE_FUN_API_KEY = originalEnv
    })

    it('should validate required fields', async () => {
      await expect(
        launchToken({
          name: '',
          symbol: 'TEST',
          description: 'Test',
          creatorWallet: 'Creator',
        } as any)
      ).rejects.toThrow('Missing required fields')
    })

    it('should retry on network errors', async () => {
      ;(global.fetch as any)
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      const result = await launchToken({
        name: 'Test',
        symbol: 'TEST',
        description: 'Test',
        creatorWallet: 'Creator',
        arenaId: 'Arena',
      })

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      await expect(
        launchToken({
          name: 'Test',
          symbol: 'TEST',
          description: 'Test',
          creatorWallet: 'Creator',
          arenaId: 'Arena',
        })
      ).rejects.toThrow('Indie.fun API error')
    })
  })

  describe('getBondingCurveData', () => {
    it('should fetch bonding curve data', async () => {
      const mockData = {
        currentPrice: 0.5,
        marketCap: 100000,
        supply: 200000,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await getBondingCurveData('TokenMint123')

      expect(result).toEqual(mockData)
    })

    it('should use cached data when available', async () => {
      const mockData = { currentPrice: 0.5 }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      // First call - should fetch
      await getBondingCurveData('TokenMint123')

      // Second call - should use cache
      const result = await getBondingCurveData('TokenMint123')

      expect(global.fetch).toHaveBeenCalledTimes(1) // Only called once
      expect(result).toEqual(mockData)
    })
  })
})

