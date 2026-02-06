import { Hono } from 'hono';
import { ethers } from 'ethers';
import {
  AuthenticatedRequest,
  ErrorCode,
  ApiResponse,
  CreateBountyRequest,
  SubmitWorkRequest,
  ReviewBountyRequest,
  BountyStatus
} from '../types';
import { authenticate } from '../middleware/auth';
import { requirePayment, calculateBountyFee, X402_PRICING } from '../middleware/x402';
import { getBountyRegistryContract, getERC20Contract } from '../contracts';

export const bountyRoutes = new Hono();

/**
 * GET /api/bounties
 * List bounties (public, no auth required)
 */
bountyRoutes.get('/', async (c) => {
  try {
    const query = c.req.query();
    const {
      status,
      skills,
      type,
      minReward,
      maxReward,
      creator,
      page = '1',
      limit = '20',
      sort = 'created',
      order = 'desc'
    } = query;

    const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
    const registry = getBountyRegistryContract(
      process.env.BOUNTY_REGISTRY_ADDRESS!,
      provider
    );

    const totalBounties = await registry.totalBounties();

    // TODO: Implement filtering and pagination
    // For MVP, return simple list
    const bounties: any[] = [];
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);

    return c.json({
      success: true,
      data: {
        bounties,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(totalBounties),
          pages: Math.ceil(Number(totalBounties) / limitNum)
        }
      }
    } as ApiResponse);
  } catch (error) {
    console.error('List bounties error:', error);
    return c.json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to list bounties'
      }
    } as ApiResponse, 500);
  }
});

/**
 * GET /api/bounties/:id
 * Get bounty details (x402: 0.001 USDC)
 */
bountyRoutes.get('/:id',
  requirePayment(X402_PRICING.GET_BOUNTY_DETAILS, 'get-bounty-details'),
  async (c) => {
    try {
      const bountyId = BigInt(c.req.param('id'));

      const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
      const registry = getBountyRegistryContract(
        process.env.BOUNTY_REGISTRY_ADDRESS!,
        provider
      );

      const bounty = await registry.getBounty(bountyId);

      return c.json({
        success: true,
        data: {
          id: bountyId.toString(),
          onChainId: bounty.id.toString(),
          creatorAgentId: bounty.creatorAgentId.toString(),
          title: bounty.title,
          descriptionURI: bounty.descriptionURI,
          rewardToken: bounty.rewardToken,
          rewardAmount: ethers.formatUnits(bounty.rewardAmount, 6),
          deadline: new Date(Number(bounty.deadline) * 1000),
          status: BountyStatus[bounty.status as keyof typeof BountyStatus],
          claimedBy: bounty.claimedBy > 0n ? bounty.claimedBy.toString() : null,
          claimedAt: bounty.claimedAt > 0n ? new Date(Number(bounty.claimedAt) * 1000) : null,
          submissionURI: bounty.submissionURI || null,
          createdAt: new Date(Number(bounty.createdAt) * 1000)
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Get bounty error:', error);
      return c.json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to get bounty'
        }
      } as ApiResponse, 500);
    }
  }
);

/**
 * POST /api/bounties
 * Create bounty (x402: 0.01 USDC + 1% of reward)
 */
