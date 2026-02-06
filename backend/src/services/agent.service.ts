import { db } from '../db/client';
import { agents } from '../db/schema';
import { eq } from 'drizzle-orm';

export const agentService = {
  async findAll(limit = 20, offset = 0) {
    try {
      return await db.select().from(agents).limit(limit).offset(offset);
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw new Error('Failed to fetch agents');
    }
  },

  async findById(id: number) {
    try {
      const result = await db.select().from(agents).where(eq(agents.id, id));
      return result[0] || null;
    } catch (error) {
      console.error(`Error fetching agent with id ${id}:`, error);
      throw new Error('Failed to fetch agent');
    }
  },

  async findByOnChainId(onChainId: number) {
    try {
      const result = await db.select().from(agents).where(eq(agents.onChainId, onChainId));
      return result[0] || null;
    } catch (error) {
      console.error(`Error fetching agent with onChainId ${onChainId}:`, error);
      throw new Error('Failed to fetch agent');
    }
  },

  async findByWalletAddress(walletAddress: string) {
    try {
      const result = await db.select().from(agents).where(eq(agents.walletAddress, walletAddress.toLowerCase()));
      return result[0] || null;
    } catch (error) {
      console.error(`Error fetching agent with wallet ${walletAddress}:`, error);
      throw new Error('Failed to fetch agent');
    }
  },

  async create(data: typeof agents.$inferInsert) {
    try {
      const result = await db.insert(agents).values(data).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating agent:', error);
      throw new Error('Failed to create agent');
    }
  },

  async update(id: number, data: Partial<typeof agents.$inferInsert>) {
    try {
      const result = await db
        .update(agents)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(agents.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error(`Error updating agent with id ${id}:`, error);
      throw new Error('Failed to update agent');
    }
  },

  async updateReputationScore(id: number, score: number) {
    try {
      const result = await db
        .update(agents)
        .set({ reputationScore: score, updatedAt: new Date() })
        .where(eq(agents.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error(`Error updating reputation for agent ${id}:`, error);
      throw new Error('Failed to update reputation');
    }
  },

  async incrementCompletedBounties(id: number, earnings: string) {
    try {
      const agent = await this.findById(id);
      if (!agent) throw new Error('Agent not found');

      const newCompletedBounties = (agent.completedBounties || 0) + 1;
      const currentEarnings = BigInt(agent.totalEarnings || '0');
      const additionalEarnings = BigInt(earnings);
      const newTotalEarnings = (currentEarnings + additionalEarnings).toString();

      const result = await db
        .update(agents)
        .set({
          completedBounties: newCompletedBounties,
          totalEarnings: newTotalEarnings,
          updatedAt: new Date(),
        })
        .where(eq(agents.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error(`Error incrementing bounties for agent ${id}:`, error);
      throw new Error('Failed to increment completed bounties');
    }
  },
};
