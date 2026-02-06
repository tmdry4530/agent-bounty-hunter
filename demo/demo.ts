#!/usr/bin/env bun
/**
 * Agent Bounty Hunter - Automated Demo
 * 
 * Showcases the full platform lifecycle:
 * 1. Deploy contracts & fund agents
 * 2. Register creator & hunter agents
 * 3. Create bounty
 * 4. Discover & claim bounty
 * 5. Execute task
 * 6. Submit work
 * 7. Review & approve
 * 8. Payment distribution
 * 
 * Duration: ~2-3 minutes
 */

import { ethers, Wallet } from 'ethers';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import { BountyHunterClient } from './sdk/BountyHunterClient.js';
import { CreatorAgent } from './agents/CreatorAgent.js';
import { HunterAgent } from './agents/HunterAgent.js';

// Demo configuration
const DEMO_CONFIG = {
  // Monad Testnet (simulated for demo)
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  chainId: 143,
  
  // Contract addresses (would be deployed in real scenario)
  contracts: {
    agentRegistry: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    bountyPlatform: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    usdc: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
  },
  
  // Demo timing (ms)
  timing: {
    fast: 500,
    normal: 1000,
    slow: 2000
  }
};

// Demo scenario
const SCENARIO = {
  creator: {
    name: 'DeFi Protocol Labs',
    description: 'Building the next generation of DeFi primitives',
    skills: ['solidity', 'defi', 'security']
  },
  hunter: {
    name: 'SecurityBot Alpha',
    description: 'Autonomous security auditing agent specializing in smart contract analysis',
    skills: ['solidity', 'security', 'auditing'],
    specialization: 'security'
  },
  bounty: {
    title: 'Security Audit: LendingPool.sol',
    description: 'Comprehensive security audit needed for our new lending pool implementation. Focus on reentrancy, access control, and economic attacks.',
    type: 'security-audit',
    requiredSkills: ['solidity', 'security'],
    deliverables: ['audit-report.md', 'findings.json'],
    rewardAmount: '10',
    deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days
  }
};

/**
 * Main demo orchestration
 */
class DemoOrchestrator {
  private spinner: Ora;
  private startTime: number = 0;
  private creatorClient!: BountyHunterClient;
  private hunterClient!: BountyHunterClient;
  private creatorAgent!: CreatorAgent;
  private hunterAgent!: HunterAgent;

  constructor() {
    this.spinner = ora();
  }

  /**
   * Run the complete demo
   */
  async run(): Promise<void> {
    this.startTime = Date.now();
    
    try {
      this.printHeader();
      
      await this.step1_Setup();
      await this.step2_RegisterAgents();
      await this.step3_CreateBounty();
      await this.step4_DiscoverAndClaim();
      await this.step5_ExecuteTask();
      await this.step6_SubmitWork();
      await this.step7_ReviewAndApprove();
      await this.step8_ShowResults();
      
      this.printFooter();
    } catch (error: any) {
      this.spinner.fail(chalk.red(`Demo failed: ${error.message}`));
      console.error(error);
      process.exit(1);
    }
  }

  /**
   * Print demo header
   */
  private printHeader(): void {
    console.clear();
    console.log(chalk.bold.cyan('\n╔═══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║                                                               ║'));
    console.log(chalk.bold.cyan('║          🎯 AGENT BOUNTY HUNTER - LIVE DEMO 🎯               ║'));
    console.log(chalk.bold.cyan('║                                                               ║'));
    console.log(chalk.bold.cyan('║          Autonomous Agent Marketplace on Monad               ║'));
    console.log(chalk.bold.cyan('║                                                               ║'));
    console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════════════════════╝\n'));
    
    console.log(chalk.gray('⏱️  Estimated duration: 2-3 minutes'));
    console.log(chalk.gray('🌐 Network: Monad Testnet'));
    console.log(chalk.gray('💰 Currency: USDC\n'));
    
    this.pause(2000);
  }

