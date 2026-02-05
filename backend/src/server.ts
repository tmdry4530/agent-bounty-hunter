import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { ErrorCode, ApiResponse } from './types';

// Load environment variables
dotenv.config();

// Import routes
import agentsRouter from './routes/agents';
import bountiesRouter from './routes/bounties';
import searchRouter from './routes/search';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware
// ============================================

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Agent-Id',
    'X-Timestamp',
    'X-Signature',
    'X-Payment'
  ]
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '60'),
  message: {
    success: false,
    error: {
      code: ErrorCode.RATE_LIMITED,
      message: 'Too many requests, please try again later'
    }
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });
  next();
});

// ============================================
// Routes
// ============================================

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0'
    }
  } as ApiResponse);
});

// API info
app.get('/api', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: 'Agent Bounty Hunter API',
      version: '0.1.0',
      description: 'REST API with x402 HTTP-native payments',
      endpoints: {
        agents: '/api/agents',
        bounties: '/api/bounties',
        search: '/api/search'
      },
      documentation: 'https://docs.agent-bounty-hunter.xyz',
      x402: true,
      network: 'monad',
      chainId: parseInt(process.env.CHAIN_ID || '41454')
    }
  } as ApiResponse);
});

// Mount routers
app.use('/api/agents', agentsRouter);
app.use('/api/bounties', bountiesRouter);
app.use('/api/search', searchRouter);

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  } as ApiResponse);
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'Internal server error',
      details: process.env.NODE_ENV === 'development' 
        ? err.stack 
        : undefined
    }
  } as ApiResponse);
});

// ============================================
// Server Startup
// ============================================

// Validate required environment variables
function validateEnv() {
  const required = [
    'MONAD_RPC_URL',
    'AGENT_REGISTRY_ADDRESS',
    'BOUNTY_REGISTRY_ADDRESS',
    'USDC_TOKEN_ADDRESS',
    'PLATFORM_WALLET_ADDRESS',
    'PLATFORM_PRIVATE_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    process.exit(1);
  }
}

// Start server
function startServer() {
  try {
    validateEnv();

    app.listen(PORT, () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════╗');
      console.log('║                                                       ║');
      console.log('║       🎯 Agent Bounty Hunter API Server              ║');
      console.log('║                                                       ║');
      console.log('╚═══════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Network: ${process.env.CHAIN_ID === '41454' ? 'Monad' : 'Unknown'}`);
      console.log(`🔗 RPC: ${process.env.MONAD_RPC_URL}`);
      console.log(`💳 x402 Enabled: Yes`);
      console.log('');
      console.log('📍 Endpoints:');
      console.log(`   GET  /health`);
      console.log(`   GET  /api`);
      console.log(`   POST /api/agents              (x402: 1 USDC)`);
      console.log(`   GET  /api/agents/:id`);
      console.log(`   PATCH /api/agents/:id`);
      console.log(`   GET  /api/bounties`);
      console.log(`   POST /api/bounties            (x402: 0.01 USDC + 1%)`);
      console.log(`   GET  /api/bounties/:id        (x402: 0.001 USDC)`);
      console.log(`   POST /api/bounties/:id/claim  (x402: 0.001 USDC)`);
      console.log(`   POST /api/bounties/:id/submit`);
      console.log(`   POST /api/bounties/:id/review`);
      console.log(`   GET  /api/search/bounties`);
      console.log(`   GET  /api/search/agents`);
      console.log('');
      console.log('Press Ctrl+C to stop');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

export default app;
