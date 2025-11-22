import { describe, it, expect, vi } from 'vitest'
import { rateLimit } from '../src/middleware/rateLimit'
import { AppError } from '../src/middleware/errorHandler'
import express from 'express'
import request from 'supertest'

describe('Middleware', () => {
  describe('Rate Limiting', () => {
    it('should allow requests under the limit', async () => {
      const app = express()
      app.use(rateLimit({ max: 5, windowMs: 60000 }))
      app.get('/test', (req, res) => res.json({ success: true }))

      for (let i = 0; i < 5; i++) {
        const response = await request(app).get('/test')
        expect(response.status).toBe(200)
      }
    })

    it('should block requests over the limit', async () => {
      const app = express()
      app.use(rateLimit({ max: 2, windowMs: 60000 }))
      app.get('/test', (req, res) => res.json({ success: true }))

      // First 2 requests should succeed
      await request(app).get('/test')
      await request(app).get('/test')

      // Third request should be rate limited
      const response = await request(app).get('/test')
      expect(response.status).toBe(429)
      expect(response.body).toHaveProperty('error')
    })

    it('should include rate limit headers', async () => {
      const app = express()
      app.use(rateLimit({ max: 10, windowMs: 60000 }))
      app.get('/test', (req, res) => res.json({ success: true }))

      const response = await request(app).get('/test')

      expect(response.headers).toHaveProperty('x-ratelimit-limit')
      expect(response.headers).toHaveProperty('x-ratelimit-remaining')
      expect(response.headers).toHaveProperty('x-ratelimit-reset')
    })
  })

  describe('Error Handler', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR')

      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('TEST_ERROR')
      expect(error.isOperational).toBe(true)
    })

    it('should format error responses', () => {
      const error = new AppError('Validation failed', 400, 'VALIDATION_ERROR')

      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })
})

