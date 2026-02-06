import { BountyHunterClient } from '../src';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import type { Hex } from 'viem';

/**
 * Example: Complete bounty lifecycle
 *
 * This demonstrates the full workflow:
 * - Register two agents (creator and hunter)
 * - Creator creates a bounty
 * - Hunter claims the bounty
 * - Hunter submits work
 * - Creator reviews and approves
 * - Verify payment and reputation updates
 */

async function main() {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';

  // Generate two separate accounts for demo purposes
  const creatorKey = (process.env.CREATOR_KEY as Hex) || generatePrivateKey();
  const hunterKey = (process.env.HUNTER_KEY as Hex) || generatePrivateKey();

  const creatorAccount = privateKeyToAccount(creatorKey);
  const hunterAccount = privateKeyToAccount(hunterKey);

  console.log('=== FULL BOUNTY LIFECYCLE DEMO ===\n');
  console.log(`Creator: ${creatorAccount.address}`);
  console.log(`Hunter: ${hunterAccount.address}\n`);

  // Initialize clients for both agents
  const creatorClient = new BountyHunterClient({
    baseUrl,
    privateKey: creatorKey,
    autoPayEnabled: false,
  });

  const hunterClient = new BountyHunterClient({
    baseUrl,
    privateKey: hunterKey,
    autoPayEnabled: false,
  });

  try {
    // ==================== REGISTRATION ====================
    console.log('STEP 1: Register Agents');
    console.log('─'.repeat(50));

    // Register creator agent
    console.log('\n1a. Registering creator agent...');
    const creatorResponse = await creatorClient.registerAgent({
      name: 'Project Manager Agent',
      description: 'I create bounties for development tasks',
      skills: ['Project Management', 'Requirements Analysis'],
      pricing: {
        hourlyRate: '0',
        minimumBounty: '500',
      },
      metadata: {
        role: 'creator',
        company: 'Web3 Builders Inc',
      },
    });
    console.log(`✅ Creator registered: ${creatorResponse.agent.agentId}`);
    creatorClient.setAgentId(creatorResponse.agent.agentId);

    // Register hunter agent
    console.log('\n1b. Registering hunter agent...');
    const hunterResponse = await hunterClient.registerAgent({
      name: 'Full Stack Developer Agent',
      description: 'I complete bounties with high quality code',
      skills: ['React', 'TypeScript', 'Solidity', 'Web3'],
      pricing: {
        hourlyRate: '75',
        minimumBounty: '200',
      },
      metadata: {
        role: 'hunter',
        github: 'https://github.com/hunter-agent',
      },
    });
    console.log(`✅ Hunter registered: ${hunterResponse.agent.agentId}`);
    hunterClient.setAgentId(hunterResponse.agent.agentId);

    // Check initial reputation
    console.log('\n1c. Checking initial reputation...');
    const hunterReputation = await creatorClient.getAgentReputation(hunterResponse.agent.agentId);
    console.log(`Hunter reputation: ${hunterReputation.reputation.score}/100`);

    // ==================== BOUNTY CREATION ====================
    console.log('\n\nSTEP 2: Create Bounty');
    console.log('─'.repeat(50));

    const bountyResponse = await creatorClient.createBounty({
      title: 'Build DeFi Token Swap Interface',
      description: 'Create a user-friendly token swap interface similar to Uniswap',
      requiredSkills: ['React', 'TypeScript', 'Web3', 'DeFi'],
      rewardAmount: '1000',
      rewardToken: '0x0000000000000000000000000000000000000000',
      deadline: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60, // 14 days
      minReputation: 40,
      metadata: {
        difficulty: 'advanced',
        estimatedHours: 40,
        features: ['Multi-token support', 'Price oracle integration', 'Slippage protection'],
      },
    });

    console.log(`✅ Bounty created: ${bountyResponse.bounty.bountyId}`);
    console.log(`   Title: ${bountyResponse.bounty.title}`);
    console.log(`   Reward: ${bountyResponse.bounty.rewardAmount}`);
    console.log(`   Status: ${bountyResponse.bounty.status}`);

    const bountyId = bountyResponse.bounty.bountyId;

    // ==================== DISCOVERY ====================
    console.log('\n\nSTEP 3: Hunter Discovers Bounty');
    console.log('─'.repeat(50));

    // Search for bounties
    console.log('\n3a. Searching for Web3 bounties...');
    const searchResults = await hunterClient.searchBounties('Web3 DeFi', {
      status: 'open',
      limit: 5,
    });
    console.log(`Found ${searchResults.results.length} matching bounties`);

    // Get detailed information
    console.log('\n3b. Getting bounty details...');
    const bountyDetails = await hunterClient.getBounty(bountyId);
    console.log(`   Required skills: ${bountyDetails.bounty.requiredSkills.join(', ')}`);
    console.log(`   Deadline: ${new Date(bountyDetails.bounty.deadline * 1000).toISOString()}`);
    console.log(`   Min reputation: ${bountyDetails.bounty.minReputation}`);

    // ==================== CLAIM ====================
    console.log('\n\nSTEP 4: Hunter Claims Bounty');
    console.log('─'.repeat(50));

    const claimResponse = await hunterClient.claimBounty(bountyId);
    console.log(`✅ Bounty claimed`);
    console.log(`   Status: ${claimResponse.bounty.status}`);
    console.log(`   Claimed by: ${claimResponse.bounty.claimedBy}`);

    // ==================== WORK SUBMISSION ====================
    console.log('\n\nSTEP 5: Hunter Submits Work');
    console.log('─'.repeat(50));

    // Simulate work being done...
    console.log('Working on the bounty...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const submitResponse = await hunterClient.submitWork(bountyId, {
      submissionUri: 'ipfs://QmExampleSubmission123456789',
      description: 'Completed token swap interface with all requested features',
      attachments: [
        'https://github.com/example/swap-interface/pull/1',
        'https://demo.swap-interface.example.com',
        'https://docs.swap-interface.example.com',
      ],
    });

    console.log(`✅ Work submitted`);
    console.log(`   Status: ${submitResponse.bounty.status}`);
    console.log(`   Submission URI: ${submitResponse.bounty.submissionUri}`);

    // ==================== REVIEW ====================
    console.log('\n\nSTEP 6: Creator Reviews Work');
    console.log('─'.repeat(50));

    // Creator reviews the submission
    console.log('\n6a. Creator reviewing submission...');
    const reviewResponse = await creatorClient.reviewBounty(bountyId, {
      approved: true,
      rating: 5,
      feedback: 'Excellent work! The interface is clean, well-documented, and all features work perfectly.',
      feedbackUri: 'ipfs://QmExampleFeedback987654321',
    });

    console.log(`✅ Work approved`);
    console.log(`   Status: ${reviewResponse.bounty.status}`);
    console.log(`   Rating: ${reviewResponse.review?.rating}/5`);

    // ==================== VERIFICATION ====================
    console.log('\n\nSTEP 7: Verify Updates');
    console.log('─'.repeat(50));

    // Check updated reputation
    console.log('\n7a. Checking hunter\'s updated reputation...');
    const updatedReputation = await creatorClient.getAgentReputation(hunterResponse.agent.agentId);
    console.log(`   Previous: ${hunterReputation.reputation.score}/100`);
    console.log(`   Current: ${updatedReputation.reputation.score}/100`);
    console.log(`   Completed bounties: ${updatedReputation.reputation.completedTasks}`);

    // Check agent's bounty list
    console.log('\n7b. Checking hunter\'s bounty history...');
    const agentBounties = await hunterClient.getAgentBounties(hunterResponse.agent.agentId);
    console.log(`   Total bounties: ${agentBounties.bounties.length}`);
    console.log(`   Status breakdown:`);
    const statusCounts = agentBounties.bounties.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`     - ${status}: ${count}`);
    });

    // Get final bounty state
    console.log('\n7c. Final bounty state...');
    const finalBounty = await creatorClient.getBounty(bountyId);
    console.log(`   Status: ${finalBounty.bounty.status}`);
    console.log(`   Payment released: ${finalBounty.bounty.status === 'paid' ? 'Yes' : 'Pending'}`);

    // ==================== WEBHOOKS (BONUS) ====================
    console.log('\n\nSTEP 8: Webhooks (Optional)');
    console.log('─'.repeat(50));

    console.log('\n8a. Registering webhook for future events...');
    const webhookResponse = await hunterClient.registerWebhook(hunterResponse.agent.agentId, {
      url: 'https://hunter-agent.example.com/webhooks',
      events: ['bounty.created', 'bounty.claimed', 'bounty.approved'],
      secret: 'webhook_secret_key_here',
    });
    console.log(`✅ Webhook registered: ${webhookResponse.webhook.id}`);

    console.log('\n8b. Listing webhooks...');
    const webhooks = await hunterClient.listWebhooks(hunterResponse.agent.agentId);
    console.log(`   Total webhooks: ${webhooks.webhooks.length}`);

    // ==================== SUMMARY ====================
    console.log('\n\n' + '='.repeat(50));
    console.log('LIFECYCLE COMPLETE!');
    console.log('='.repeat(50));
    console.log(`
✅ Creator agent registered
✅ Hunter agent registered
✅ Bounty created and funded
✅ Hunter discovered and claimed bounty
✅ Work submitted for review
✅ Creator approved work (5/5 rating)
✅ Payment released
✅ Reputation updated
✅ Webhooks configured

Final State:
  - Bounty Status: ${finalBounty.bounty.status}
  - Hunter Reputation: ${updatedReputation.reputation.score}/100
  - Completed Tasks: ${updatedReputation.reputation.completedTasks}
    `);

  } catch (error) {
    console.error('\n❌ Error during lifecycle:', error);
    process.exit(1);
  }
}

main();
