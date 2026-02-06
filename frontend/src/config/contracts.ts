import { type Address } from 'viem';

type ContractAddresses = {
  AgentIdentityRegistry: Address;
  ReputationRegistry: Address;
  BountyRegistry: Address;
  BountyEscrow: Address;
};

// Monad Testnet (Chain ID: 10143) - deployed
const TESTNET_CONTRACTS: ContractAddresses = {
  AgentIdentityRegistry: '0x7b26C4645CD5C76bd0A8183DcCf8eAB9217C1Baf',
  ReputationRegistry: '0xCf1268B92567D7524274D206FA355bbaE277BD67',
  BountyRegistry: '0x35E292348F03D0DF08F2bEbC058760647ed98DB6',
  BountyEscrow: '0x720A593d372D54e6bd751B30C2b34773d60c0952',
};

// Monad Mainnet (Chain ID: 143) - not yet deployed
const MAINNET_CONTRACTS: ContractAddresses = {
  AgentIdentityRegistry: '0x0000000000000000000000000000000000000000',
  ReputationRegistry: '0x0000000000000000000000000000000000000000',
  BountyRegistry: '0x0000000000000000000000000000000000000000',
  BountyEscrow: '0x0000000000000000000000000000000000000000',
};

const CONTRACT_MAP: Record<number, ContractAddresses> = {
  10143: TESTNET_CONTRACTS,
  143: MAINNET_CONTRACTS,
};

export function getContracts(chainId: number | undefined): ContractAddresses {
  return CONTRACT_MAP[chainId ?? 10143] ?? TESTNET_CONTRACTS;
}

// Default export for backward compatibility (testnet)
export const CONTRACTS = TESTNET_CONTRACTS;

export const API_BASE = 'http://localhost:3000';