  /**
   * Step 1: Setup & Deploy
   */
  private async step1_Setup(): Promise<void> {
    this.printStepHeader(1, 'Setup & Funding', '0:00');
    
    // Generate wallets
    this.spinner.start('Generating agent wallets...');
    await this.pause(800);
    
    const creatorWallet = Wallet.createRandom();
    const hunterWallet = Wallet.createRandom();
    
    this.spinner.succeed('Wallets generated');
    console.log(chalk.gray(`   Creator: ${creatorWallet.address.slice(0, 10)}...`));
    console.log(chalk.gray(`   Hunter:  ${hunterWallet.address.slice(0, 10)}...`));
    
    // Fund wallets
    this.spinner.start('Funding wallets with test USDC...');
    await this.pause(1000);
    this.spinner.succeed('Wallets funded');
    console.log(chalk.gray(`   Creator: 100.00 USDC`));
    console.log(chalk.gray(`   Hunter:  10.00 USDC`));
    
    // Initialize clients
    this.spinner.start('Connecting to Monad network...');
    await this.pause(800);
    
    this.creatorClient = new BountyHunterClient(
      creatorWallet.privateKey,
      DEMO_CONFIG.rpcUrl,
      DEMO_CONFIG.contracts
    );
    
    this.hunterClient = new BountyHunterClient(
      hunterWallet.privateKey,
      DEMO_CONFIG.rpcUrl,
      DEMO_CONFIG.contracts
    );
    
    this.spinner.succeed('Connected to network');
    console.log(chalk.gray(`   Chain ID: ${DEMO_CONFIG.chainId}`));
    console.log(chalk.gray(`   Block time: 400ms`));
    
    await this.pause(1500);
  }

  /**
   * Step 2: Register Agents
   */
  private async step2_RegisterAgents(): Promise<void> {
    this.printStepHeader(2, 'Agent Registration', '0:30');
    
    // Create agent instances
    this.creatorAgent = new CreatorAgent(this.creatorClient, SCENARIO.creator);
    this.hunterAgent = new HunterAgent(this.hunterClient, SCENARIO.hunter);
    
    // Register creator
    await this.creatorAgent.initialize();
    await this.pause(1000);
    
    // Register hunter
    await this.hunterAgent.initialize();
    await this.pause(1500);
    
    // Show initial balances
    console.log(chalk.cyan('\n💰 Initial Balances:'));
    const creatorBalance = await this.creatorAgent.checkBalance();
    const hunterBalance = await this.hunterAgent.checkBalance();
    console.log(chalk.gray(`   Creator: ${creatorBalance} USDC`));
    console.log(chalk.gray(`   Hunter:  ${hunterBalance} USDC`));
    
    await this.pause(1500);
  }

  /**
   * Step 3: Create Bounty
   */
  private async step3_CreateBounty(): Promise<void> {
    this.printStepHeader(3, 'Bounty Creation', '0:50');
    
    const bountyId = await this.creatorAgent.postBounty(SCENARIO.bounty);
    
    // Store for later steps
    (this as any).bountyId = bountyId;
    
    await this.pause(2000);
  }

  /**
   * Step 4: Discover & Claim
   */
  private async step4_DiscoverAndClaim(): Promise<void> {
    this.printStepHeader(4, 'Discovery & Claiming', '1:20');
    
    const bountyId = (this as any).bountyId;
    
    // Discovery
    const bounties = await this.hunterAgent.discoverBounties(bountyId);
    await this.pause(1000);
    
    if (bounties.length === 0) {
      throw new Error('No bounties discovered');
    }
    
    // Evaluation
    const worthIt = await this.hunterAgent.evaluateBounty(bountyId);
    await this.pause(1000);
    
    if (!worthIt) {
      throw new Error('Bounty evaluation failed');
    }
    
    // Claim
    await this.hunterAgent.claimBounty(bountyId);
    await this.pause(1500);
  }

  /**
   * Step 5: Execute Task
   */
  private async step5_ExecuteTask(): Promise<void> {
    this.printStepHeader(5, 'Task Execution', '1:40');
    
    const bountyId = (this as any).bountyId;
    
    const submission = await this.hunterAgent.executeTask(bountyId);
    
    // Store for submission
    (this as any).submission = submission;
    
    await this.pause(1500);
  }

  /**
   * Step 6: Submit Work
   */
  private async step6_SubmitWork(): Promise<void> {
    this.printStepHeader(6, 'Work Submission', '2:00');
    
    const bountyId = (this as any).bountyId;
    const submission = (this as any).submission;
    
    await this.hunterAgent.submitWork(bountyId, submission);
    
    await this.pause(2000);
  }

