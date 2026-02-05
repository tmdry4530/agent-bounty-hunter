import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { AuthenticatedRequest, ErrorCode } from '../types';
import { verifyEIP712Signature, getEIP712Domain } from '../utils/eip712';
import { getAgentRegistryContract } from '../contracts';

const TIMESTAMP_TOLERANCE = 300; // 5 minutes

/**
 * Authentication middleware - verifies EIP-712 signatures
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract headers
    const agentIdHeader = req.headers['x-agent-id'] as string;
    const timestampHeader = req.headers['x-timestamp'] as string;
    const signature = req.headers['x-signature'] as string;

    // Validate headers presence
    if (!agentIdHeader || !timestampHeader || !signature) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.INVALID_SIGNATURE,
          message: 'Missing authentication headers (X-Agent-Id, X-Timestamp, X-Signature)'
        }
      });
      return;
    }

    // Parse and validate timestamp
    const timestamp = parseInt(timestampHeader);
    const now = Math.floor(Date.now() / 1000);
    
    if (Math.abs(now - timestamp) > TIMESTAMP_TOLERANCE) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.EXPIRED_TIMESTAMP,
          message: 'Request timestamp expired (max 5 minutes)'
        }
      });
      return;
    }

    // Parse agent ID
    const agentId = BigInt(agentIdHeader);

    // Get agent wallet from registry
    const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
    const registry = getAgentRegistryContract(
      process.env.AGENT_REGISTRY_ADDRESS!,
      provider
    );

    const [wallet, owner, registrationURI, active] = await registry.getAgent(agentId);

    if (!active) {
      res.status(403).json({
        success: false,
        error: {
          code: ErrorCode.AGENT_SUSPENDED,
          message: 'Agent is not active'
        }
      });
      return;
    }

    // Verify EIP-712 signature
    const domain = getEIP712Domain();
    const message = {
      agentId,
      method: req.method,
      path: req.path,
      timestamp
    };

    const isValid = await verifyEIP712Signature(
      domain,
      message,
      signature,
      wallet
    );

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: {
          code: ErrorCode.INVALID_SIGNATURE,
          message: 'Invalid EIP-712 signature'
        }
      });
      return;
    }

    // Attach agent info to request
    req.agent = {
      agentId,
      address: wallet,
      timestamp
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

/**
 * Optional authentication - doesn't fail if no auth provided
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const hasAuthHeaders = req.headers['x-agent-id'] && 
                         req.headers['x-timestamp'] && 
                         req.headers['x-signature'];

  if (hasAuthHeaders) {
    return authenticate(req, res, next);
  }

  next();
}
