import { ethers } from 'ethers';
import chalk from 'chalk';
import { MockServer, createMockServer } from './mock-server';
import { createHash } from 'crypto';

interface AgentPersona {
  name: string;
  role: 'researcher' | 'developer';
  skills: string[];
  wallet: ethers.HDNodeWallet;
  agentId?: number;
}

// Console output helpers
function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(chalk.gray(`[${timestamp}]`) + ' ' + message);
}

function stepHeader(step: number, total: number, title: string): void {
  console.log('\n' + chalk.magenta.bold(`${'='.repeat(60)}`));
  console.log(chalk.magenta.bold(`STEP ${step}/${total}: ${title}`));
  console.log(chalk.magenta.bold(`${'='.repeat(60)}`));
}

function success(message: string): void {
  console.log(chalk.green('✓ ') + message);
}

function info(message: string): void {
  console.log(chalk.cyan('ℹ ') + message);
}

function highlight(label: string, value: string): void {
  console.log(chalk.yellow(label + ': ') + chalk.white(value));
}

class DemoScenario {
  private server: MockServer;
  private alice: AgentPersona;
  private bob: AgentPersona;
  private bountyId?: number;
  private submissionCid?: string;

  constructor() {
    this.server = createMockServer();

    // Create Alice the Researcher
    this.alice = {
      name: 'Alice',
      role: 'researcher',
      skills: ['market research', 'data analysis', 'DeFi protocols'],
      wallet: ethers.Wallet.createRandom(),
    };

    // Create Bob the Developer
    this.bob = {
      name: 'Bob',
      role: 'developer',
      skills: ['blockchain research', 'protocol analysis', 'technical writing'],
      wallet: ethers.Wallet.createRandom(),
    };

    log(chalk.cyan('MockServer initialized'));
    log(`Alice's wallet: ${this.alice.wallet.address}`);
    log(`Bob's wallet: ${this.bob.wallet.address}`);
  }

  async run(): Promise<void> {
    await this.step1_registerAgents();
    await this.step2_createBounty();
    await this.step3_claimBounty();
    await this.step4_submitWork();
    await this.step5_approveWork();
    await this.step6_settlement();
    await this.step7_finalResults();
  }

  private async step1_registerAgents(): Promise<void> {
    stepHeader(1, 7, 'Register AI Agents');

    // Fund wallets with USDC
    await this.server.fundWallet(this.alice.wallet.address, '100');
    await this.server.fundWallet(this.bob.wallet.address, '100');

    // Register Alice
    this.alice.agentId = await this.server.agentRegistry.register(
      'ipfs://alice-researcher-profile',
      this.alice.wallet.address
    );
    success(`📝 Registered ${this.alice.name} the Researcher`);
    highlight('  Agent ID', String(this.alice.agentId));
    highlight('  Address', this.alice.wallet.address);
    highlight('  Skills', this.alice.skills.join(', '));

    // Register Bob
    this.bob.agentId = await this.server.agentRegistry.register(
      'ipfs://bob-developer-profile',
      this.bob.wallet.address
    );
    success(`📝 Registered ${this.bob.name} the Developer`);
    highlight('  Agent ID', String(this.bob.agentId));
    highlight('  Address', this.bob.wallet.address);
    highlight('  Skills', this.bob.skills.join(', '));
  }

  private async step2_createBounty(): Promise<void> {
    stepHeader(2, 7, 'Alice Creates Bounty');

    const reward = ethers.parseUnits('5', 6); // 5 USDC
    const deadline = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now in milliseconds

    // Approve escrow to spend Alice's USDC
    await this.server.erc20.approve(
      this.alice.wallet.address,
      this.server.getAddresses().escrow,
      reward
    );

    this.bountyId = await this.server.bountyRegistry.createBounty({
      creatorAgentId: this.alice.agentId!,
      title: 'Research Monad DeFi protocols',
      descriptionURI: 'ipfs://QmBountyDescription123',
      rewardToken: this.server.getAddresses().USDC,
      rewardAmount: reward,
      deadline,
      caller: this.alice.wallet.address
    });

    success(`💰 Bounty created by ${this.alice.name}`);
    highlight('  Bounty ID', String(this.bountyId));
    highlight('  Title', 'Research Monad DeFi protocols');
    highlight('  Reward', '5 USDC');
    highlight('  Deadline', new Date(deadline).toLocaleDateString());
    info('  Funds escrowed in BountyEscrow contract');
  }

  private async step3_claimBounty(): Promise<void> {
    stepHeader(3, 7, 'Bob Discovers and Claims Bounty');

    // Bob discovers active bounties
    const activeBounties = await this.server.bountyRegistry.getActiveBounties();
    info(`🎯 ${this.bob.name} found ${activeBounties.length} active bounty(ies)`);

    const bounty = activeBounties.find((b) => b.id === this.bountyId);
    if (bounty) {
      highlight('  Found', bounty.title);
      highlight('  Reward', ethers.formatUnits(bounty.rewardAmount, 6) + ' USDC');
    }

    // Bob claims the bounty
    await this.server.bountyRegistry.claimBounty(
      this.bountyId!,
      this.bob.agentId!,
      this.bob.wallet.address
    );

    success(`🎯 ${this.bob.name} claimed the bounty`);
    highlight('  Bounty ID', String(this.bountyId));
    highlight('  Hunter', this.bob.wallet.address);
    info('  Status updated to CLAIMED');
  }

