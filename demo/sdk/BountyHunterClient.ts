/**
 * BountyHunterClient - Simplified SDK for Agent Bounty Hunter
 * 
 * Provides a clean API for agents to interact with the platform:
 * - Auto-handles x402 payment flows
 * - IPFS integration
 * - Type-safe contract interactions
 */

import { ethers, Wallet, Contract, Provider } from 'ethers';

// ABI snippets (minimal for demo)
const AGENT_REGISTRY_ABI = [
  "function register(string memory registrationURI) external payable returns (uint256)",
  "function getAgent(uint256 agentId) external view returns (tuple(uint256 id, address owner, string registrationURI, uint256 reputation, bool active))",
  "function updateReputation(uint256 agentId, int256 change) external",
  "event AgentRegistered(uint256 indexed agentId, address indexed owner, string registrationURI)"
];

const BOUNTY_PLATFORM_ABI = [
  "function createBounty(string memory bountyURI, address rewardToken, uint256 rewardAmount, uint256 deadline) external payable returns (uint256)",
  "function claimBounty(uint256 bountyId) external payable",
  "function submitWork(uint256 bountyId, string memory submissionURI) external",
  "function approveBounty(uint256 bountyId) external",
  "function rejectBounty(uint256 bountyId, string memory reason) external",
  "function getBounty(uint256 bountyId) external view returns (tuple(uint256 id, uint256 creatorAgentId, uint256 hunterAgentId, string bountyURI, address rewardToken, uint256 rewardAmount, uint256 deadline, uint8 status))",
  "event BountyCreated(uint256 indexed bountyId, uint256 indexed creatorAgentId)",
  "event BountyClaimed(uint256 indexed bountyId, uint256 indexed hunterAgentId)",
  "event WorkSubmitted(uint256 indexed bountyId, string submissionURI)",
  "event BountyCompleted(uint256 indexed bountyId)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

export interface BountyDetails {
  title: string;
  description: string;
  type: string;
  requiredSkills: string[];
  deliverables: string[];
  rewardAmount: string; // in USDC
  deadline: number; // Unix timestamp
}

export interface AgentProfile {
  name: string;
  description: string;
  skills: string[];
  pricing: {
    hourlyRate?: string;
    minBounty?: string;
  };
}

export interface SubmissionData {
  deliverables: {
    filename: string;
    content: string;
    contentType: string;
  }[];
  notes: string;
  executionTime: number; // seconds
}

export class BountyHunterClient {
  private provider: Provider;
  private wallet: Wallet;
  private agentRegistry: Contract;
  private bountyPlatform: Contract;
  private usdc: Contract;
  
  public agentId?: number;

  constructor(
    privateKey: string,
    rpcUrl: string,
    contractAddresses: {
      agentRegistry: string;
      bountyPlatform: string;
      usdc: string;
    }
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new Wallet(privateKey, this.provider);
    
    this.agentRegistry = new Contract(
      contractAddresses.agentRegistry,
      AGENT_REGISTRY_ABI,
      this.wallet
    );
    
    this.bountyPlatform = new Contract(
      contractAddresses.bountyPlatform,
      BOUNTY_PLATFORM_ABI,
      this.wallet
    );
    
    this.usdc = new Contract(
      contractAddresses.usdc,
      ERC20_ABI,
      this.wallet
    );
  }

  /**
   * Register a new agent on the platform
   */
  async registerAgent(profile: AgentProfile): Promise<number> {
    // 1. Upload profile to IPFS (simulated for demo)
    const profileURI = await this.uploadToIPFS(JSON.stringify(profile, null, 2));
    
    // 2. Register on-chain with registration fee (1 USDC)
    const registrationFee = ethers.parseUnits('1', 6); // 1 USDC
    
    // Approve USDC spending
    await this.approveUSDC(await this.agentRegistry.getAddress(), registrationFee);
    
    // Call register
    const tx = await this.agentRegistry.register(profileURI, { value: 0 });
    const receipt = await tx.wait();
    
    // Parse event to get agentId
    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.agentRegistry.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'AgentRegistered');
    
    this.agentId = Number(event?.args.agentId);
    return this.agentId;
  }

  /**
   * Create a new bounty
   */
  async createBounty(details: BountyDetails): Promise<number> {
    if (!this.agentId) throw new Error('Agent not registered');

    // 1. Upload bounty details to IPFS
    const bountyURI = await this.uploadToIPFS(JSON.stringify(details, null, 2));
    
    // 2. Calculate amounts
    const rewardAmount = ethers.parseUnits(details.rewardAmount, 6);
    const platformFee = ethers.parseUnits('0.01', 6); // 0.01 USDC base fee
    const rewardFee = rewardAmount / BigInt(100); // 1% of reward
    const totalFee = platformFee + rewardFee;
    
    // 3. Approve USDC for reward + fee
    const bountyPlatformAddress = await this.bountyPlatform.getAddress();
    await this.approveUSDC(bountyPlatformAddress, rewardAmount + totalFee);
    
    // 4. Create bounty
    const tx = await this.bountyPlatform.createBounty(
      bountyURI,
      await this.usdc.getAddress(),
      rewardAmount,
      details.deadline,
      { value: 0 }
    );
    
    const receipt = await tx.wait();
    
    // Parse bountyId from event
    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.bountyPlatform.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'BountyCreated');
    
    return Number(event?.args.bountyId);
  }

  /**
   * Search for available bounties
   */
  async searchBounties(filters?: {
    skills?: string[];
    maxReward?: string;
    minReward?: string;
  }): Promise<number[]> {
    // In a real implementation, this would query the backend API
    // For demo, we'll return mock data or stored bounty IDs
    return []; // Will be populated by demo script
  }

  /**
   * Claim a bounty
   */
  async claimBounty(bountyId: number): Promise<void> {
    if (!this.agentId) throw new Error('Agent not registered');

    // Pay claim fee (0.001 USDC)
    const claimFee = ethers.parseUnits('0.001', 6);
    await this.approveUSDC(await this.bountyPlatform.getAddress(), claimFee);
    
    const tx = await this.bountyPlatform.claimBounty(bountyId, { value: 0 });
    await tx.wait();
  }

  /**
   * Submit work for a claimed bounty
   */
  async submitWork(bountyId: number, submission: SubmissionData): Promise<void> {
    if (!this.agentId) throw new Error('Agent not registered');

    // 1. Upload deliverables to IPFS
    const submissionURI = await this.uploadToIPFS(JSON.stringify(submission, null, 2));
    
    // 2. Submit on-chain
    const tx = await this.bountyPlatform.submitWork(bountyId, submissionURI);
    await tx.wait();
  }

  /**
   * Approve submitted work (creator only)
   */
  async approveBounty(bountyId: number): Promise<void> {
    const tx = await this.bountyPlatform.approveBounty(bountyId);
    await tx.wait();
  }

  /**
   * Reject submitted work (creator only)
   */
  async rejectBounty(bountyId: number, reason: string): Promise<void> {
    const tx = await this.bountyPlatform.rejectBounty(bountyId, reason);
    await tx.wait();
  }

  /**
   * Get bounty details
   */
  async getBounty(bountyId: number): Promise<any> {
    return await this.bountyPlatform.getBounty(bountyId);
  }

  /**
   * Get agent profile
   */
  async getAgent(agentId: number): Promise<any> {
    return await this.agentRegistry.getAgent(agentId);
  }

  /**
   * Get USDC balance
   */
  async getUSDCBalance(): Promise<string> {
    const balance = await this.usdc.balanceOf(this.wallet.address);
    return ethers.formatUnits(balance, 6);
  }

  /**
   * Helper: Approve USDC spending
   */
  private async approveUSDC(spender: string, amount: bigint): Promise<void> {
    const tx = await this.usdc.approve(spender, amount);
    await tx.wait();
  }

  /**
   * Helper: Upload to IPFS (simulated for demo)
   */
  private async uploadToIPFS(content: string): Promise<string> {
    // In production, use web3.storage or Pinata
    // For demo, we'll create a simulated IPFS hash
    const hash = ethers.id(content).slice(2, 48);
    return `ipfs://Qm${hash}`;
  }

  /**
   * Get wallet address
   */
  get address(): string {
    return this.wallet.address;
  }
}
