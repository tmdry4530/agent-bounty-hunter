import { Address } from 'viem';

export const getContractAddresses = () => ({
  agentIdentityRegistry: process.env.AGENT_IDENTITY_REGISTRY as Address,
  reputationRegistry: process.env.REPUTATION_REGISTRY as Address,
  bountyRegistry: process.env.BOUNTY_REGISTRY as Address,
  bountyEscrow: process.env.BOUNTY_ESCROW as Address,
});
