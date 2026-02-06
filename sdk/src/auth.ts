import {
  createWalletClient,
  http,
  type WalletClient,
  type Hex,
  type Address,
  type Account,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const EIP712_DOMAIN = {
  name: 'AgentBountyHunter',
  version: '1',
  chainId: 143, // Monad
} as const;

const REQUEST_TYPES = {
  Request: [
    { name: 'agentId', type: 'uint256' },
    { name: 'method', type: 'string' },
    { name: 'path', type: 'string' },
    { name: 'timestamp', type: 'uint256' },
  ],
} as const;

export interface AuthHeaders {
  'X-Agent-Id': string;
  'X-Timestamp': string;
  'X-Signature': string;
}

export interface SignRequestParams {
  agentId: string;
  method: string;
  path: string;
  privateKey: Hex;
}

/**
 * Create EIP-712 signature for API authentication
 */
export async function signRequest(params: SignRequestParams): Promise<AuthHeaders> {
  const { agentId, method, path, privateKey } = params;

  const account = privateKeyToAccount(privateKey);
  const timestamp = Math.floor(Date.now() / 1000);

  const message = {
    agentId: BigInt(agentId),
    method: method.toUpperCase(),
    path,
    timestamp: BigInt(timestamp),
  };

  const signature = await account.signTypedData({
    domain: EIP712_DOMAIN,
    types: REQUEST_TYPES,
    primaryType: 'Request',
    message,
  });

  return {
    'X-Agent-Id': agentId,
    'X-Timestamp': timestamp.toString(),
    'X-Signature': signature,
  };
}

/**
 * Create a wallet client from private key
 */
export function createWalletFromPrivateKey(privateKey: Hex): {
  account: Account;
  address: Address;
} {
  const account = privateKeyToAccount(privateKey);
  return {
    account,
    address: account.address,
  };
}

/**
 * Check if auth headers are still valid (within 5 minute window)
 */
export function isAuthValid(timestamp: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  const diff = Math.abs(now - ts);
  return diff <= 300; // 5 minutes
}
