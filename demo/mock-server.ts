/**
 * MockServer - In-memory contract simulation for local testing
 *
 * Simulates the full smart contract stack without needing Monad connection:
 * - AgentRegistry (NFT-based agent identities)
 * - BountyRegistry (bounty lifecycle management)
 * - BountyEscrow (funds management)
 * - ReputationRegistry (agent reputation tracking)
 * - MockERC20 (USDC token)
 */

import { ethers } from 'ethers';

// Contract addresses (matching existing demo config)
export const CONTRACT_ADDRESSES = {
  USDC: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  agentRegistry: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  bountyRegistry: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  escrow: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  reputation: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'
} as const;

// Bounty Status enum
export enum BountyStatus {
  Open = 0,
  Claimed = 1,
  Submitted = 2,
  Approved = 3,
  Rejected = 4,
  Disputed = 5,
  Resolved = 6,
  Cancelled = 7,
  Paid = 8
}

// Core data structures
export interface MockAgent {
  id: number;
  owner: string;
  agentURI: string;
  wallet: string;
  active: boolean;
  registeredAt: number;
}

export interface MockBounty {
  id: number;
  creatorAgentId: number;
  hunterAgentId: number;
  title: string;
  descriptionURI: string;
  rewardToken: string;
  rewardAmount: bigint;
  deadline: number;
  status: BountyStatus;
  submissionURI: string;
  createdAt: number;
  claimedAt?: number;
  submittedAt?: number;
  completedAt?: number;
}

export interface MockReputation {
  agentId: number;
  score: number;
  completedBounties: number;
  totalEarnings: bigint;
  ratings: number[];
  feedbacks: string[];
}

export interface EscrowEntry {
  bountyId: number;
  token: string;
  amount: bigint;
  depositor: string;
  released: boolean;
}

export interface MockState {
  agents: Map<number, MockAgent>;
  bounties: Map<number, MockBounty>;
  escrow: Map<number, EscrowEntry>;
  reputations: Map<number, MockReputation>;
  balances: Map<string, bigint>; // address -> USDC balance (6 decimals)
  allowances: Map<string, Map<string, bigint>>; // owner -> spender -> amount
  nextAgentId: number;
  nextBountyId: number;
}

/**
 * Mock AgentRegistry - NFT-based agent identity system
 */
export class MockAgentRegistry {
  constructor(private state: MockState) {}

  async register(agentURI: string, wallet: string, value: bigint = BigInt(0)): Promise<number> {
    const agentId = this.state.nextAgentId++;

    const agent: MockAgent = {
      id: agentId,
      owner: wallet,
      agentURI,
      wallet,
      active: true,
      registeredAt: Date.now()
    };

    this.state.agents.set(agentId, agent);

    // Initialize reputation
    this.state.reputations.set(agentId, {
      agentId,
      score: 100, // Starting score
      completedBounties: 0,
      totalEarnings: BigInt(0),
      ratings: [],
      feedbacks: []
    });

    return agentId;
  }

  async getAgent(agentId: number): Promise<MockAgent | null> {
    return this.state.agents.get(agentId) || null;
  }

  async ownerOf(tokenId: number): Promise<string | null> {
    const agent = this.state.agents.get(tokenId);
    return agent?.owner || null;
  }

  async totalAgents(): Promise<number> {
    return this.state.agents.size;
  }

  async updateAgentURI(agentId: number, newURI: string, caller: string): Promise<void> {
    const agent = this.state.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    if (agent.owner !== caller) throw new Error('Not agent owner');

    agent.agentURI = newURI;
  }

  async deactivateAgent(agentId: number, caller: string): Promise<void> {
    const agent = this.state.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    if (agent.owner !== caller) throw new Error('Not agent owner');

    agent.active = false;
  }
}

/**
 * Mock BountyRegistry - Bounty lifecycle management
 */
export class MockBountyRegistry {
  constructor(
    private state: MockState,
    private escrow: MockEscrow,
    private reputation: MockReputationRegistry
  ) {}

