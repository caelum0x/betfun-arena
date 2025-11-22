import helmet from 'helmet'
import { Express } from 'express'

/**
 * Configure Helmet security headers
 */
export function configureHelmet(app: Express) {
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.mainnet-beta.solana.com', 'https://*.supabase.co'],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      // DNS Prefetch Control
      dnsPrefetchControl: { allow: false },
      // Frame Guard
      frameguard: { action: 'deny' },
      // Hide Powered By
      hidePoweredBy: true,
      // HSTS
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      // IE No Open
      ieNoOpen: true,
      // No Sniff
      noSniff: true,
      // Referrer Policy
      referrerPolicy: { policy: 'same-origin' },
      // XSS Filter
      xssFilter: true,
    })
  )
}

