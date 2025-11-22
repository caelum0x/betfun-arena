import { beforeAll, afterAll, afterEach } from 'vitest'

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_KEY = 'test-key'
  process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com'
})

afterEach(() => {
  // Clear mocks after each test
})

afterAll(() => {
  // Cleanup
})