  async createBounty(params: {
    creatorAgentId: number;
    title: string;
    descriptionURI: string;
    rewardToken: string;
    rewardAmount: bigint;
    deadline: number;
    caller: string;
  }): Promise<number> {
    const agent = this.state.agents.get(params.creatorAgentId);
    if (!agent) throw new Error('Creator agent not found');
    if (agent.owner !== params.caller) throw new Error('Not agent owner');
    if (!agent.active) throw new Error('Agent not active');

    const bountyId = this.state.nextBountyId++;

    const bounty: MockBounty = {
      id: bountyId,
      creatorAgentId: params.creatorAgentId,
      hunterAgentId: 0,
      title: params.title,
      descriptionURI: params.descriptionURI,
      rewardToken: params.rewardToken,
      rewardAmount: params.rewardAmount,
      deadline: params.deadline,
      status: BountyStatus.Open,
      submissionURI: '',
      createdAt: Date.now()
    };

    this.state.bounties.set(bountyId, bounty);

    // Deposit funds to escrow
    await this.escrow.deposit(bountyId, params.rewardToken, params.rewardAmount, params.caller);

    return bountyId;
  }

  async claimBounty(bountyId: number, hunterAgentId: number, caller: string): Promise<void> {
    const bounty = this.state.bounties.get(bountyId);
    if (!bounty) throw new Error('Bounty not found');
    if (bounty.status !== BountyStatus.Open) throw new Error('Bounty not open');

    const agent = this.state.agents.get(hunterAgentId);
    if (!agent) throw new Error('Hunter agent not found');
    if (agent.owner !== caller) throw new Error('Not agent owner');
    if (!agent.active) throw new Error('Agent not active');

    if (bounty.creatorAgentId === hunterAgentId) {
      throw new Error('Creator cannot claim own bounty');
    }

    if (Date.now() > bounty.deadline) {
      throw new Error('Bounty expired');
    }

    bounty.hunterAgentId = hunterAgentId;
    bounty.status = BountyStatus.Claimed;
    bounty.claimedAt = Date.now();
  }

  async submitWork(bountyId: number, submissionURI: string, caller: string): Promise<void> {
    const bounty = this.state.bounties.get(bountyId);
    if (!bounty) throw new Error('Bounty not found');
    if (bounty.status !== BountyStatus.Claimed) throw new Error('Bounty not claimed');

    const agent = this.state.agents.get(bounty.hunterAgentId);
    if (!agent) throw new Error('Hunter agent not found');
    if (agent.owner !== caller) throw new Error('Not the hunter');

    bounty.submissionURI = submissionURI;
    bounty.status = BountyStatus.Submitted;
    bounty.submittedAt = Date.now();
  }

  async approveBounty(
    bountyId: number,
    rating: number,
    feedbackURI: string,
    caller: string
  ): Promise<void> {
    const bounty = this.state.bounties.get(bountyId);
    if (!bounty) throw new Error('Bounty not found');
    if (bounty.status !== BountyStatus.Submitted) throw new Error('No submission to approve');

    const creator = this.state.agents.get(bounty.creatorAgentId);
    if (!creator) throw new Error('Creator agent not found');
    if (creator.owner !== caller) throw new Error('Not the creator');

    bounty.status = BountyStatus.Approved;
    bounty.completedAt = Date.now();

    // Release escrow
    await this.escrow.release(bountyId);

    // Record reputation
    await this.reputation.recordCompletion(
      bounty.hunterAgentId,
      bountyId,
      bounty.rewardAmount,
      rating,
      feedbackURI
    );

    // Mark as paid
    bounty.status = BountyStatus.Paid;
  }

  async rejectBounty(bountyId: number, reason: string, caller: string): Promise<void> {
    const bounty = this.state.bounties.get(bountyId);
    if (!bounty) throw new Error('Bounty not found');
    if (bounty.status !== BountyStatus.Submitted) throw new Error('No submission to reject');

    const creator = this.state.agents.get(bounty.creatorAgentId);
    if (!creator) throw new Error('Creator agent not found');
    if (creator.owner !== caller) throw new Error('Not the creator');

    bounty.status = BountyStatus.Rejected;
    // In a real system, this might trigger a dispute resolution process
  }

