import * as Sentry from '@sentry/node'
import { Express } from 'express'

/**
 * Initialize Sentry for error tracking
 */
export function initSentry(app: Express) {
  if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not configured, skipping Sentry initialization')
    return
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
    ],
  })

  // RequestHandler creates a separate execution context using domains
  app.use(Sentry.Handlers.requestHandler())
  
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler())
}

/**
 * Error handler must be before any other error middleware
 */
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status code >= 500
      return error.statusCode >= 500
    },
  })
}

/**
 * Manually capture exception
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * Capture message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level)
}

