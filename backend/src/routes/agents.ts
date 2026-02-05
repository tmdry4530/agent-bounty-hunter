import { Router } from 'express';
import { ethers } from 'ethers';
import { AuthenticatedRequest, ErrorCode, ApiResponse, RegisterAgentRequest } from '../types';
import { authenticate } from '../middleware/auth';
import { requirePayment, X402_PRICING } from '../middleware/x402';
import { getAgentRegistryContract } from '../contracts';

const router = Router();

/**
 * POST /api/agents
 * Register a new agent (x402: 1 USDC)
 */
router.post('/', 
  requirePayment(X402_PRICING.REGISTER_AGENT, 'register-agent'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { registrationURI, metadata }: RegisterAgentRequest = req.body;

      if (!registrationURI) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'registrationURI is required'
          }
        } as ApiResponse);
        return;
      }

      const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
      const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
      const registry = getAgentRegistryContract(
        process.env.AGENT_REGISTRY_ADDRESS!,
        wallet
      );

      // Register agent on-chain
      const tx = await registry.registerAgent(registrationURI);
      const receipt = await tx.wait();

      // Parse event to get agent ID
      const event = receipt?.logs
        .map((log: any) => {
          try {
            return registry.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === 'AgentRegistered');

      const agentId = event?.args[0];

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

      res.status(201).json({
        success: true,
        data: {
          agentId: agentId.toString(),
          txHash: receipt?.hash,
          registrationURI
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Register agent error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Failed to register agent'
        }
      } as ApiResponse);
    }
  }
);

/**
 * GET /api/agents/:id
 * Get agent profile
 */
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const agentId = BigInt(req.params.id);

    const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
    const registry = getAgentRegistryContract(
      process.env.AGENT_REGISTRY_ADDRESS!,
      provider
    );

    const [wallet, owner, registrationURI, active] = await registry.getAgent(agentId);

    if (!active) {
      res.status(404).json({
        success: false,
        error: {
          code: ErrorCode.AGENT_NOT_FOUND,
          message: 'Agent not found or inactive'
        }
      } as ApiResponse);
      return;
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

    res.json({
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
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Failed to get agent'
      }
    } as ApiResponse);
  }
});

/**
 * PATCH /api/agents/:id
 * Update agent metadata (requires authentication)
 */
router.patch('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const agentId = BigInt(req.params.id);
    const { metadata } = req.body;

    // Verify ownership
    if (req.agent?.agentId !== agentId) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.INVALID_SIGNATURE,
          message: 'Cannot update another agent\'s metadata'
        }
      } as ApiResponse);
      return;
    }

    const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
    const registry = getAgentRegistryContract(
      process.env.AGENT_REGISTRY_ADDRESS!,
      wallet
    );

    // Update metadata keys
    const updates: Promise<any>[] = [];
    
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

    res.json({
      success: true,
      data: { agentId: agentId.toString() }
    } as ApiResponse);
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Failed to update agent'
      }
    } as ApiResponse);
  }
});

export default router;
