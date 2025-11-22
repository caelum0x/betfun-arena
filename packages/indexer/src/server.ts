import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { feedRouter } from "./api/feed";
import { potRouter } from "./api/pot";
import { tradingRouter } from "./api/trading";
import { portfolioRouter } from "./api/portfolio";
import { webhookRouter } from "./webhook/solana";
import { healthRouter } from "./health";
import { requestLogger, errorLogger } from "./middleware/logger";
import { apiRateLimit, webhookRateLimit } from "./middleware/rateLimit";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { configureHelmet } from "./security/helmet";
import { corsOptions } from "./security/cors";
import { initSentry, sentryErrorHandler } from "./monitoring/sentry";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Initialize Sentry (must be first)
initSentry(app);

// Security middleware
configureHelmet(app);
app.use(cors(corsOptions));

// Store raw body for webhook signature verification
app.use(
  "/webhook",
  express.json({ limit: "10mb", verify: (req: any, res, buf) => {
    req.rawBody = buf.toString("utf8");
  }})
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use(requestLogger);

// Health check routes (no rate limit)
app.use("/health", healthRouter);

// API Routes with rate limiting
app.use("/api/arenas", apiRateLimit(), feedRouter);
app.use("/api/pot", apiRateLimit(), potRouter);
app.use("/api/trading", apiRateLimit(), tradingRouter);
app.use("/api/portfolio", apiRateLimit(), portfolioRouter);
app.use("/webhook", webhookRateLimit(), webhookRouter);

// 404 handler
app.use(notFoundHandler);

// Sentry error handler (must be before other error handlers)
app.use(sentryErrorHandler());

// Error logging
app.use(errorLogger);

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  process.exit(0);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 BetFun Arena Indexer running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

export default app;

