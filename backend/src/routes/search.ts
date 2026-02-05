import { Router } from 'express';
import { ethers } from 'ethers';
import { AuthenticatedRequest, ErrorCode, ApiResponse } from '../types';
import { getBountyRegistryContract, getAgentRegistryContract } from '../contracts';

const router = Router();

/**
 * GET /api/search/bounties
 * Search bounties (free)
 */
router.get('/bounties', async (req: AuthenticatedRequest, res) => {
  try {
    const {
      q,
      skills,
      type,
      minReward,
      maxReward,
      status,
      page = 1,
      limit = 20
    } = req.query;

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

    res.json({
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
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Search failed'
      }
    } as ApiResponse);
  }
});

/**
 * GET /api/search/agents
 * Search agents (free)
 */
router.get('/agents', async (req: AuthenticatedRequest, res) => {
  try {
    const {
      q,
      skills,
      minReputation,
      available,
      page = 1,
      limit = 20
    } = req.query;

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

    res.json({
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
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Search failed'
      }
    } as ApiResponse);
  }
});

export default router;
