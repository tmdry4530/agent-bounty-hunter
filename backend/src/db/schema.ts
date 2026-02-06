import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Agents table
export const agents = pgTable(
  'agents',
  {
    id: serial('id').primaryKey(),
    onChainId: integer('on_chain_id').notNull().unique(),
    ownerAddress: text('owner_address').notNull(),
    walletAddress: text('wallet_address').notNull(),
    name: text('name'),
    description: text('description'),
    imageUrl: text('image_url'),
    registrationUri: text('registration_uri').notNull(),
    skills: text('skills').array(),
    pricing: jsonb('pricing'),
    reputationScore: integer('reputation_score').default(50),
    completedBounties: integer('completed_bounties').default(0),
    totalEarnings: text('total_earnings').default('0'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    reputationIdx: index('idx_agents_reputation').on(table.reputationScore),
  })
);

// Bounties table
export const bounties = pgTable(
  'bounties',
  {
    id: serial('id').primaryKey(),
    onChainId: integer('on_chain_id').notNull().unique(),
    creatorAgentId: integer('creator_agent_id').references(() => agents.id),
    title: text('title').notNull(),
    description: text('description'),
    descriptionUri: text('description_uri').notNull(),
    type: text('type'),
    requiredSkills: text('required_skills').array(),
    rewardAmount: text('reward_amount').notNull(),
    rewardToken: text('reward_token').notNull(),
    deadline: timestamp('deadline').notNull(),
    minReputation: integer('min_reputation').default(0),
    status: text('status').default('open'),
    claimedBy: integer('claimed_by').references(() => agents.id),
    claimedAt: timestamp('claimed_at'),
    submissionUri: text('submission_uri'),
    submittedAt: timestamp('submitted_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    statusIdx: index('idx_bounties_status').on(table.status),
    deadlineIdx: index('idx_bounties_deadline').on(table.deadline),
  })
);

// Reviews table
export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  bountyId: integer('bounty_id').references(() => bounties.id),
  fromAgentId: integer('from_agent_id').references(() => agents.id),
  toAgentId: integer('to_agent_id').references(() => agents.id),
  rating: integer('rating').notNull(),
  feedback: text('feedback'),
  evidenceHash: text('evidence_hash'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Webhooks table
export const webhooks = pgTable('webhooks', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').references(() => agents.id),
  url: text('url').notNull(),
  events: text('events').array(),
  secret: text('secret').notNull(),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const agentsRelations = relations(agents, ({ many }) => ({
  createdBounties: many(bounties, { relationName: 'creatorAgent' }),
  claimedBounties: many(bounties, { relationName: 'claimedAgent' }),
  reviewsGiven: many(reviews, { relationName: 'fromAgent' }),
  reviewsReceived: many(reviews, { relationName: 'toAgent' }),
  webhooks: many(webhooks),
}));

export const bountiesRelations = relations(bounties, ({ one, many }) => ({
  creatorAgent: one(agents, {
    fields: [bounties.creatorAgentId],
    references: [agents.id],
    relationName: 'creatorAgent',
  }),
  claimedAgent: one(agents, {
    fields: [bounties.claimedBy],
    references: [agents.id],
    relationName: 'claimedAgent',
  }),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  bounty: one(bounties, {
    fields: [reviews.bountyId],
    references: [bounties.id],
  }),
  fromAgent: one(agents, {
    fields: [reviews.fromAgentId],
    references: [agents.id],
    relationName: 'fromAgent',
  }),
  toAgent: one(agents, {
    fields: [reviews.toAgentId],
    references: [agents.id],
    relationName: 'toAgent',
  }),
}));

export const webhooksRelations = relations(webhooks, ({ one }) => ({
  agent: one(agents, {
    fields: [webhooks.agentId],
    references: [agents.id],
  }),
}));
