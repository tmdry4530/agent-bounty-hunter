import { Hono } from 'hono';
import { ethers } from 'ethers';
import { AuthenticatedRequest, ErrorCode, ApiResponse, RegisterAgentRequest } from '../types';
import { authenticate } from '../middleware/auth';
import { requirePayment, X402_PRICING } from '../middleware/x402';
import { getAgentRegistryContract } from '../contracts';

export const agentRoutes = new Hono();

/**
 * GET /api/agents
 * List agents with pagination
 */
agentRoutes.get('/', async (c) => {
  try {
    const {
      limit = '20',
      offset = '0',
      skills,
      minReputation,
      active
    } = c.req.query();

    const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
    const registry = getAgentRegistryContract(
      process.env.AGENT_REGISTRY_ADDRESS!,
      provider
    );

    const totalAgents = await registry.totalAgents();
    const limitNum = Math.min(parseInt(limit as string), 100);
    const offsetNum = parseInt(offset as string);

    // TODO: Implement filtering and pagination
    // For MVP, return empty list
    const agents: unknown[] = [];

    return c.json({
      success: true,
      data: {
        agents,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: Number(totalAgents)
        }
      }
    } as ApiResponse);
  } catch (error) {
    console.error('List agents error:', error);
    return c.json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to list agents'
      }
    } as ApiResponse, 500);
  }
});

/**
 * POST /api/agents
 * Register a new agent (x402: 1 USDC)
 */
agentRoutes.post('/',
  requirePayment(X402_PRICING.REGISTER_AGENT, 'register-agent'),
  async (c) => {
    try {
      const { registrationURI, metadata }: RegisterAgentRequest = await c.req.json();

      if (!registrationURI) {
        return c.json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'registrationURI is required'
          }
        } as ApiResponse, 400);
      }

      const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
      const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
      const registry = getAgentRegistryContract(
        process.env.AGENT_REGISTRY_ADDRESS!,
        provider
      ).connect(wallet) as ReturnType<typeof getAgentRegistryContract>;

      // Register agent on-chain
      const tx = await registry.registerAgent(registrationURI);
      const receipt = await tx.wait();

      // Parse event to get agent ID
      const event = receipt?.logs
        .map((log: unknown) => {
          try {
            return registry.interface.parseLog(log as { topics: string[]; data: string });
          } catch {
            return null;
          }
        })
        .find((e: unknown) => (e as { name?: string } | null)?.name === 'AgentRegistered');

      const agentId = (event as { args?: [bigint] } | null)?.args?.[0];

      if (!agentId) {
        throw new Error('Failed to parse agent ID from transaction receipt');
      }

      // Store metadata if provided
      if (metadata) {
        if (metadata.skills) {
          await registry.updateMetadata(
            agentId,
            'skills',
            JSON.stringify(metadata.skills)
          );
        }
        if (metadata.pricing) {
          await registry.updateMetadata(
            agentId,
            'pricing',
            JSON.stringify(metadata.pricing)
          );
        }
      }

      return c.json({
        success: true,
        data: {
          agentId: agentId.toString(),
          txHash: receipt?.hash,
          registrationURI
        }
      } as ApiResponse, 201);
    } catch (error) {
      console.error('Register agent error:', error);
      return c.json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Failed to register agent'
        }
      } as ApiResponse, 500);
    }
  }
);

/**
 * GET /api/agents/:id
 * Get agent profile
 */
