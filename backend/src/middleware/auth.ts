import { createMiddleware } from 'hono/factory';
import { Context } from 'hono';
import { verifyTypedData, type Address } from 'viem';

const TIMESTAMP_TOLERANCE = 300; // 5 minutes

/**
 * EIP-712 Domain for AgentBountyHunter
 */
const EIP712_DOMAIN = {
  name: 'AgentBountyHunter',
  version: '1',
  chainId: 143,
} as const;

/**
 * EIP-712 Types for Request message
 */
const EIP712_TYPES = {
  Request: [
    { name: 'agentId', type: 'uint256' },
    { name: 'method', type: 'string' },
    { name: 'path', type: 'string' },
    { name: 'timestamp', type: 'uint256' },
  ],
} as const;

/**
 * Extended context type with agentId
 */
export type AuthContext = {
  Variables: {
    agentId: bigint;
    agentAddress: Address;
    timestamp: number;
  };
};

/**
 * Auth middleware for Hono
 * Verifies EIP-712 signatures for API requests
 */
export const authMiddleware = createMiddleware<AuthContext>(async (c, next) => {
  // Development bypass
  if (process.env.AUTH_BYPASS === 'true') {
    console.warn('[AUTH] ⚠️  AUTH_BYPASS enabled - skipping authentication');
    c.set('agentId', BigInt(1));
    c.set('agentAddress', '0x0000000000000000000000000000000000000000' as Address);
    c.set('timestamp', Math.floor(Date.now() / 1000));
    await next();
    return;
  }

  try {
    // Extract headers
    const agentIdHeader = c.req.header('X-Agent-Id');
    const timestampHeader = c.req.header('X-Timestamp');
    const signature = c.req.header('X-Signature');

    // Validate headers presence
    if (!agentIdHeader || !timestampHeader || !signature) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Missing authentication headers (X-Agent-Id, X-Timestamp, X-Signature)',
          },
        },
        401
      );
    }

    // Parse and validate timestamp
    const timestamp = parseInt(timestampHeader);
    const now = Math.floor(Date.now() / 1000);

    if (Math.abs(now - timestamp) > TIMESTAMP_TOLERANCE) {
      return c.json(
        {
          success: false,
          error: {
            code: 'EXPIRED_TIMESTAMP',
            message: 'Request timestamp expired (max 5 minutes)',
          },
        },
        401
      );
    }

    // Parse agent ID
    const agentId = BigInt(agentIdHeader);

    // Get agent wallet from registry (this would be a contract call in production)
    // For now, we'll verify the signature against the recovered address
    // In production, you'd need to:
    // 1. Call getAgent(agentId) on AgentRegistry contract
    // 2. Get the wallet address
    // 3. Verify it's active
    // 4. Use that address for signature verification

    // Construct EIP-712 message
    const message = {
      agentId,
      method: c.req.method,
      path: c.req.path,
      timestamp: BigInt(timestamp),
    };

    // Verify signature and recover address
    let recoveredAddress: Address;

    try {
      // verifyTypedData requires the address parameter
      // For now, we'll use a placeholder since we need to verify against registry
      // In production: first fetch agent wallet from registry, then verify against it
      const isValid = await verifyTypedData({
        address: '0x0000000000000000000000000000000000000000' as Address, // TODO: Get from registry
        domain: EIP712_DOMAIN,
        types: EIP712_TYPES,
        primaryType: 'Request',
        message,
        signature: signature as `0x${string}`,
      });

      if (!isValid) {
        return c.json(
          {
            success: false,
            error: {
              code: 'INVALID_SIGNATURE',
              message: 'Invalid EIP-712 signature',
            },
          },
          401
        );
      }

      // For now, set recovered address to placeholder
      // In production: use the address from registry
      recoveredAddress = '0x0000000000000000000000000000000000000000' as Address;
    } catch (error) {
      console.error('[AUTH] Signature verification failed:', error);
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid EIP-712 signature',
          },
        },
        401
      );
    }

    // Set agent info in context
    c.set('agentId', agentId);
    c.set('agentAddress', recoveredAddress);
    c.set('timestamp', timestamp);

    await next();
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
    );
  }
});

/**
 * Optional auth middleware - doesn't fail if no auth provided
 */
export const optionalAuthMiddleware = createMiddleware<AuthContext>(async (c, next) => {
  const hasAuthHeaders =
    c.req.header('X-Agent-Id') && c.req.header('X-Timestamp') && c.req.header('X-Signature');

  if (hasAuthHeaders) {
    return authMiddleware(c, next);
  }

  await next();
});

/**
 * Exported authenticate function for route usage
 * Alias for authMiddleware
 */
export const authenticate = authMiddleware;