bountyRoutes.post('/',
  authenticate,
  async (c) => {
    try {
      const body: CreateBountyRequest = await c.req.json();

      // Validation
      if (!body.title || !body.description || !body.rewardAmount || !body.deadline) {
        return c.json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Missing required fields: title, description, rewardAmount, deadline'
          }
        } as ApiResponse, 400);
      }

      // Calculate fee and check payment
      const fee = calculateBountyFee(body.rewardAmount);
      const paymentHeader = c.req.header('x-payment');

      if (!paymentHeader) {
        return c.json({
          success: false,
          error: {
            code: ErrorCode.PAYMENT_REQUIRED,
            message: 'Payment required'
          },
          payment: {
            amount: fee,
            token: 'USDC',
            tokenAddress: process.env.USDC_TOKEN_ADDRESS!,
            network: 'monad',
            chainId: parseInt(process.env.CHAIN_ID!),
            recipient: process.env.PLATFORM_WALLET_ADDRESS!,
            memo: 'create-bounty',
            expiresAt: Math.floor(Date.now() / 1000) + 300
          }
        } as ApiResponse, 402);
      }

      const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
      const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
      const registry = getBountyRegistryContract(
        process.env.BOUNTY_REGISTRY_ADDRESS!,
        wallet
      );

      // Convert reward amount to wei (USDC has 6 decimals)
      const rewardAmountWei = ethers.parseUnits(body.rewardAmount, 6);

      // Convert deadline to timestamp
      const deadlineTimestamp = Math.floor(new Date(body.deadline).getTime() / 1000);

      // Create bounty on-chain
      const tx = await registry.createBounty(
        body.title,
        body.description, // In production, this should be an IPFS URI
        process.env.USDC_TOKEN_ADDRESS!,
        rewardAmountWei,
        deadlineTimestamp,
        [], // requiredSkills - would need skill ID mapping
        body.minReputation || 0
      );

      const receipt = await tx.wait();

      // Parse event to get bounty ID
      const event = receipt?.logs
        .map((log: ethers.Log | ethers.EventLog) => {
          try {
            return registry.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: ethers.LogDescription | null) => e?.name === 'BountyCreated');

      const bountyId: bigint = event?.args[0];

      return c.json({
        success: true,
        data: {
          bountyId: bountyId.toString(),
          onChainId: bountyId.toString(),
          escrowTx: receipt?.hash,
          status: 'open',
          createdAt: new Date()
        }
      } as ApiResponse, 201);
    } catch (error) {
      console.error('Create bounty error:', error);
      return c.json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Failed to create bounty'
        }
      } as ApiResponse, 500);
    }
  }
);

/**
 * POST /api/bounties/:id/claim
 * Claim bounty (x402: 0.001 USDC)
 */
bountyRoutes.post('/:id/claim',
  authenticate,
  requirePayment(X402_PRICING.CLAIM_BOUNTY, 'claim-bounty'),
  async (c) => {
    try {
      const bountyId = BigInt(c.req.param('id'));
      const agentId = c.get('agentId');

      const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
      const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
      const registry = getBountyRegistryContract(
        process.env.BOUNTY_REGISTRY_ADDRESS!,
        wallet
      );

      // Check if bounty is claimable
      const bounty = await registry.getBounty(bountyId);

      if (bounty.status !== 0) { // 0 = OPEN
        return c.json({
          success: false,
          error: {
            code: ErrorCode.BOUNTY_NOT_CLAIMABLE,
            message: 'Bounty is not available for claiming'
          }
        } as ApiResponse, 400);
      }

      // Claim bounty on-chain
      const tx = await registry.claimBounty(bountyId);
      const receipt = await tx.wait();

      return c.json({
        success: true,
        data: {
          bountyId: bountyId.toString(),
          claimedBy: agentId.toString(),
          claimedAt: new Date(),
          tx: receipt?.hash
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Claim bounty error:', error);
      return c.json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Failed to claim bounty'
        }
      } as ApiResponse, 500);
    }
  }
);

/**
 * POST /api/bounties/:id/submit
 * Submit work
 */
bountyRoutes.post('/:id/submit',
  authenticate,
  async (c) => {
    try {
      const bountyId = BigInt(c.req.param('id'));
      const body: SubmitWorkRequest = await c.req.json();

      if (!body.submissionURI) {
        return c.json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'submissionURI is required'
          }
        } as ApiResponse, 400);
      }

      const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
      const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
      const registry = getBountyRegistryContract(
        process.env.BOUNTY_REGISTRY_ADDRESS!,
        wallet
      );

      const tx = await registry.submitWork(bountyId, body.submissionURI);
      const receipt = await tx.wait();

      return c.json({
        success: true,
        data: {
          bountyId: bountyId.toString(),
          status: 'submitted',
          submittedAt: new Date(),
          tx: receipt?.hash
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Submit work error:', error);
      return c.json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to submit work'
        }
      } as ApiResponse, 500);
    }
  }
);

