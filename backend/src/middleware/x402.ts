import { Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { AuthenticatedRequest, ErrorCode, PaymentRequirement, X402Payment } from '../types';
import { getERC20Contract } from '../contracts';

/**
 * x402 Payment Pricing
 */
export const X402_PRICING = {
  REGISTER_AGENT: '1.0',        // 1 USDC
  CREATE_BOUNTY: '0.01',        // 0.01 USDC + 1% of reward
  CLAIM_BOUNTY: '0.001',        // 0.001 USDC
  GET_BOUNTY_DETAILS: '0.001',  // 0.001 USDC
} as const;

/**
 * Create payment requirement response
 */
function createPaymentRequirement(
  amount: string,
  memo: string
): PaymentRequirement {
  const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 minutes

  return {
    amount,
    token: 'USDC',
    tokenAddress: process.env.USDC_TOKEN_ADDRESS!,
    network: 'monad',
    chainId: parseInt(process.env.CHAIN_ID || '41454'),
    recipient: process.env.PLATFORM_WALLET_ADDRESS!,
    memo,
    expiresAt
  };
}

/**
 * Verify payment proof
 */
async function verifyPaymentProof(
  payment: X402Payment,
  requiredAmount: string,
  recipient: string
): Promise<boolean> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
    
    // Verify transaction exists and is confirmed
    const tx = await provider.getTransaction(payment.txHash);
    if (!tx) {
      console.error('Transaction not found:', payment.txHash);
      return false;
    }

    const receipt = await provider.getTransactionReceipt(payment.txHash);
    if (!receipt || receipt.status !== 1) {
      console.error('Transaction not confirmed or failed');
      return false;
    }

    // Verify network
    if (payment.network !== 'monad' || payment.chainId !== parseInt(process.env.CHAIN_ID!)) {
      console.error('Invalid network or chain ID');
      return false;
    }

    // Verify recipient
    if (payment.recipient.toLowerCase() !== recipient.toLowerCase()) {
      console.error('Invalid recipient');
      return false;
    }

    // Verify token address
    if (payment.token.toLowerCase() !== process.env.USDC_TOKEN_ADDRESS!.toLowerCase()) {
      console.error('Invalid token address');
      return false;
    }

    // Verify amount (convert to wei for comparison)
    const requiredAmountWei = ethers.parseUnits(requiredAmount, 6); // USDC has 6 decimals
    const paidAmountWei = BigInt(payment.amount);
    
    if (paidAmountWei < requiredAmountWei) {
      console.error('Insufficient payment amount');
      return false;
    }

    // Verify timestamp (not too old)
    const now = Math.floor(Date.now() / 1000);
    if (now - payment.timestamp > 600) { // 10 minutes
      console.error('Payment proof expired');
      return false;
    }

    // Parse transaction logs to verify transfer
    const tokenContract = getERC20Contract(payment.token, provider);
    const transferEvents = receipt.logs
      .filter(log => log.address.toLowerCase() === payment.token.toLowerCase())
      .map(log => {
        try {
          return tokenContract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
        } catch {
          return null;
        }
      })
      .filter(event => event?.name === 'Transfer');

    const validTransfer = transferEvents.some(event => {
      if (!event) return false;
      return (
        event.args[0].toLowerCase() === payment.sender.toLowerCase() &&
        event.args[1].toLowerCase() === payment.recipient.toLowerCase() &&
        BigInt(event.args[2]) >= requiredAmountWei
      );
    });

    if (!validTransfer) {
      console.error('No valid transfer event found in transaction');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
}

/**
 * x402 middleware factory
 * @param amount - Required payment amount in USDC
 * @param memo - Payment memo/description
 */
export function requirePayment(amount: string, memo: string) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check for X-Payment header
      const paymentHeader = req.headers['x-payment'] as string;

      if (!paymentHeader) {
        // No payment provided - return 402 with payment requirements
        const payment = createPaymentRequirement(amount, memo);
        
        res.status(402).json({
          success: false,
          error: {
            code: ErrorCode.PAYMENT_REQUIRED,
            message: 'Payment required to access this endpoint'
          },
          payment
        });
        return;
      }

      // Decode payment proof
      let payment: X402Payment;
      try {
        const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
        payment = JSON.parse(decoded);
      } catch (error) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.PAYMENT_INVALID,
            message: 'Invalid payment proof format'
          }
        });
        return;
      }

      // Verify payment
      const isValid = await verifyPaymentProof(
        payment,
        amount,
        process.env.PLATFORM_WALLET_ADDRESS!
      );

      if (!isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.PAYMENT_INVALID,
            message: 'Payment verification failed'
          }
        });
        return;
      }

      // Attach payment to request
      req.payment = payment;

      next();
    } catch (error) {
      console.error('x402 middleware error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Payment processing failed'
        }
      });
    }
  };
}

/**
 * Calculate bounty creation fee (0.01 USDC + 1% of reward)
 */
export function calculateBountyFee(rewardAmount: string): string {
  const baseFee = parseFloat(X402_PRICING.CREATE_BOUNTY);
  const rewardFee = parseFloat(rewardAmount) * 0.01;
  return (baseFee + rewardFee).toFixed(6);
}