agentRoutes.get('/:id', async (c) => {
  try {
    const agentId = BigInt(c.req.param('id'));

    const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
    const registry = getAgentRegistryContract(
      process.env.AGENT_REGISTRY_ADDRESS!,
      provider
    );

    const [wallet, owner, registrationURI, active] = await registry.getAgent(agentId);

    if (!active) {
      return c.json({
        success: false,
        error: {
          code: ErrorCode.AGENT_NOT_FOUND,
          message: 'Agent not found or inactive'
        }
      } as ApiResponse, 404);
    }

    // Fetch metadata
    const skills = await registry.getMetadata(agentId, 'skills');
    const pricing = await registry.getMetadata(agentId, 'pricing');
    const [reputationScore] = await registry.getReputation(agentId);

    // TODO: Fetch stats from database or compute from events
    const stats = {
      completedBounties: 0,
      totalEarnings: '0',
      avgRating: 0,
      memberSince: new Date()
    };

    return c.json({
      success: true,
      data: {
        agentId: agentId.toString(),
        wallet,
        owner,
        registrationURI,
        skills: skills ? JSON.parse(skills) : [],
        pricing: pricing ? JSON.parse(pricing) : null,
        reputation: {
          overall: Number(reputationScore),
          reliability: 0,
          quality: 0,
          speed: 0,
          volume: 0
        },
        stats,
        active,
        x402Support: true
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Get agent error:', error);
    return c.json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Failed to get agent'
      }
    } as ApiResponse, 500);
  }
});

/**
 * PATCH /api/agents/:id
 * Update agent metadata (requires authentication)
 */
agentRoutes.patch('/:id', authenticate, async (c) => {
  try {
    const agentId = BigInt(c.req.param('id'));
    const { metadata } = await c.req.json();

    // Verify ownership - auth middleware sets agentId context variable
    const authenticatedAgentId = c.get('agentId');
    if (authenticatedAgentId !== agentId) {
      return c.json({
        success: false,
        error: {
          code: ErrorCode.INVALID_SIGNATURE,
          message: 'Cannot update another agent\'s metadata'
        }
      } as ApiResponse, 403);
    }

    const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
    const registry = getAgentRegistryContract(
      process.env.AGENT_REGISTRY_ADDRESS!,
      provider
    ).connect(wallet) as ReturnType<typeof getAgentRegistryContract>;

    // Update metadata keys
    const updates: Promise<unknown>[] = [];

    if (metadata.skills) {
      updates.push(
        registry.updateMetadata(agentId, 'skills', JSON.stringify(metadata.skills))
      );
    }
    if (metadata.pricing) {
      updates.push(
        registry.updateMetadata(agentId, 'pricing', JSON.stringify(metadata.pricing))
      );
    }
    if (metadata.availability) {
      updates.push(
        registry.updateMetadata(agentId, 'availability', metadata.availability)
      );
    }

    await Promise.all(updates);

    return c.json({
      success: true,
      data: { agentId: agentId.toString() }
    } as ApiResponse);
  } catch (error) {
    console.error('Update agent error:', error);
    return c.json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Failed to update agent'
      }
    } as ApiResponse, 500);
  }
});

/**
 * GET /api/agents/:id/reputation
 * Get agent reputation details
 */
agentRoutes.get('/:id/reputation', async (c) => {
  try {
    const agentId = BigInt(c.req.param('id'));

    const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
    const registry = getAgentRegistryContract(
      process.env.AGENT_REGISTRY_ADDRESS!,
      provider
    );

    const [wallet, owner, registrationURI, active] = await registry.getAgent(agentId);

    if (!active) {
      return c.json({
        success: false,
        error: {
          code: ErrorCode.AGENT_NOT_FOUND,
          message: 'Agent not found or inactive'
        }
      } as ApiResponse, 404);
    }

    const [reputationScore] = await registry.getReputation(agentId);

    // TODO: Fetch detailed reputation metrics from ReputationRegistry
    return c.json({
      success: true,
      data: {
        agentId: agentId.toString(),
        reputation: {
          overall: Number(reputationScore),
          reliability: 0,
          quality: 0,
          speed: 0,
          volume: 0
        },
        stats: {
          completedBounties: 0,
          successRate: 0,
          avgRating: 0,
          totalEarnings: '0'
        }
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Get reputation error:', error);
    return c.json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to get reputation'
      }
    } as ApiResponse, 500);
  }
});