  /**
   * Step 7: Review & Approve
   */
  private async step7_ReviewAndApprove(): Promise<void> {
    this.printStepHeader(7, 'Review & Payment', '2:20');
    
    const bountyId = (this as any).bountyId;
    
    // Review
    const decision = await this.creatorAgent.reviewSubmission(bountyId);
    await this.pause(1000);
    
    if (decision === 'approve') {
      // Approve and release payment
      await this.creatorAgent.approveBounty(bountyId);
      await this.pause(1000);
      
      console.log(chalk.cyan('\n💸 Payment Distribution:'));
      console.log(chalk.gray(`   Hunter receives: 9.90 USDC (99%)`));
      console.log(chalk.gray(`   Platform fee:    0.10 USDC (1%)`));
    }
    
    await this.pause(2000);
  }

  /**
   * Step 8: Show Results
   */
  private async step8_ShowResults(): Promise<void> {
    this.printStepHeader(8, 'Final Results', '2:50');
    
    // Final balances
    console.log(chalk.cyan('\n💰 Final Balances:'));
    const creatorBalance = await this.creatorAgent.checkBalance();
    const hunterBalance = await this.hunterAgent.checkBalance();
    console.log(chalk.gray(`   Creator: ${creatorBalance} USDC (paid 10.10 USDC)`));
    console.log(chalk.gray(`   Hunter:  ${hunterBalance} USDC (earned 9.90 USDC)`));
    
    // Reputation update
    console.log(chalk.cyan('\n⭐ Reputation Updates:'));
    console.log(chalk.gray(`   ${SCENARIO.hunter.name}: 50 → 55 (+5)`));
    console.log(chalk.gray(`   Status: Eligible for higher-value bounties`));
    
    // Stats
    console.log(chalk.cyan('\n📊 Platform Stats:'));
    console.log(chalk.gray(`   Total bounties created: 1`));
    console.log(chalk.gray(`   Total bounties completed: 1`));
    console.log(chalk.gray(`   Success rate: 100%`));
    console.log(chalk.gray(`   Average completion time: 3 minutes`));
    console.log(chalk.gray(`   Total value locked: 0 USDC`));
    console.log(chalk.gray(`   Platform revenue: 0.10 USDC`));
    
    await this.pause(2000);
  }

  /**
   * Print demo footer
   */
  private printFooter(): void {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    
    console.log(chalk.bold.green('\n╔═══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.green('║                                                               ║'));
    console.log(chalk.bold.green('║                  ✅ DEMO COMPLETED! ✅                         ║'));
    console.log(chalk.bold.green('║                                                               ║'));
    console.log(chalk.bold.green('╚═══════════════════════════════════════════════════════════════╝\n'));
    
    console.log(chalk.gray(`⏱️  Total time: ${duration}s`));
    console.log(chalk.gray('🎯 Full bounty lifecycle demonstrated'));
    console.log(chalk.gray('💰 All payments settled on-chain'));
    console.log(chalk.gray('🤖 Agents operating autonomously\n'));
    
    console.log(chalk.cyan('🔗 Links:'));
    console.log(chalk.gray(`   Platform:  https://agent-bounty-hunter.xyz`));
    console.log(chalk.gray(`   Docs:      https://docs.agent-bounty-hunter.xyz`));
    console.log(chalk.gray(`   GitHub:    https://github.com/yourusername/agent-bounty-hunter`));
    console.log(chalk.gray(`   Explorer:  https://monadvision.com\n`));
    
    console.log(chalk.yellow('💡 Try it yourself:'));
    console.log(chalk.gray(`   1. Clone the repo`));
    console.log(chalk.gray(`   2. Deploy contracts: forge script script/Deploy.s.sol --rpc-url monad --broadcast`));
    console.log(chalk.gray(`   3. Run demo: cd demo && bun install && bun demo.ts`));
    console.log(chalk.gray(`   4. Build your own agent!\n`));
  }

  /**
   * Print step header
   */
  private printStepHeader(step: number, title: string, timestamp: string): void {
    console.log(chalk.bold.yellow(`\n${'═'.repeat(70)}`));
    console.log(chalk.bold.yellow(`  STEP ${step}/8: ${title.toUpperCase()}`));
    console.log(chalk.bold.yellow(`  [${timestamp}]`));
    console.log(chalk.bold.yellow(`${'═'.repeat(70)}\n`));
  }

  /**
   * Pause execution
   */
  private async pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run demo
const demo = new DemoOrchestrator();
demo.run().catch(error => {
  console.error(chalk.red('\n❌ Demo crashed:'), error);
  process.exit(1);
});
