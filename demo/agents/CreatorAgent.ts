/**
 * CreatorAgent - Posts bounties and reviews submissions
 * 
 * Simulates a project or organization that:
 * - Creates tasks as bounties
 * - Reviews submitted work
 * - Approves/rejects based on quality
 */

import { BountyHunterClient, type BountyDetails } from '../sdk/BountyHunterClient.js';
import chalk from 'chalk';

export interface CreatorConfig {
  name: string;
  description: string;
  skills: string[];
  autoApprove?: boolean; // For demo purposes
}

export class CreatorAgent {
  private client: BountyHunterClient;
  private config: CreatorConfig;
  private activeBounties: Map<number, BountyDetails> = new Map();

  constructor(client: BountyHunterClient, config: CreatorConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Initialize the agent (register on platform)
   */
  async initialize(): Promise<void> {
    console.log(chalk.cyan(`\n🏢 Initializing ${this.config.name}...`));
    
    const agentId = await this.client.registerAgent({
      name: this.config.name,
      description: this.config.description,
      skills: this.config.skills,
      pricing: {
        minBounty: '5'
      }
    });
    
    console.log(chalk.green(`✅ Registered as Agent #${agentId}`));
    console.log(chalk.gray(`   Address: ${this.client.address}`));
  }

  /**
   * Post a new bounty
   */
  async postBounty(details: BountyDetails): Promise<number> {
    console.log(chalk.cyan(`\n📋 Creating bounty: "${details.title}"`));
    console.log(chalk.gray(`   Reward: ${details.rewardAmount} USDC`));
    console.log(chalk.gray(`   Skills: ${details.requiredSkills.join(', ')}`));
    
    try {
      const bountyId = await this.client.createBounty(details);
      this.activeBounties.set(bountyId, details);
      
      console.log(chalk.green(`✅ Bounty #${bountyId} created successfully`));
      console.log(chalk.gray(`   Escrow locked: ${details.rewardAmount} USDC`));
      
      return bountyId;
    } catch (error: any) {
      console.log(chalk.red(`❌ Failed to create bounty: ${error.message}`));
      throw error;
    }
  }

  /**
   * Review a submission
   */
  async reviewSubmission(bountyId: number): Promise<'approve' | 'reject'> {
    console.log(chalk.cyan(`\n🔍 Reviewing submission for Bounty #${bountyId}...`));
    
    const bounty = this.activeBounties.get(bountyId);
    if (!bounty) {
      throw new Error(`Bounty #${bountyId} not found`);
    }
    
    // Simulate review process
    await this.sleep(1500);
    
    // Get submission details from chain
    const bountyData = await this.client.getBounty(bountyId);
    console.log(chalk.gray(`   Hunter: Agent #${bountyData.hunterAgentId}`));
    
    // Simulate quality check
    console.log(chalk.gray(`   ⏳ Checking deliverables...`));
    await this.sleep(1000);
    
    console.log(chalk.gray(`   ⏳ Verifying requirements...`));
    await this.sleep(800);
    
    console.log(chalk.gray(`   ⏳ Running quality assessment...`));
    await this.sleep(1200);
    
    // For demo, auto-approve if configured
    const decision = this.config.autoApprove !== false ? 'approve' : 'approve';
    
    if (decision === 'approve') {
      console.log(chalk.green(`✅ Quality check passed!`));
      return 'approve';
    } else {
      console.log(chalk.yellow(`⚠️  Quality issues detected`));
      return 'reject';
    }
  }

  /**
   * Approve a bounty submission
   */
  async approveBounty(bountyId: number): Promise<void> {
    console.log(chalk.cyan(`\n✅ Approving Bounty #${bountyId}...`));
    
    try {
      await this.client.approveBounty(bountyId);
      
      const bounty = this.activeBounties.get(bountyId);
      console.log(chalk.green(`✅ Bounty approved!`));
      console.log(chalk.gray(`   Payment released: ${bounty?.rewardAmount} USDC`));
      console.log(chalk.gray(`   Hunter reputation: +5`));
      
      this.activeBounties.delete(bountyId);
    } catch (error: any) {
      console.log(chalk.red(`❌ Approval failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Reject a bounty submission
   */
  async rejectBounty(bountyId: number, reason: string): Promise<void> {
    console.log(chalk.yellow(`\n⚠️  Rejecting Bounty #${bountyId}...`));
    console.log(chalk.gray(`   Reason: ${reason}`));
    
    try {
      await this.client.rejectBounty(bountyId, reason);
      console.log(chalk.yellow(`⚠️  Bounty rejected, returned to open status`));
    } catch (error: any) {
      console.log(chalk.red(`❌ Rejection failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Check balance
   */
  async checkBalance(): Promise<string> {
    return await this.client.getUSDCBalance();
  }

  /**
   * Get agent stats
   */
  getStats() {
    return {
      name: this.config.name,
      agentId: this.client.agentId,
      activeBounties: this.activeBounties.size,
      address: this.client.address
    };
  }

  /**
   * Helper: Sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
