import { ethers } from "hardhat";
import {
  AgentIdentityRegistry,
  ReputationRegistry,
  BountyEscrow,
  BountyRegistry,
  MockERC20,
} from "../../typechain-types";

/**
 * Test Fixtures
 * Reusable deployment functions for tests
 */

export interface SystemFixture {
  identityRegistry: AgentIdentityRegistry;
  reputationRegistry: ReputationRegistry;
  escrow: BountyEscrow;
  bountyRegistry: BountyRegistry;
  usdc: MockERC20;
  feeRecipient: string;
}

/**
 * Deploy the complete Agent Bounty Hunter system
 */
export async function deploySystem(): Promise<SystemFixture> {
  const [owner, feeRecipient] = await ethers.getSigners();

  // Deploy Mock USDC
  const TokenFactory = await ethers.getContractFactory("MockERC20");
  const usdc = await TokenFactory.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();

  // Deploy Identity Registry
  const registrationFee = ethers.parseEther("1");
  const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
  const identityRegistry = await IdentityFactory.deploy(registrationFee);
  await identityRegistry.waitForDeployment();

  // Deploy Reputation Registry
  const ReputationFactory = await ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationFactory.deploy(
    await identityRegistry.getAddress()
  );
  await reputationRegistry.waitForDeployment();

  // Deploy Escrow
  const EscrowFactory = await ethers.getContractFactory("BountyEscrow");
  const escrow = await EscrowFactory.deploy(await identityRegistry.getAddress());
  await escrow.waitForDeployment();

  // Deploy Bounty Registry
  const BountyFactory = await ethers.getContractFactory("BountyRegistry");
  const bountyRegistry = await BountyFactory.deploy(
    await identityRegistry.getAddress(),
    await reputationRegistry.getAddress(),
    await escrow.getAddress()
  );
  await bountyRegistry.waitForDeployment();

  // Initialize
  const feeRate = 250; // 2.5% fee
  await escrow.initialize(
    await bountyRegistry.getAddress(),
    owner.address,
    feeRecipient.address,
    feeRate
  );
  await reputationRegistry.setBountyRegistry(await bountyRegistry.getAddress());

  return {
    identityRegistry,
    reputationRegistry,
    escrow,
    bountyRegistry,
    usdc,
    feeRecipient: feeRecipient.address,
  };
}

/**
 * Deploy a standalone Identity Registry for isolated testing
 */
export async function deployIdentityRegistry() {
  const registrationFee = ethers.parseEther("1");
  const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
  const registry = await IdentityFactory.deploy(registrationFee);
  await registry.waitForDeployment();
  return registry;
}

/**
 * Deploy a standalone Mock ERC20 token
 */
export async function deployMockToken(
  name: string = "Test Token",
  symbol: string = "TEST",
  decimals: number = 18
) {
  const TokenFactory = await ethers.getContractFactory("MockERC20");
  const token = await TokenFactory.deploy(name, symbol, decimals);
  await token.waitForDeployment();
  return token;
}