  async cancelBounty(bountyId: number, caller: string): Promise<void> {
    const bounty = this.state.bounties.get(bountyId);
    if (!bounty) throw new Error('Bounty not found');
    if (bounty.status !== BountyStatus.Open) throw new Error('Can only cancel open bounties');

    const creator = this.state.agents.get(bounty.creatorAgentId);
    if (!creator) throw new Error('Creator agent not found');
    if (creator.owner !== caller) throw new Error('Not the creator');

    bounty.status = BountyStatus.Cancelled;

    // Refund escrow
    const escrowEntry = this.state.escrow.get(bountyId);
    if (escrowEntry && !escrowEntry.released) {
      // Transfer back to creator
      const creatorBalance = this.state.balances.get(creator.wallet) || BigInt(0);
      this.state.balances.set(creator.wallet, creatorBalance + escrowEntry.amount);
      escrowEntry.released = true;
    }
  }

  async getBounty(bountyId: number): Promise<MockBounty | null> {
    return this.state.bounties.get(bountyId) || null;
  }

  async getActiveBounties(): Promise<MockBounty[]> {
    return Array.from(this.state.bounties.values()).filter(
      b => b.status === BountyStatus.Open || b.status === BountyStatus.Claimed
    );
  }

  async getBountyCount(): Promise<number> {
    return this.state.bounties.size;
  }
}

/**
 * Mock BountyEscrow - Funds management
 */
export class MockEscrow {
  constructor(
    private state: MockState,
    private erc20: MockERC20
  ) {}

  async deposit(bountyId: number, token: string, amount: bigint, from: string): Promise<void> {
    // Transfer tokens from depositor to escrow
    await this.erc20.transferFrom(from, CONTRACT_ADDRESSES.escrow, amount);

    const entry: EscrowEntry = {
      bountyId,
      token,
      amount,
      depositor: from,
      released: false
    };

    this.state.escrow.set(bountyId, entry);
  }

  async release(bountyId: number): Promise<void> {
    const entry = this.state.escrow.get(bountyId);
    if (!entry) throw new Error('Escrow entry not found');
    if (entry.released) throw new Error('Already released');

    const bounty = this.state.bounties.get(bountyId);
    if (!bounty) throw new Error('Bounty not found');

    const hunter = this.state.agents.get(bounty.hunterAgentId);
    if (!hunter) throw new Error('Hunter not found');

    // Transfer from escrow to hunter
    const escrowBalance = this.state.balances.get(CONTRACT_ADDRESSES.escrow) || BigInt(0);
    const hunterBalance = this.state.balances.get(hunter.wallet) || BigInt(0);

    if (escrowBalance < entry.amount) {
      throw new Error('Insufficient escrow balance');
    }

    this.state.balances.set(CONTRACT_ADDRESSES.escrow, escrowBalance - entry.amount);
    this.state.balances.set(hunter.wallet, hunterBalance + entry.amount);

    entry.released = true;
  }

  async getEscrow(bountyId: number): Promise<EscrowEntry | null> {
    return this.state.escrow.get(bountyId) || null;
  }

  async getTotalEscrowed(token: string): Promise<bigint> {
    let total = BigInt(0);
    for (const entry of this.state.escrow.values()) {
      if (entry.token === token && !entry.released) {
        total += entry.amount;
      }
    }
    return total;
  }
}

/**
 * Mock ReputationRegistry - Agent reputation tracking
 */
export class MockReputationRegistry {
  constructor(private state: MockState) {}

  async getReputationScore(agentId: number): Promise<number> {
    const rep = this.state.reputations.get(agentId);
    return rep?.score || 0;
  }

  async recordCompletion(
    agentId: number,
    bountyId: number,
    reward: bigint,
    rating: number,
    feedbackURI: string
  ): Promise<void> {
    const rep = this.state.reputations.get(agentId);
    if (!rep) throw new Error('Reputation entry not found');

    rep.completedBounties++;
    rep.totalEarnings += reward;
    rep.ratings.push(rating);
    rep.feedbacks.push(feedbackURI);

    // Simple reputation calculation: average rating * 20 + completion bonus
    const avgRating = rep.ratings.reduce((a, b) => a + b, 0) / rep.ratings.length;
    const completionBonus = Math.min(rep.completedBounties * 5, 100);
    rep.score = Math.floor(avgRating * 20 + completionBonus);
  }

  async getReputation(agentId: number): Promise<MockReputation | null> {
    return this.state.reputations.get(agentId) || null;
  }

