import cors from 'cors'

/**
 * Strict CORS configuration for production
 */
export const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true)
    }

    // Whitelist of allowed origins
    const allowedOrigins = [
      'https://betfun.arena',
      'https://www.betfun.arena',
      'https://betfun-arena.vercel.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean)

    // Development mode
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000')
      allowedOrigins.push('http://127.0.0.1:3000')
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400, // 24 hours
}

