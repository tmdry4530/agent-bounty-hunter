/**
 * HunterAgent - Finds bounties, executes tasks, submits work
 * 
 * Simulates an autonomous agent that:
 * - Discovers relevant bounties
 * - Claims and executes tasks
 * - Submits deliverables
 */

import { BountyHunterClient, type SubmissionData } from '../sdk/BountyHunterClient.js';
import chalk from 'chalk';

export interface HunterConfig {
  name: string;
  description: string;
  skills: string[];
  specialization?: string;
}

export class HunterAgent {
  private client: BountyHunterClient;
  private config: HunterConfig;
  private activeTasks: Map<number, { claimedAt: number; progress: number }> = new Map();

  constructor(client: BountyHunterClient, config: HunterConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Initialize the agent (register on platform)
   */
  async initialize(): Promise<void> {
    console.log(chalk.cyan(`\n🤖 Initializing ${this.config.name}...`));
    
    const agentId = await this.client.registerAgent({
      name: this.config.name,
      description: this.config.description,
      skills: this.config.skills,
      pricing: {
        hourlyRate: '50',
        minBounty: '1'
      }
    });
    
    console.log(chalk.green(`✅ Registered as Agent #${agentId}`));
    console.log(chalk.gray(`   Skills: ${this.config.skills.join(', ')}`));
    console.log(chalk.gray(`   Address: ${this.client.address}`));
  }

  /**
   * Discover available bounties
   */
  async discoverBounties(targetBountyId?: number): Promise<number[]> {
    console.log(chalk.cyan(`\n🔍 Scanning for bounties...`));
    console.log(chalk.gray(`   Matching skills: ${this.config.skills.join(', ')}`));
    
    // Simulate discovery process
    await this.sleep(1000);
    
    if (targetBountyId) {
      // For demo, we know which bounty to find
      const bounty = await this.client.getBounty(targetBountyId);
      console.log(chalk.green(`✅ Found 1 matching bounty`));
      console.log(chalk.gray(`   Bounty #${targetBountyId} - Status: ${bounty.status}`));
      return [targetBountyId];
    }
    
    return [];
  }

  /**
   * Evaluate if a bounty is worth claiming
   */
  async evaluateBounty(bountyId: number): Promise<boolean> {
    console.log(chalk.cyan(`\n🤔 Evaluating Bounty #${bountyId}...`));
    
    try {
      const bounty = await this.client.getBounty(bountyId);
      
      // Parse reward amount
      const rewardAmount = Number(bounty.rewardAmount) / 1e6; // Convert from 6 decimals
      
      console.log(chalk.gray(`   Reward: ${rewardAmount} USDC`));
      console.log(chalk.gray(`   Deadline: ${new Date(Number(bounty.deadline) * 1000).toLocaleString()}`));
      
      // Simulate evaluation criteria
      await this.sleep(800);
      
      const worthIt = rewardAmount >= 5; // Minimum 5 USDC
      
      if (worthIt) {
        console.log(chalk.green(`✅ Bounty looks good!`));
        return true;
      } else {
        console.log(chalk.yellow(`⚠️  Reward too low, skipping`));
        return false;
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ Evaluation failed: ${error.message}`));
      return false;
    }
  }

  /**
   * Claim a bounty
   */
  async claimBounty(bountyId: number): Promise<void> {
    console.log(chalk.cyan(`\n🎯 Claiming Bounty #${bountyId}...`));
    
    try {
      await this.client.claimBounty(bountyId);
      
      this.activeTasks.set(bountyId, {
        claimedAt: Date.now(),
        progress: 0
      });
      
      console.log(chalk.green(`✅ Bounty claimed successfully!`));
      console.log(chalk.gray(`   Status: In Progress`));
    } catch (error: any) {
      console.log(chalk.red(`❌ Claim failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Execute the task (simulated)
   */
  async executeTask(bountyId: number): Promise<SubmissionData> {
    console.log(chalk.cyan(`\n⚙️  Executing task for Bounty #${bountyId}...`));
    
    const task = this.activeTasks.get(bountyId);
    if (!task) {
      throw new Error(`Task #${bountyId} not found in active tasks`);
    }
    
    const bounty = await this.client.getBounty(bountyId);
    
    // Simulate work execution based on specialization
    if (this.config.specialization === 'security') {
      return await this.executeSecurityAudit(bountyId);
    } else if (this.config.specialization === 'development') {
      return await this.executeDevelopmentTask(bountyId);
    } else {
      return await this.executeGenericTask(bountyId);
    }
  }

  /**
   * Execute security audit (simulated)
   */
  private async executeSecurityAudit(bountyId: number): Promise<SubmissionData> {
    const steps = [
      'Analyzing contract structure...',
      'Checking for reentrancy vulnerabilities...',
      'Reviewing access controls...',
      'Testing edge cases...',
      'Documenting findings...',
      'Generating report...'
    ];
    
    const startTime = Date.now();
    
    for (let i = 0; i < steps.length; i++) {
      console.log(chalk.gray(`   [${i + 1}/${steps.length}] ${steps[i]}`));
      await this.sleep(800 + Math.random() * 400);
      
      const progress = ((i + 1) / steps.length) * 100;
      this.updateProgress(bountyId, progress);
    }
    
    const executionTime = Math.floor((Date.now() - startTime) / 1000);
    
    console.log(chalk.green(`✅ Audit completed in ${executionTime}s`));
    
    // Generate mock deliverables
    return {
      deliverables: [
        {
          filename: 'audit-report.md',
          content: this.generateAuditReport(),
          contentType: 'text/markdown'
        },
        {
          filename: 'findings.json',
          content: JSON.stringify(this.generateFindings(), null, 2),
          contentType: 'application/json'
        }
      ],
      notes: 'Comprehensive security audit completed. Found 2 medium-severity issues and 3 informational notices. All critical paths secured.',
      executionTime
    };
  }

  /**
   * Execute development task (simulated)
   */
  private async executeDevelopmentTask(bountyId: number): Promise<SubmissionData> {
    const steps = [
      'Setting up development environment...',
      'Implementing core functionality...',
      'Writing unit tests...',
      'Running test suite...',
      'Code review and optimization...',
      'Preparing documentation...'
    ];
    
    const startTime = Date.now();
    
    for (let i = 0; i < steps.length; i++) {
      console.log(chalk.gray(`   [${i + 1}/${steps.length}] ${steps[i]}`));
      await this.sleep(700 + Math.random() * 500);
      
      const progress = ((i + 1) / steps.length) * 100;
      this.updateProgress(bountyId, progress);
    }
    
    const executionTime = Math.floor((Date.now() - startTime) / 1000);
    
    console.log(chalk.green(`✅ Development completed in ${executionTime}s`));
    
    return {
      deliverables: [
        {
          filename: 'implementation.sol',
          content: '// Smart contract implementation\n// ... code ...',
          contentType: 'text/plain'
        },
        {
          filename: 'tests.ts',
          content: '// Comprehensive test suite\n// ... tests ...',
          contentType: 'text/typescript'
        },
        {
          filename: 'README.md',
          content: '# Implementation Documentation\n\n## Overview\n...',
          contentType: 'text/markdown'
        }
      ],
      notes: 'Implementation complete with 95% test coverage. All requirements met.',
      executionTime
    };
  }

  /**
   * Execute generic task (simulated)
   */
  private async executeGenericTask(bountyId: number): Promise<SubmissionData> {
    const steps = [
      'Analyzing requirements...',
      'Processing task...',
      'Generating deliverables...',
      'Quality check...'
    ];
    
    const startTime = Date.now();
    
    for (let i = 0; i < steps.length; i++) {
      console.log(chalk.gray(`   [${i + 1}/${steps.length}] ${steps[i]}`));
      await this.sleep(1000);
      
      const progress = ((i + 1) / steps.length) * 100;
      this.updateProgress(bountyId, progress);
    }
    
    const executionTime = Math.floor((Date.now() - startTime) / 1000);
    
    console.log(chalk.green(`✅ Task completed in ${executionTime}s`));
    
    return {
      deliverables: [
        {
          filename: 'result.txt',
          content: 'Task completion results...',
          contentType: 'text/plain'
        }
      ],
      notes: 'Task completed successfully.',
      executionTime
    };
  }

  /**
   * Submit completed work
   */
  async submitWork(bountyId: number, submission: SubmissionData): Promise<void> {
    console.log(chalk.cyan(`\n📤 Submitting work for Bounty #${bountyId}...`));
    console.log(chalk.gray(`   Deliverables: ${submission.deliverables.length} file(s)`));
    console.log(chalk.gray(`   Execution time: ${submission.executionTime}s`));
    
    try {
      await this.client.submitWork(bountyId, submission);
      
      console.log(chalk.green(`✅ Work submitted successfully!`));
      console.log(chalk.gray(`   Status: Pending Review`));
      
      this.activeTasks.delete(bountyId);
    } catch (error: any) {
      console.log(chalk.red(`❌ Submission failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Update task progress
   */
  private updateProgress(bountyId: number, progress: number): void {
    const task = this.activeTasks.get(bountyId);
    if (task) {
      task.progress = progress;
      this.activeTasks.set(bountyId, task);
    }
  }

  /**
   * Generate mock audit report
   */
  private generateAuditReport(): string {
    return `# Security Audit Report

## Executive Summary
Comprehensive security audit conducted on the target smart contract.

## Findings

### Medium Severity
1. **Unchecked External Call** - Line 42
   - Impact: Potential reentrancy
   - Recommendation: Add reentrancy guard

2. **Missing Input Validation** - Line 67
   - Impact: Invalid state possible
   - Recommendation: Add require statements

### Informational
- Code style improvements recommended
- Gas optimization opportunities identified
- Documentation could be enhanced

## Conclusion
Contract is generally secure with recommended fixes applied.
`;
  }

  /**
   * Generate mock findings JSON
   */
  private generateFindings(): any {
    return {
      summary: {
        critical: 0,
        high: 0,
        medium: 2,
        low: 0,
        informational: 3
      },
      findings: [
        {
          severity: 'medium',
          title: 'Unchecked External Call',
          line: 42,
          description: 'External call without proper checks',
          recommendation: 'Add reentrancy guard'
        },
        {
          severity: 'medium',
          title: 'Missing Input Validation',
          line: 67,
          description: 'User input not validated',
          recommendation: 'Add require statements'
        }
      ]
    };
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
      activeTasks: this.activeTasks.size,
      specialization: this.config.specialization,
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
