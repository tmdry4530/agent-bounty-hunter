import { Router } from 'express';
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

const router = Router();

/**
 * GET /api/bounties
 * List bounties (public, no auth required)
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const {
      status,
      skills,
      type,
      minReward,
      maxReward,
      creator,
      page = 1,
      limit = 20,
      sort = 'created',
      order = 'desc'
    } = req.query;

    const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
    const registry = getBountyRegistryContract(
      process.env.BOUNTY_REGISTRY_ADDRESS!,
      provider
    );

    const totalBounties = await registry.totalBounties();
    
    // TODO: Implement filtering and pagination
    // For MVP, return simple list
    const bounties = [];
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);

    res.json({
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
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to list bounties'
      }
    } as ApiResponse);
  }
});

/**
 * GET /api/bounties/:id
 * Get bounty details (x402: 0.001 USDC)
 */
router.get('/:id',
  requirePayment(X402_PRICING.GET_BOUNTY_DETAILS, 'get-bounty-details'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const bountyId = BigInt(req.params.id);

      const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
      const registry = getBountyRegistryContract(
        process.env.BOUNTY_REGISTRY_ADDRESS!,
        provider
      );

      const bounty = await registry.getBounty(bountyId);

      res.json({
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
          status: BountyStatus[bounty.status],
          claimedBy: bounty.claimedBy > 0n ? bounty.claimedBy.toString() : null,
          claimedAt: bounty.claimedAt > 0n ? new Date(Number(bounty.claimedAt) * 1000) : null,
          submissionURI: bounty.submissionURI || null,
          createdAt: new Date(Number(bounty.createdAt) * 1000)
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Get bounty error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to get bounty'
        }
      } as ApiResponse);
    }
  }
);

/**
 * POST /api/bounties
 * Create bounty (x402: 0.01 USDC + 1% of reward)
 */
router.post('/',
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const body: CreateBountyRequest = req.body;
      
      // Validation
      if (!body.title || !body.description || !body.rewardAmount || !body.deadline) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Missing required fields: title, description, rewardAmount, deadline'
          }
        } as ApiResponse);
        return;
      }

      // Calculate fee and check payment
      const fee = calculateBountyFee(body.rewardAmount);
      const paymentHeader = req.headers['x-payment'] as string;

      if (!paymentHeader) {
        res.status(402).json({
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
        } as ApiResponse);
        return;
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
        .map((log: any) => {
          try {
            return registry.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === 'BountyCreated');

      const bountyId = event?.args[0];

      res.status(201).json({
        success: true,
        data: {
          bountyId: bountyId.toString(),
          onChainId: bountyId.toString(),
          escrowTx: receipt?.hash,
          status: 'open',
          createdAt: new Date()
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Create bounty error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Failed to create bounty'
        }
      } as ApiResponse);
    }
  }
);

/**
 * POST /api/bounties/:id/claim
 * Claim bounty (x402: 0.001 USDC)
 */
router.post('/:id/claim',
  authenticate,
  requirePayment(X402_PRICING.CLAIM_BOUNTY, 'claim-bounty'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const bountyId = BigInt(req.params.id);
      const agentId = req.agent!.agentId;

      const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
      const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
      const registry = getBountyRegistryContract(
        process.env.BOUNTY_REGISTRY_ADDRESS!,
        wallet
      );

      // Check if bounty is claimable
      const bounty = await registry.getBounty(bountyId);
      
      if (bounty.status !== 1) { // 1 = OPEN
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.BOUNTY_NOT_CLAIMABLE,
            message: 'Bounty is not available for claiming'
          }
        } as ApiResponse);
        return;
      }

      // Claim bounty on-chain
      const tx = await registry.claimBounty(bountyId);
      const receipt = await tx.wait();

      res.json({
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
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Failed to claim bounty'
        }
      } as ApiResponse);
    }
  }
);

/**
 * POST /api/bounties/:id/submit
 * Submit work
 */
router.post('/:id/submit',
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const bountyId = BigInt(req.params.id);
      const body: SubmitWorkRequest = req.body;

      if (!body.submissionURI) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'submissionURI is required'
          }
        } as ApiResponse);
        return;
      }

      const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
      const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
      const registry = getBountyRegistryContract(
        process.env.BOUNTY_REGISTRY_ADDRESS!,
        wallet
      );

      const tx = await registry.submitWork(bountyId, body.submissionURI);
      const receipt = await tx.wait();

      res.json({
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
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to submit work'
        }
      } as ApiResponse);
    }
  }
);

/**
 * POST /api/bounties/:id/review
 * Approve or reject bounty (creator only)
 */
router.post('/:id/review',
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const bountyId = BigInt(req.params.id);
      const body: ReviewBountyRequest = req.body;

      const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
      const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
      const registry = getBountyRegistryContract(
        process.env.BOUNTY_REGISTRY_ADDRESS!,
        wallet
      );

      // Verify creator
      const bounty = await registry.getBounty(bountyId);
      if (bounty.creatorAgentId !== req.agent!.agentId) {
        res.status(403).json({
          success: false,
          error: {
            code: ErrorCode.INVALID_SIGNATURE,
            message: 'Only bounty creator can review submissions'
          }
        } as ApiResponse);
        return;
      }

      let tx;
      if (body.action === 'approve') {
        tx = await registry.approveBounty(bountyId);
      } else {
        tx = await registry.rejectBounty(bountyId, body.reason || 'No reason provided');
      }

      const receipt = await tx.wait();

      res.json({
        success: true,
        data: {
          bountyId: bountyId.toString(),
          status: body.action === 'approve' ? 'approved' : 'rejected',
          tx: receipt?.hash
        }
      } as ApiResponse);
    } catch (error) {
      console.error('Review bounty error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Failed to review bounty'
        }
      } as ApiResponse);
    }
  }
);

export default router;
