import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Test Utility Functions
 */

/**
 * Create a bounty parameters object
 */
export function createBountyParams(
  creatorAgentId: bigint,
  rewardToken: string,
  rewardAmount: bigint,
  overrides: Partial<BountyParams> = {}
) {
  return {
    creatorAgentId,
    title: "Test Bounty",
    descriptionURI: "ipfs://QmTest",
    rewardToken,
    rewardAmount,
    deadline: 0, // Will be set below
    minReputation: 50,
    requiredSkills: [],
    ...overrides,
  };
}

/**
 * Create a bounty parameters object with a deadline
 */
export async function createBountyParamsWithDeadline(
  creatorAgentId: bigint,
  rewardToken: string,
  rewardAmount: bigint,
  daysFromNow: number = 1,
  overrides: Partial<BountyParams> = {}
) {
  const deadline = (await time.latest()) + daysFromNow * 86400;
  
  return {
    creatorAgentId,
    title: "Test Bounty",
    descriptionURI: "ipfs://QmTest",
    rewardToken,
    rewardAmount,
    deadline,
    minReputation: 50,
    requiredSkills: [],
    ...overrides,
  };
}

/**
 * Create EIP-712 signature for agent wallet update
 */
export async function signAgentWalletUpdate(
  signer: SignerWithAddress,
  registryAddress: string,
  agentId: bigint,
  newWallet: string,
  deadline: number
) {
  const domain = {
    name: "AgentIdentityRegistry",
    version: "1",
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: registryAddress,
  };

  const types = {
    SetAgentWallet: [
      { name: "agentId", type: "uint256" },
      { name: "newWallet", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const value = {
    agentId,
    newWallet,
    deadline,
  };

  return await signer.signTypedData(domain, types, value);
}

/**
 * Format USDC amount (6 decimals)
 */
export function usdc(amount: string): bigint {
  return ethers.parseUnits(amount, 6);
}

/**
 * Format ETH/MON amount (18 decimals)
 */
export function eth(amount: string): bigint {
  return ethers.parseEther(amount);
}

/**
 * Get timestamp N days from now
 */
export async function daysFromNow(days: number): Promise<number> {
  return (await time.latest()) + days * 86400;
}

/**
 * Get timestamp N hours from now
 */
export async function hoursFromNow(hours: number): Promise<number> {
  return (await time.latest()) + hours * 3600;
}

/**
 * Advance blockchain time by N days
 */
export async function advanceDays(days: number): Promise<void> {
  await time.increase(days * 86400);
}

/**
 * Advance blockchain time by N hours
 */
export async function advanceHours(hours: number): Promise<void> {
  await time.increase(hours * 3600);
}

/**
 * Create metadata entry for agent registration
 */
export function metadataEntry(key: string, value: string) {
  return {
    key,
    value: ethers.toUtf8Bytes(value),
  };
}

/**
 * Calculate platform fee
 */
export function calculatePlatformFee(
  amount: bigint,
  feeBps: number = 100
): bigint {
  return (amount * BigInt(feeBps)) / 10000n;
}

/**
 * Register an agent and return the agent ID
 */
export async function registerAgent(
  identityRegistry: any,
  signer: SignerWithAddress,
  uri: string = "ipfs://QmDefault",
  registrationFee: bigint = ethers.parseEther("1")
): Promise<bigint> {
  const totalBefore = await identityRegistry.totalAgents();
  
  await identityRegistry.connect(signer).register(uri, {
    value: registrationFee,
  });
  
  return totalBefore + 1n;
}

/**
 * Create and approve a bounty
 */
export async function createBounty(
  bountyRegistry: any,
  token: any,
  creator: SignerWithAddress,
  params: any,
  escrowAddress: string
): Promise<bigint> {
  const totalBefore = await bountyRegistry.totalBounties();
  
  await token.connect(creator).approve(escrowAddress, params.rewardAmount);
  await bountyRegistry.connect(creator).createBounty(params);
  
  return totalBefore + 1n;
}

/**
 * Complete a full bounty lifecycle (claim -> submit -> approve)
 */
export async function completeBounty(
  bountyRegistry: any,
  bountyId: bigint,
  hunter: SignerWithAddress,
  hunterAgentId: bigint,
  creator: SignerWithAddress,
  rating: number = 5,
  feedback: string = "Great work!"
): Promise<void> {
  await bountyRegistry.connect(hunter).claimBounty(bountyId, hunterAgentId);
  await bountyRegistry.connect(hunter).submitWork(bountyId, "ipfs://QmSubmission");
  await bountyRegistry.connect(creator).approveBounty(bountyId, rating, feedback);
}

// Type definitions
export interface BountyParams {
  creatorAgentId: bigint;
  title: string;
  descriptionURI: string;
  rewardToken: string;
  rewardAmount: bigint;
  deadline: number;
  minReputation: number;
  requiredSkills: string[];
}

export interface MetadataEntry {
  key: string;
  value: Uint8Array;
}