  private async step4_submitWork(): Promise<void> {
    stepHeader(4, 7, 'Bob Submits Work');

    // Create mock research deliverable
    const deliverable = {
      title: 'Monad DeFi Protocol Analysis',
      protocols: [
        { name: 'MonadSwap', tvl: '$50M', risk: 'Medium' },
        { name: 'MonadLend', tvl: '$35M', risk: 'Low' },
        { name: 'MonadStake', tvl: '$28M', risk: 'Low' },
        { name: 'MonadYield', tvl: '$22M', risk: 'Medium' },
        { name: 'MonadBridge', tvl: '$18M', risk: 'High' },
      ],
      summary: 'Comprehensive analysis of Monad DeFi ecosystem with risk assessments',
      completedBy: this.bob.name,
      completedAt: new Date().toISOString(),
    };

    // Generate fake IPFS CID
    const hash = createHash('sha256')
      .update(JSON.stringify(deliverable))
      .digest('hex')
      .slice(0, 12);
    this.submissionCid = `ipfs://QmResearchReport${hash}`;

    info(`📦 ${this.bob.name} completed the research`);
    highlight('  Protocols analyzed', '5');
    highlight('  Total TVL', '$153M');

    // Submit work
    await this.server.bountyRegistry.submitWork(
      this.bountyId!,
      this.submissionCid,
      this.bob.wallet.address
    );

    success('📦 Work submitted');
    highlight('  Deliverable CID', this.submissionCid);
    info('  Status updated to SUBMITTED');
  }

  private async step5_approveWork(): Promise<void> {
    stepHeader(5, 7, 'Alice Reviews and Approves');

    info(`⭐ ${this.alice.name} reviews the submission`);
    highlight('  Deliverable', this.submissionCid || '');
    info('  Quality assessment: Excellent');

    // Alice approves the work
    await this.server.bountyRegistry.approveBounty(
      this.bountyId!,
      5,
      'ipfs://QmFeedbackExcellent123',
      this.alice.wallet.address
    );

    success('⭐ Work approved');
    highlight('  Rating', '5/5 stars');
    highlight('  Feedback', 'Excellent research! Very thorough analysis of the DeFi protocols.');
    info('  Status updated to COMPLETED');
  }

  private async step6_settlement(): Promise<void> {
    stepHeader(6, 7, 'Payment Settlement');

    info('💸 Escrow automatically releases payment on approval');

    // Get final balances
    const aliceBalance = await this.server.erc20.balanceOf(this.alice.wallet.address);
    const bobBalance = await this.server.erc20.balanceOf(this.bob.wallet.address);

    success('💸 Payment released to hunter');
    highlight('  Amount', '5 USDC');
    highlight('  Recipient', this.bob.wallet.address);

    console.log('\n' + chalk.cyan('Final Balances:'));
    highlight(`  ${this.alice.name} (Creator)`, ethers.formatUnits(aliceBalance, 6) + ' USDC');
    highlight(`  ${this.bob.name} (Hunter)`, ethers.formatUnits(bobBalance, 6) + ' USDC');
  }

  private async step7_finalResults(): Promise<void> {
    stepHeader(7, 7, 'Final Results');

    // Get Alice's reputation (Alice is creator, so reputation might be minimal)
    const aliceRep = await this.server.reputation.getReputation(this.alice.agentId!);
    console.log('\n' + chalk.yellow.bold(`${this.alice.name}'s Creator Stats:`));
    highlight('  Bounties Created', '1');
    highlight('  Total Spent', '5 USDC');
    highlight('  Reputation Score', String(aliceRep?.score || 100));

    // Get Bob's reputation
    const bobRep = await this.server.reputation.getReputation(this.bob.agentId!);
    console.log('\n' + chalk.yellow.bold(`${this.bob.name}'s Hunter Stats:`));
    highlight('  Bounties Completed', String(bobRep?.completedBounties || 1));
    highlight('  Total Earned', ethers.formatUnits(bobRep?.totalEarnings || BigInt(0), 6) + ' USDC');
    highlight('  Average Rating', '5.0/5.0');
    highlight('  Reputation Score', String(bobRep?.score || 150));

    // Success banner
    console.log('\n' + chalk.green.bold('┌' + '─'.repeat(58) + '┐'));
    console.log(chalk.green.bold('│') + chalk.green.bold('  🎉 DEMO COMPLETED SUCCESSFULLY!'.padEnd(57)) + chalk.green.bold('│'));
    console.log(chalk.green.bold('│' + ' '.repeat(58) + '│'));
    console.log(chalk.green.bold('│') + '  Full agent-to-agent bounty lifecycle demonstrated:'.padEnd(58) + chalk.green.bold('│'));
    console.log(chalk.green.bold('│') + '    ✓ Agent registration'.padEnd(58) + chalk.green.bold('│'));
    console.log(chalk.green.bold('│') + '    ✓ Bounty creation with escrow'.padEnd(58) + chalk.green.bold('│'));
    console.log(chalk.green.bold('│') + '    ✓ Discovery and claiming'.padEnd(58) + chalk.green.bold('│'));
    console.log(chalk.green.bold('│') + '    ✓ Work submission'.padEnd(58) + chalk.green.bold('│'));
    console.log(chalk.green.bold('│') + '    ✓ Review and approval'.padEnd(58) + chalk.green.bold('│'));
    console.log(chalk.green.bold('│') + '    ✓ Automatic payment settlement'.padEnd(58) + chalk.green.bold('│'));
    console.log(chalk.green.bold('│') + '    ✓ Reputation tracking'.padEnd(58) + chalk.green.bold('│'));
    console.log(chalk.green.bold('└' + '─'.repeat(58) + '┘'));
    console.log();
  }
}

async function main() {
  console.log(chalk.bold.cyan('\n🚀 AGENT BOUNTY HUNTER - DEMO SCENARIO\n'));
  console.log(chalk.gray('Demonstrating full agent-to-agent bounty flow\n'));

  const demo = new DemoScenario();
  await demo.run();
}

main().catch(console.error);
