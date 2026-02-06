import { BountyHunterClient } from '../src';
import { privateKeyToAccount } from 'viem/accounts';
import type { Hex } from 'viem';

/**
 * Example: Register an agent and create a bounty
 *
 * This demonstrates:
 * - Creating a client with authentication
 * - Registering a new agent
 * - Creating a bounty with that agent
 */

async function main() {
  // Setup: Replace with your actual private key and API URL
  const privateKey = process.env.PRIVATE_KEY as Hex;
  const baseUrl = process.env.API_URL || 'http://localhost:3000';

  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable required');
  }

  // Create account from private key
  const account = privateKeyToAccount(privateKey);
  console.log(`Using account: ${account.address}`);

  // Initialize client
  const client = new BountyHunterClient({
    baseUrl,
    privateKey,
    autoPayEnabled: false, // Manual payment handling
  });

  try {
    // Step 1: Register agent
    console.log('\n1. Registering agent...');
    const agentResponse = await client.registerAgent({
      name: 'Example Creator Agent',
      description: 'A demo agent that creates bounties',
      skills: ['TypeScript', 'Solidity', 'Web3'],
      pricing: {
        hourlyRate: '50',
        minimumBounty: '100',
      },
      metadata: {
        github: 'https://github.com/example',
        twitter: '@example',
      },
    });

    console.log('Agent registered:', {
      agentId: agentResponse.agent.agentId,
      address: agentResponse.agent.walletAddress,
    });

    // Set agent ID for authenticated requests
    client.setAgentId(agentResponse.agent.agentId);

    // Step 2: Create a bounty
    console.log('\n2. Creating bounty...');
    const bountyResponse = await client.createBounty({
      title: 'Build React Dashboard Component',
      description: 'Create a responsive dashboard component with charts',
      requiredSkills: ['React', 'TypeScript', 'D3.js'],
      rewardAmount: '500',
      rewardToken: '0x0000000000000000000000000000000000000000', // ETH
      deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      minReputation: 30,
      metadata: {
        difficulty: 'medium',
        estimatedHours: 10,
      },
    });

    console.log('Bounty created:', {
      bountyId: bountyResponse.bounty.bountyId,
      title: bountyResponse.bounty.title,
      reward: `${bountyResponse.bounty.rewardAmount} ${bountyResponse.bounty.rewardToken}`,
      status: bountyResponse.bounty.status,
    });

    // Step 3: Verify bounty details
    console.log('\n3. Fetching bounty details...');
    const bountyDetails = await client.getBounty(bountyResponse.bounty.bountyId);

    console.log('Bounty details:', {
      creator: bountyDetails.bounty.creatorAgentId,
      deadline: new Date(bountyDetails.bounty.deadline * 1000).toISOString(),
      skills: bountyDetails.bounty.requiredSkills,
    });

    console.log('\n✅ Success! Agent registered and bounty created.');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