  async getTopAgents(limit: number = 10): Promise<MockReputation[]> {
    return Array.from(this.state.reputations.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

/**
 * Mock ERC20 - USDC token simulation
 */
export class MockERC20 {
  constructor(private state: MockState) {}

  async balanceOf(address: string): Promise<bigint> {
    return this.state.balances.get(address) || BigInt(0);
  }

  async transfer(from: string, to: string, amount: bigint): Promise<boolean> {
    const fromBalance = this.state.balances.get(from) || BigInt(0);
    if (fromBalance < amount) {
      throw new Error('Insufficient balance');
    }

    const toBalance = this.state.balances.get(to) || BigInt(0);
    this.state.balances.set(from, fromBalance - amount);
    this.state.balances.set(to, toBalance + amount);

    return true;
  }

  async approve(owner: string, spender: string, amount: bigint): Promise<boolean> {
    if (!this.state.allowances.has(owner)) {
      this.state.allowances.set(owner, new Map());
    }
    this.state.allowances.get(owner)!.set(spender, amount);
    return true;
  }

  async allowance(owner: string, spender: string): Promise<bigint> {
    return this.state.allowances.get(owner)?.get(spender) || BigInt(0);
  }

  async transferFrom(from: string, to: string, amount: bigint): Promise<boolean> {
    // Note: In real ERC20, this would check msg.sender's allowance
    // For simplicity, we'll just do the transfer
    return await this.transfer(from, to, amount);
  }

  async mint(to: string, amount: bigint): Promise<void> {
    const balance = this.state.balances.get(to) || BigInt(0);
    this.state.balances.set(to, balance + amount);
  }
}

/**
 * MockServer - Complete contract simulation
 */
export class MockServer {
  public state: MockState;
  public erc20: MockERC20;
  public escrow: MockEscrow;
  public reputation: MockReputationRegistry;
  public agentRegistry: MockAgentRegistry;
  public bountyRegistry: MockBountyRegistry;

  constructor(initialBalances: Map<string, bigint> = new Map()) {
    // Initialize state
    this.state = {
      agents: new Map(),
      bounties: new Map(),
      escrow: new Map(),
      reputations: new Map(),
      balances: new Map(initialBalances),
      allowances: new Map(),
      nextAgentId: 1,
      nextBountyId: 1
    };

    // Initialize contract simulators
    this.erc20 = new MockERC20(this.state);
    this.reputation = new MockReputationRegistry(this.state);
    this.escrow = new MockEscrow(this.state, this.erc20);
    this.agentRegistry = new MockAgentRegistry(this.state);
    this.bountyRegistry = new MockBountyRegistry(this.state, this.escrow, this.reputation);
  }

  /**
   * Pre-fund a wallet with USDC
   */
  async fundWallet(address: string, usdcAmount: string): Promise<void> {
    const amount = ethers.parseUnits(usdcAmount, 6);
    await this.erc20.mint(address, amount);
  }

  /**
   * Get contract addresses
   */
  getAddresses() {
    return CONTRACT_ADDRESSES;
  }

  /**
   * Reset the mock server state
   */
  reset(): void {
    this.state.agents.clear();
    this.state.bounties.clear();
    this.state.escrow.clear();
    this.state.reputations.clear();
    this.state.balances.clear();
    this.state.allowances.clear();
    this.state.nextAgentId = 1;
    this.state.nextBountyId = 1;
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      totalAgents: this.state.agents.size,
      totalBounties: this.state.bounties.size,
      openBounties: Array.from(this.state.bounties.values()).filter(
        b => b.status === BountyStatus.Open
      ).length,
      completedBounties: Array.from(this.state.bounties.values()).filter(
        b => b.status === BountyStatus.Paid
      ).length,
      totalEscrowed: Array.from(this.state.escrow.values())
        .filter(e => !e.released)
        .reduce((sum, e) => sum + e.amount, BigInt(0))
    };
  }
}

/**
 * Factory function to create a mock server with pre-funded wallets
 */
export function createMockServer(testWallets: string[] = []): MockServer {
  const initialBalances = new Map<string, bigint>();

  // Pre-fund test wallets with 1000 USDC each
  const defaultAmount = ethers.parseUnits('1000', 6);
  for (const wallet of testWallets) {
    initialBalances.set(wallet, defaultAmount);
  }

  // Also fund the escrow contract itself (for testing)
  initialBalances.set(CONTRACT_ADDRESSES.escrow, BigInt(0));

  return new MockServer(initialBalances);
}