/**
 * POST /api/bounties/:id/approve
 * Approve submission (creator only)
 */
bountyRoutes.post('/:id/approve',
  authenticate,
  async (c) => {
    try {
      const bountyId = BigInt(c.req.param('id'));
      const { rating, feedback } = await c.req.json();
      const agentId = c.get('agentId');

      const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
      const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
      const registry = getBountyRegistryContract(
        process.env.BOUNTY_REGISTRY_ADDRESS!,
        wallet
      );

      // Verify creator
      const bounty = await registry.getBounty(bountyId);
      if (bounty.creatorAgentId !== agentId) {
        return c.json({
          success: false,
          error: {
            code: ErrorCode.INVALID_SIGNATURE,
            message: 'Only bounty creator can approve submissions'
          }
        } as ApiResponse, 403);
      }

      const tx = await registry.approveBounty(bountyId);
      const receipt = await tx.wait();

      return c.json({
        success: true,
        data: {
          bountyId: bountyId.toString(),
          status: 'approved',
          tx: receipt?.hash,
          rating,
          feedback
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Approve bounty error:', error);
      return c.json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to approve bounty'
        }
      } as ApiResponse, 500);
    }
  }
);

/**
 * POST /api/bounties/:id/reject
 * Reject submission (creator only)
 */
bountyRoutes.post('/:id/reject',
  authenticate,
  async (c) => {
    try {
      const bountyId = BigInt(c.req.param('id'));
      const { reason, feedback } = await c.req.json();
      const agentId = c.get('agentId');

      const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
      const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
      const registry = getBountyRegistryContract(
        process.env.BOUNTY_REGISTRY_ADDRESS!,
        wallet
      );

      // Verify creator
      const bounty = await registry.getBounty(bountyId);
      if (bounty.creatorAgentId !== agentId) {
        return c.json({
          success: false,
          error: {
            code: ErrorCode.INVALID_SIGNATURE,
            message: 'Only bounty creator can reject submissions'
          }
        } as ApiResponse, 403);
      }

      const tx = await registry.rejectBounty(bountyId, reason || 'No reason provided');
      const receipt = await tx.wait();

      return c.json({
        success: true,
        data: {
          bountyId: bountyId.toString(),
          status: 'rejected',
          tx: receipt?.hash,
          reason,
          feedback
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Reject bounty error:', error);
      return c.json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to reject bounty'
        }
      } as ApiResponse, 500);
    }
  }
);

/**
 * POST /api/bounties/:id/cancel
 * Cancel bounty (creator only)
 */
bountyRoutes.post('/:id/cancel',
  authenticate,
  async (c) => {
    try {
      const bountyId = BigInt(c.req.param('id'));
      const { reason } = await c.req.json();
      const agentId = c.get('agentId');

      const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
      const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
      const registry = getBountyRegistryContract(
        process.env.BOUNTY_REGISTRY_ADDRESS!,
        wallet
      );

      // Verify creator
      const bounty = await registry.getBounty(bountyId);
      if (bounty.creatorAgentId !== agentId) {
        return c.json({
          success: false,
          error: {
            code: ErrorCode.INVALID_SIGNATURE,
            message: 'Only bounty creator can cancel bounties'
          }
        } as ApiResponse, 403);
      }

      const tx = await registry.cancelBounty(bountyId);
      const receipt = await tx.wait();

      return c.json({
        success: true,
        data: {
          bountyId: bountyId.toString(),
          status: 'cancelled',
          tx: receipt?.hash,
          reason
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Cancel bounty error:', error);
      return c.json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to cancel bounty'
        }
      } as ApiResponse, 500);
    }
  }
);
