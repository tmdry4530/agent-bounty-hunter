import { eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { agents, bounties, reviews } from '../db/schema';
import type { Address } from 'viem';

type DB = PostgresJsDatabase<typeof schema>;

// ============================================================================
// AgentIdentityRegistry Event Handlers
// ============================================================================

/**
 * Handles Registered event from AgentIdentityRegistry
 * Creates a new agent record in the database
 */
export async function handleRegistered(
  db: DB,
  log: { args: { agentId: bigint; agentURI: string; owner: Address } }
) {
  const { agentId, agentURI, owner } = log.args;

  await db.insert(agents).values({
    onChainId: Number(agentId),
    ownerAddress: owner.toLowerCase(),
    walletAddress: owner.toLowerCase(),
    registrationUri: agentURI,
    reputationScore: 50, // Default initial score
    completedBounties: 0,
    totalEarnings: '0',
  }).onConflictDoNothing();

  console.log(`[Indexer] Agent ${agentId} registered by ${owner}`);
}

/**
 * Handles MetadataSet event from AgentIdentityRegistry
 * Updates agent metadata fields based on the key
 */
export async function handleMetadataSet(
  db: DB,
  log: { args: { agentId: bigint; key: string; value: `0x${string}` } }
) {
  const { agentId, key, value } = log.args;

  // Decode value from bytes to string
  const decodedValue = Buffer.from(value.slice(2), 'hex').toString('utf8');

  // Update specific fields based on key
  const updateData: Partial<typeof agents.$inferInsert> = { updatedAt: new Date() };

  if (key === 'name') {
    updateData.name = decodedValue;
  } else if (key === 'description') {
    updateData.description = decodedValue;
  } else if (key === 'image') {
    updateData.imageUrl = decodedValue;
  } else if (key === 'skills') {
    // Store as JSON array
    try {
      const skills = JSON.parse(decodedValue);
      updateData.skills = skills;
    } catch (e) {
      console.error(`[Indexer] Failed to parse skills JSON for agent ${agentId}:`, e);
    }
  }

  if (Object.keys(updateData).length > 1) { // More than just updatedAt
    await db.update(agents)
      .set(updateData)
      .where(eq(agents.onChainId, Number(agentId)));
  }

  console.log(`[Indexer] Agent ${agentId} metadata set: ${key}`);
}

/**
 * Handles AgentWalletSet event from AgentIdentityRegistry
 * Updates the agent's wallet address
 */
export async function handleAgentWalletSet(
  db: DB,
  log: { args: { agentId: bigint; wallet: Address } }
) {
  const { agentId, wallet } = log.args;

  await db.update(agents)
    .set({
      walletAddress: wallet.toLowerCase(),
      updatedAt: new Date()
    })
    .where(eq(agents.onChainId, Number(agentId)));

  console.log(`[Indexer] Agent ${agentId} wallet updated to ${wallet}`);
}

// ============================================================================
// BountyRegistry Event Handlers
// ============================================================================

/**
 * Handles BountyCreated event from BountyRegistry
 * Creates a new bounty record in the database
 */
export async function handleBountyCreated(
  db: DB,
  log: {
    args: {
      bountyId: bigint;
      creator: bigint;
      title: string;
      rewardAmount: bigint;
      deadline: bigint;
    }
  }
) {
  const { bountyId, creator, title, rewardAmount, deadline } = log.args;

  await db.insert(bounties).values({
    onChainId: Number(bountyId),
    creatorAgentId: Number(creator),
    title,
    description: '', // Will be set via metadata
    descriptionUri: '', // Will be set via metadata
    rewardAmount: rewardAmount.toString(),
    rewardToken: '0x0000000000000000000000000000000000000000', // ETH
    deadline: new Date(Number(deadline) * 1000),
    status: 'open',
  }).onConflictDoNothing();

  console.log(`[Indexer] Bounty ${bountyId} created by agent ${creator}`);
}

/**
 * Handles BountyClaimed event from BountyRegistry
 * Updates bounty status to claimed
 */
export async function handleBountyClaimed(
  db: DB,
  log: {
    args: {
      bountyId: bigint;
      hunter: bigint;
      claimedAt: bigint;
    }
  }
) {
  const { bountyId, hunter, claimedAt } = log.args;

  await db.update(bounties)
    .set({
      claimedBy: Number(hunter),
      claimedAt: new Date(Number(claimedAt) * 1000),
      status: 'claimed',
      updatedAt: new Date(),
    })
    .where(eq(bounties.onChainId, Number(bountyId)));

  console.log(`[Indexer] Bounty ${bountyId} claimed by agent ${hunter}`);
}

/**
 * Handles BountySubmitted event from BountyRegistry
 * Updates bounty with submission data
 */
export async function handleBountySubmitted(
  db: DB,
  log: {
    args: {
      bountyId: bigint;
      hunter: bigint;
      submissionURI: string;
      submittedAt: bigint;
    }
  }
) {
  const { bountyId, hunter, submissionURI, submittedAt } = log.args;

  await db.update(bounties)
    .set({
      submissionUri: submissionURI,
      submittedAt: new Date(Number(submittedAt) * 1000),
      status: 'submitted',
      updatedAt: new Date(),
    })
    .where(eq(bounties.onChainId, Number(bountyId)));

  console.log(`[Indexer] Bounty ${bountyId} submitted by agent ${hunter}`);
}

/**
 * Handles BountyApproved event from BountyRegistry
 * Updates bounty status and creates a review record
 */
export async function handleBountyApproved(
  db: DB,
  log: {
    args: {
      bountyId: bigint;
      hunter: bigint;
      rating: number;
    }
  }
) {
  const { bountyId, hunter, rating } = log.args;

  // Update bounty status
  await db.update(bounties)
    .set({
      status: 'approved',
      updatedAt: new Date(),
    })
    .where(eq(bounties.onChainId, Number(bountyId)));

  // Get bounty details for the review
  const [bounty] = await db.select()
    .from(bounties)
    .where(eq(bounties.onChainId, Number(bountyId)))
    .limit(1);

  if (bounty) {
    // Create review record
    await db.insert(reviews).values({
      bountyId: bounty.id,
      fromAgentId: bounty.creatorAgentId,
      toAgentId: Number(hunter),
      rating,
      feedback: '', // Optional feedback can be added via separate event
    }).onConflictDoNothing();
  }

  console.log(`[Indexer] Bounty ${bountyId} approved with rating ${rating}`);
}

/**
 * Handles BountyRejected event from BountyRegistry
 * Updates bounty status to rejected
 */
export async function handleBountyRejected(
  db: DB,
  log: {
    args: {
      bountyId: bigint;
      hunter: bigint;
      reason: string;
    }
  }
) {
  const { bountyId, hunter, reason } = log.args;

  await db.update(bounties)
    .set({
      status: 'rejected',
      updatedAt: new Date(),
    })
    .where(eq(bounties.onChainId, Number(bountyId)));

  console.log(`[Indexer] Bounty ${bountyId} rejected: ${reason}`);
}

/**
 * Handles BountyPaid event from BountyRegistry
 * Updates bounty status and agent earnings
 */
export async function handleBountyPaid(
  db: DB,
  log: {
    args: {
      bountyId: bigint;
      hunter: bigint;
      amount: bigint;
    }
  }
) {
  const { bountyId, hunter, amount } = log.args;

  // Update bounty status
  await db.update(bounties)
    .set({
      status: 'paid',
      updatedAt: new Date(),
    })
    .where(eq(bounties.onChainId, Number(bountyId)));

  // Update agent total earnings
  await db.update(agents)
    .set({
      totalEarnings: sql`${agents.totalEarnings}::numeric + ${amount.toString()}::numeric`,
      updatedAt: new Date(),
    })
    .where(eq(agents.onChainId, Number(hunter)));

  console.log(`[Indexer] Bounty ${bountyId} paid to agent ${hunter}: ${amount}`);
}

/**
 * Handles BountyCancelled event from BountyRegistry
 * Updates bounty status to cancelled
 */
export async function handleBountyCancelled(
  db: DB,
  log: {
    args: {
      bountyId: bigint;
      creator: bigint;
    }
  }
) {
  const { bountyId, creator } = log.args;

  await db.update(bounties)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
    })
    .where(eq(bounties.onChainId, Number(bountyId)));

  console.log(`[Indexer] Bounty ${bountyId} cancelled by creator ${creator}`);
}

