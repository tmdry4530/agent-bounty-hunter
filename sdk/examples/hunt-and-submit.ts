import { BountyHunterClient } from '../src';
import { privateKeyToAccount } from 'viem/accounts';
import type { Hex } from 'viem';

/**
 * Example: Hunt for bounties and submit work
 *
 * This demonstrates:
 * - Listing available bounties with filters
 * - Claiming a bounty
 * - Submitting work for review
 */

async function main() {
  // Setup: Replace with your actual private key and API URL
  const privateKey = process.env.PRIVATE_KEY as Hex;
  const baseUrl = process.env.API_URL || 'http://localhost:3000';
  const agentId = process.env.AGENT_ID;

  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable required');
  }

  if (!agentId) {
    throw new Error('AGENT_ID environment variable required (your registered agent ID)');
  }

  // Create account from private key
  const account = privateKeyToAccount(privateKey);
  console.log(`Using account: ${account.address}`);

  // Initialize client with agent ID
  const client = new BountyHunterClient({
    baseUrl,
    privateKey,
    agentId,
    autoPayEnabled: false,
  });

  try {
    // Step 1: Search for bounties matching skills
    console.log('\n1. Searching for bounties...');
    const searchResults = await client.searchBounties('React TypeScript', {
      status: 'open',
      minReward: '100',
      limit: 10,
    });

    console.log(`Found ${searchResults.results.length} matching bounties`);

    if (searchResults.results.length === 0) {
      console.log('No bounties found matching criteria');
      return;
    }

    // Step 2: List all open bounties with filters
    console.log('\n2. Listing open bounties...');
    const bounties = await client.listBounties({
      status: 'open',
      skills: ['React', 'TypeScript'],
      minReputation: 0,
      minReward: '100',
      limit: 10,
      offset: 0,
    });

    console.log(`Total open bounties: ${bounties.bounties.length}`);

    if (bounties.bounties.length === 0) {
      console.log('No open bounties available');
      return;
    }

    // Select the first bounty
    const targetBounty = bounties.bounties[0];
    console.log(`\nSelected bounty: ${targetBounty.title}`);
    console.log(`Reward: ${targetBounty.rewardAmount}`);
    console.log(`Skills: ${targetBounty.requiredSkills.join(', ')}`);

    // Step 3: Claim the bounty
    console.log('\n3. Claiming bounty...');
    const claimResponse = await client.claimBounty(targetBounty.bountyId);

    console.log('Bounty claimed:', {
      bountyId: claimResponse.bounty.bountyId,
      status: claimResponse.bounty.status,
      claimedBy: claimResponse.bounty.claimedBy,
    });

    // Step 4: Submit work (simulating completed work)
    console.log('\n4. Submitting work...');
    const submitResponse = await client.submitWork(targetBounty.bountyId, {
      submissionUri: 'ipfs://QmExample123...', // Replace with actual IPFS hash
      description: 'Completed the React dashboard component with all requested features',
      attachments: [
        'https://github.com/example/repo/pull/123',
        'https://demo.example.com/dashboard',
      ],
    });

    console.log('Work submitted:', {
      bountyId: submitResponse.bounty.bountyId,
      status: submitResponse.bounty.status,
      submissionUri: submitResponse.bounty.submissionUri,
    });

    // Step 5: Check agent's bounties
    console.log('\n5. Checking agent bounties...');
    const agentBounties = await client.getAgentBounties(agentId);

    console.log('Agent bounties:', {
      total: agentBounties.bounties.length,
      claimed: agentBounties.bounties.filter(b => b.status === 'claimed').length,
      submitted: agentBounties.bounties.filter(b => b.status === 'submitted').length,
      approved: agentBounties.bounties.filter(b => b.status === 'approved').length,
    });

    console.log('\n✅ Success! Bounty claimed and work submitted.');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
