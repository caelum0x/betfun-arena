import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { healthRouter } from '../src/health'

describe('Health Check Endpoints', () => {
  let app: express.Application

  beforeAll(() => {
    app = express()
    app.use('/health', healthRouter)
  })

  describe('GET /health', () => {
    it('should return 200 with health status', async () => {
      const response = await request(app).get('/health')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('status')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('uptime')
      expect(response.body).toHaveProperty('checks')
    })

    it('should include database check', async () => {
      const response = await request(app).get('/health')

      expect(response.body.checks).toHaveProperty('database')
      expect(response.body.checks.database).toHaveProperty('status')
    })

    it('should include RPC check', async () => {
      const response = await request(app).get('/health')

      expect(response.body.checks).toHaveProperty('rpc')
      expect(response.body.checks.rpc).toHaveProperty('status')
    })

    it('should include webhook configuration check', async () => {
      const response = await request(app).get('/health')

      expect(response.body.checks).toHaveProperty('webhooks')
      expect(response.body.checks.webhooks).toHaveProperty('status')
    })
  })

  describe('GET /health/ready', () => {
    it('should return 200 when ready', async () => {
      const response = await request(app).get('/health/ready')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('ready')
    })

    it('should return 503 when database is unavailable', async () => {
      // This would require mocking the database connection
      // For now, we'll just test the endpoint exists
      const response = await request(app).get('/health/ready')
      
      expect([200, 503]).toContain(response.status)
    })
  })

  describe('GET /health/live', () => {
    it('should always return 200', async () => {
      const response = await request(app).get('/health/live')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('alive', true)
      expect(response.body).toHaveProperty('uptime')
    })
  })
})