/**
 * Handles BountyExpired event from BountyRegistry
 * Updates bounty status to expired
 */
export async function handleBountyExpired(
  db: DB,
  log: {
    args: {
      bountyId: bigint;
    }
  }
) {
  const { bountyId } = log.args;

  await db.update(bounties)
    .set({
      status: 'expired',
      updatedAt: new Date(),
    })
    .where(eq(bounties.onChainId, Number(bountyId)));

  console.log(`[Indexer] Bounty ${bountyId} expired`);
}

// ============================================================================
// ReputationRegistry Event Handlers
// ============================================================================

/**
 * Handles ReputationUpdated event from ReputationRegistry
 * Updates agent reputation score
 */
export async function handleReputationUpdated(
  db: DB,
  log: {
    args: {
      agentId: bigint;
      newScore: number;
    }
  }
) {
  const { agentId, newScore } = log.args;

  await db.update(agents)
    .set({
      reputationScore: newScore,
      updatedAt: new Date(),
    })
    .where(eq(agents.onChainId, Number(agentId)));

  console.log(`[Indexer] Agent ${agentId} reputation updated to ${newScore}`);
}

/**
 * Handles ReviewAdded event from ReputationRegistry
 * Creates a new review record
 */
export async function handleReviewAdded(
  db: DB,
  log: {
    args: {
      agentId: bigint;
      bountyId: bigint;
      rating: number;
    }
  }
) {
  const { agentId, bountyId, rating } = log.args;

  // Get bounty details for the review
  const [bounty] = await db.select()
    .from(bounties)
    .where(eq(bounties.onChainId, Number(bountyId)))
    .limit(1);

  if (bounty) {
    await db.insert(reviews).values({
      bountyId: bounty.id,
      fromAgentId: bounty.creatorAgentId,
      toAgentId: Number(agentId),
      rating,
      feedback: '',
    }).onConflictDoNothing();

    console.log(`[Indexer] Review added for agent ${agentId} on bounty ${bountyId}: rating ${rating}`);
  } else {
    console.error(`[Indexer] Bounty ${bountyId} not found for review`);
  }
}

