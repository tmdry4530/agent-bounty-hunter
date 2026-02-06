import type { Hex, Address } from 'viem';
import type { PaymentRequirement, PaymentConfig } from './types';

export type { PaymentConfig };

export interface PaymentResult {
  success: boolean;
  txHash?: Hex;
  error?: string;
}

/**
 * Parse x402 payment requirement from response headers
 */
export function parsePaymentRequirement(response: Response): PaymentRequirement | null {
  const contentType = response.headers.get('content-type');

  if (response.status !== 402) {
    return null;
  }

  // Try to parse from body (will be done by caller)
  return null;
}

/**
 * Parse payment requirement from response body
 */
export async function parsePaymentBody(response: Response): Promise<PaymentRequirement | null> {
  try {
    const body = await response.json() as unknown;
    if (body && typeof body === 'object' && ('paymentRequired' in body || 'payment' in body)) {
      const payment = (body as any).paymentRequired || (body as any).payment;
      return {
        amount: payment.amount as string,
        token: payment.token as Address,
        recipient: payment.recipient as Address,
        chainId: (payment.chainId as number) || 143,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create x402 payment header
 * For simplicity, this creates a placeholder - real x402 requires proper signing
 */
export function createPaymentHeader(
  requirement: PaymentRequirement,
  privateKey: Hex
): string {
  // In a real implementation, this would:
  // 1. Create a signed payment intent
  // 2. Encode it in the x402 format
  // For now, return a placeholder that the dev bypass mode will accept
  return `x402-payment:${requirement.amount}:${requirement.token}:${requirement.recipient}`;
}

/**
 * Check if auto-payment should be attempted
 */
export function shouldAutoPay(
  config: PaymentConfig,
  requirement: PaymentRequirement
): boolean {
  if (!config.autoPayEnabled || !config.privateKey) {
    return false;
  }

  // Add additional checks here (balance, allowance, etc.)
  return true;
}

/**
 * Calculate total cost for a bounty creation
 * Base fee: 0.01 USDC + 1% of reward
 */
export function calculateBountyCreationFee(rewardAmount: bigint): bigint {
  const baseFee = 10000n; // 0.01 USDC (6 decimals)
  const percentFee = rewardAmount / 100n; // 1%
  return baseFee + percentFee;
}

/**
 * Standard endpoint prices in USDC (6 decimals)
 */
export const ENDPOINT_PRICES = {
  register: 1000000n,    // 1 USDC
  createBounty: 10000n,  // 0.01 USDC base (+ 1%)
  getBountyDetails: 1000n, // 0.001 USDC
  claimBounty: 1000n,    // 0.001 USDC
} as const;
