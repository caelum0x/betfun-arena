/**
 * Cloudflare Configuration for BetFun Arena
 * 
 * This configuration enables:
 * - CDN caching for static assets
 * - Image optimization
 * - DDoS protection
 * - Web Application Firewall (WAF)
 * - Rate limiting
 * - Bot protection
 */

module.exports = {
  // ========== CACHING RULES ==========
  caching: {
    // Cache static assets aggressively
    staticAssets: {
      match: '\\.(js|css|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$',
      cacheTTL: 31536000, // 1 year
      browserTTL: 31536000,
      edgeTTL: 31536000,
    },
    
    // Cache API responses with shorter TTL
    apiResponses: {
      match: '/api/',
      cacheTTL: 300, // 5 minutes
      browserTTL: 0, // Don't cache in browser
      edgeTTL: 300,
      bypassOnCookie: true,
    },
    
    // Cache HTML pages
    htmlPages: {
      match: '/$|/feed$|/leaderboard$|/portfolio$|/analytics$',
      cacheTTL: 60, // 1 minute
      browserTTL: 0,
      edgeTTL: 60,
    },
  },

  // ========== IMAGE OPTIMIZATION ==========
  imageOptimization: {
    enabled: true,
    formats: ['webp', 'avif'],
    quality: 85,
    // Automatically resize images based on device
    responsiveSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Lazy load images below the fold
    lazyLoad: true,
  },

  // ========== SECURITY ==========
  security: {
    // Web Application Firewall
    waf: {
      enabled: true,
      mode: 'block', // 'block' or 'challenge'
      rules: [
        'OWASP ModSecurity Core Rule Set',
        'Cloudflare Managed Ruleset',
        'Cloudflare OWASP Core Ruleset',
      ],
    },

    // DDoS Protection
    ddos: {
      enabled: true,
      sensitivity: 'high', // 'low', 'medium', 'high'
      // Automatically challenge suspicious traffic
      challengePassage: 30, // seconds
    },

    // Bot Protection
    botManagement: {
      enabled: true,
      // Allow good bots (search engines, monitoring)
      allowGoodBots: true,
      // Challenge score threshold (0-100, higher = more strict)
      challengeThreshold: 30,
      // Block score threshold
      blockThreshold: 10,
    },

    // SSL/TLS
    ssl: {
      mode: 'full_strict', // 'flexible', 'full', 'full_strict'
      minTLSVersion: '1.2',
      enableHTTP3: true,
      enableTLS13: true,
      alwaysUseHTTPS: true,
      automaticHTTPSRewrites: true,
    },
  },

  // ========== RATE LIMITING ==========
  rateLimiting: {
    // API endpoints
    api: {
      enabled: true,
      threshold: 100, // requests
      period: 60, // seconds
      action: 'challenge', // 'block', 'challenge', 'js_challenge'
    },

    // Authentication endpoints
    auth: {
      enabled: true,
      threshold: 10,
      period: 60,
      action: 'block',
    },

    // General page views
    pages: {
      enabled: true,
      threshold: 300,
      period: 60,
      action: 'challenge',
    },
  },

  // ========== PERFORMANCE ==========
  performance: {
    // Minification
    minify: {
      html: true,
      css: true,
      js: true,
    },

    // Brotli compression
    brotli: true,

    // Early Hints
    earlyHints: true,

    // HTTP/2 Server Push
    http2ServerPush: false, // Use Link headers instead

    // Rocket Loader (async JS)
    rocketLoader: false, // Can break some apps, test first

    // Auto Minify
    autoMinify: true,
  },

  // ========== PAGE RULES ==========
  pageRules: [
    {
      // Cache everything on static paths
      url: '*.betfun.arena/_next/static/*',
      settings: {
        cacheLevel: 'everything',
        edgeCacheTTL: 31536000,
      },
    },
    {
      // Don't cache API routes
      url: '*.betfun.arena/api/*',
      settings: {
        cacheLevel: 'bypass',
      },
    },
    {
      // Cache images aggressively
      url: '*.betfun.arena/images/*',
      settings: {
        cacheLevel: 'everything',
        edgeCacheTTL: 2592000, // 30 days
      },
    },
  ],

  // ========== LOAD BALANCING ==========
  loadBalancing: {
    enabled: false, // Enable when you have multiple origins
    pools: [
      {
        name: 'primary',
        origins: ['origin1.betfun.arena'],
        monitor: {
          type: 'https',
          interval: 60,
          timeout: 5,
          retries: 2,
        },
      },
    ],
    steering: 'geo', // 'random', 'hash', 'geo'
  },

  // ========== WORKERS ==========
  workers: {
    // Custom edge logic
    routes: [
      {
        pattern: 'betfun.arena/api/*',
        script: 'api-worker',
      },
    ],
  },

  // ========== ANALYTICS ==========
  analytics: {
    webAnalytics: true,
    logpush: {
      enabled: true,
      destination: 's3://betfun-logs/',
      fields: [
        'ClientIP',
        'ClientRequestHost',
        'ClientRequestMethod',
        'ClientRequestURI',
        'EdgeResponseStatus',
        'RayID',
      ],
    },
  },

  // ========== CUSTOM RULES ==========
  customRules: [
    {
      name: 'Block known bad IPs',
      expression: 'ip.src in {1.2.3.4 5.6.7.8}',
      action: 'block',
    },
    {
      name: 'Challenge suspicious user agents',
      expression: 'http.user_agent contains "bot" and not cf.bot_management.verified_bot',
      action: 'managed_challenge',
    },
    {
      name: 'Geo-block restricted countries',
      expression: 'ip.geoip.country in {"XX" "YY"}', // Add country codes
      action: 'block',
    },
  ],
};