/**
 * Handles BountyCompleted event from ReputationRegistry
 * Updates agent completed bounties count and earnings
 */
export async function handleBountyCompleted(
  db: DB,
  log: {
    args: {
      agentId: bigint;
      bountyId: bigint;
      reward: bigint;
    }
  }
) {
  const { agentId, bountyId, reward } = log.args;

  // Update agent stats
  await db.update(agents)
    .set({
      completedBounties: sql`${agents.completedBounties} + 1`,
      totalEarnings: sql`${agents.totalEarnings}::numeric + ${reward.toString()}::numeric`,
      updatedAt: new Date(),
    })
    .where(eq(agents.onChainId, Number(agentId)));

  console.log(`[Indexer] Agent ${agentId} completed bounty ${bountyId}, earned ${reward}`);
}

// ============================================================================
// Export all handlers
// ============================================================================

export const eventHandlers = {
  // AgentIdentityRegistry
  Registered: handleRegistered,
  MetadataSet: handleMetadataSet,
  AgentWalletSet: handleAgentWalletSet,

  // BountyRegistry
  BountyCreated: handleBountyCreated,
  BountyClaimed: handleBountyClaimed,
  BountySubmitted: handleBountySubmitted,
  BountyApproved: handleBountyApproved,
  BountyRejected: handleBountyRejected,
  BountyPaid: handleBountyPaid,
  BountyCancelled: handleBountyCancelled,
  BountyExpired: handleBountyExpired,

  // ReputationRegistry
  ReputationUpdated: handleReputationUpdated,
  ReviewAdded: handleReviewAdded,
  BountyCompleted: handleBountyCompleted,
};
