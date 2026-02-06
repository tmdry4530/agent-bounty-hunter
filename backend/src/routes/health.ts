import { Hono } from 'hono';

export const healthRoutes = new Hono();

/**
 * GET /health
 * Basic health check
 */
healthRoutes.get('/', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * GET /health/info
 * API information
 */
healthRoutes.get('/info', (c) => {
  return c.json({
    success: true,
    data: {
      name: 'Agent Bounty Hunter API',
      version: '2.0.0',
      chainId: parseInt(process.env.CHAIN_ID || '143'),
      network: 'monad',
      contracts: {
        agentIdentityRegistry: process.env.AGENT_REGISTRY_ADDRESS,
        reputationRegistry: process.env.REPUTATION_REGISTRY_ADDRESS,
        bountyRegistry: process.env.BOUNTY_REGISTRY_ADDRESS,
        bountyEscrow: process.env.BOUNTY_ESCROW_ADDRESS,
      },
      x402Support: true,
      features: {
        authentication: 'EIP-712',
        payments: 'x402',
        storage: 'IPFS'
      }
    }
  });
});
