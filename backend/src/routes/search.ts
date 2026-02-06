import { Hono } from 'hono';
import { ethers } from 'ethers';
import { ErrorCode, ApiResponse } from '../types';
import { getBountyRegistryContract, getAgentRegistryContract } from '../contracts';

export const searchRoutes = new Hono();

/**
 * GET /api/search/bounties
 * Search bounties (free)
 */
searchRoutes.get('/bounties', async (c) => {
  try {
    const q = c.req.query('q');
    const skills = c.req.query('skills');
    const type = c.req.query('type');
    const minReward = c.req.query('minReward');
    const maxReward = c.req.query('maxReward');
    const status = c.req.query('status');
    const page = c.req.query('page') || '1';
    const limit = c.req.query('limit') || '20';

    const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
    const registry = getBountyRegistryContract(
      process.env.BOUNTY_REGISTRY_ADDRESS!,
      provider
    );

    // TODO: Implement full-text search
    // For MVP, return filtered results

    const bounties: any[] = [];
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);

    return c.json({
      success: true,
      data: {
        bounties,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: bounties.length,
          pages: Math.ceil(bounties.length / limitNum)
        },
        query: q || ''
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Search bounties error:', error);
    return c.json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Search failed'
      }
    } as ApiResponse, 500);
  }
});

/**
 * GET /api/search/agents
 * Search agents (free)
 */
searchRoutes.get('/agents', async (c) => {
  try {
    const q = c.req.query('q');
    const skills = c.req.query('skills');
    const minReputation = c.req.query('minReputation');
    const available = c.req.query('available');
    const page = c.req.query('page') || '1';
    const limit = c.req.query('limit') || '20';

    const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
    const registry = getAgentRegistryContract(
      process.env.AGENT_REGISTRY_ADDRESS!,
      provider
    );

    // TODO: Implement full-text search
    // For MVP, return empty results

    const agents: any[] = [];
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);

    return c.json({
      success: true,
      data: {
        agents,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: agents.length,
          pages: Math.ceil(agents.length / limitNum)
        },
        query: q || ''
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Search agents error:', error);
    return c.json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Search failed'
      }
    } as ApiResponse, 500);
  }
});
