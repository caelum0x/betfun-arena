import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyHeliusWebhook, extractSignature } from '../src/webhook/verify'
import { createHmac } from 'crypto'

describe('Webhook Verification', () => {
  describe('verifyHeliusWebhook', () => {
    it('should verify valid signatures', () => {
      const secret = 'test-secret'
      const payload = JSON.stringify({ test: 'data' })
      
      const hmac = createHmac('sha256', secret)
      hmac.update(payload)
      const signature = hmac.digest('hex')

      const result = verifyHeliusWebhook(payload, signature, secret)
      expect(result).toBe(true)
    })

    it('should reject invalid signatures', () => {
      const secret = 'test-secret'
      const payload = JSON.stringify({ test: 'data' })
      const invalidSignature = 'invalid-signature'

      const result = verifyHeliusWebhook(payload, invalidSignature, secret)
      expect(result).toBe(false)
    })

    it('should reject when secret is missing', () => {
      const payload = JSON.stringify({ test: 'data' })
      const signature = 'some-signature'

      const result = verifyHeliusWebhook(payload, signature, '')
      expect(result).toBe(false)
    })

    it('should reject tampered payloads', () => {
      const secret = 'test-secret'
      const originalPayload = JSON.stringify({ test: 'data' })
      
      const hmac = createHmac('sha256', secret)
      hmac.update(originalPayload)
      const signature = hmac.digest('hex')

      const tamperedPayload = JSON.stringify({ test: 'tampered' })

      const result = verifyHeliusWebhook(tamperedPayload, signature, secret)
      expect(result).toBe(false)
    })
  })

  describe('extractSignature', () => {
    it('should extract signature from headers', () => {
      const headers = {
        'x-helius-signature': 'test-signature',
      }

      const signature = extractSignature(headers)
      expect(signature).toBe('test-signature')
    })

    it('should handle case-insensitive headers', () => {
      const headers = {
        'X-Helius-Signature': 'test-signature',
      }

      const signature = extractSignature(headers)
      expect(signature).toBe('test-signature')
    })

    it('should return null when signature is missing', () => {
      const headers = {}

      const signature = extractSignature(headers)
      expect(signature).toBe(null)
    })

    it('should handle array headers', () => {
      const headers = {
        'x-helius-signature': ['signature1', 'signature2'],
      }

      const signature = extractSignature(headers)
      expect(signature).toBe('signature1')
    })
  })
})

