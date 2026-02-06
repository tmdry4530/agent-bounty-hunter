import { ethers } from 'ethers';

export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export interface RequestMessage {
  agentId: bigint;
  method: string;
  path: string;
  timestamp: number;
}

export const EIP712_TYPES = {
  Request: [
    { name: 'agentId', type: 'uint256' },
    { name: 'method', type: 'string' },
    { name: 'path', type: 'string' },
    { name: 'timestamp', type: 'uint256' }
  ]
};

/**
 * Verify EIP-712 signature for API requests
 */
export async function verifyEIP712Signature(
  domain: EIP712Domain,
  message: RequestMessage,
  signature: string,
  expectedSigner: string
): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyTypedData(
      domain,
      EIP712_TYPES,
      message,
      signature
    );
    
    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    console.error('EIP-712 signature verification failed:', error);
    return false;
  }
}

/**
 * Get EIP-712 domain from environment
 */
export function getEIP712Domain(): EIP712Domain {
  return {
    name: process.env.EIP712_DOMAIN_NAME || 'AgentBountyHunter',
    version: process.env.EIP712_DOMAIN_VERSION || '1',
    chainId: parseInt(process.env.CHAIN_ID || '143'),
    verifyingContract: process.env.EIP712_VERIFYING_CONTRACT || ethers.ZeroAddress
  };
}
