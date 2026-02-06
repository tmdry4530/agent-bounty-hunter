import { db } from '../db/client';
import { bounties } from '../db/schema';
import { eq, and, gte, lte, sql, arrayContains } from 'drizzle-orm';

export interface BountyFilters {
  status?: string;
  skills?: string[];
  minReward?: string;
  maxReward?: string;
  deadline?: Date;
  minReputation?: number;
  creatorAgentId?: number;
  claimedBy?: number;
}

export const bountyService = {
  async findAll(limit = 20, offset = 0, filters?: BountyFilters) {
    try {
      const conditions = [];

      if (filters?.status) {
        conditions.push(eq(bounties.status, filters.status));
      }

      if (filters?.skills && filters.skills.length > 0) {
        conditions.push(arrayContains(bounties.requiredSkills, filters.skills));
      }

      if (filters?.minReward) {
        conditions.push(sql`CAST(${bounties.rewardAmount} AS NUMERIC) >= ${filters.minReward}`);
      }

      if (filters?.maxReward) {
        conditions.push(sql`CAST(${bounties.rewardAmount} AS NUMERIC) <= ${filters.maxReward}`);
      }

      if (filters?.deadline) {
        conditions.push(lte(bounties.deadline, filters.deadline));
      }

      if (filters?.minReputation !== undefined) {
        conditions.push(gte(bounties.minReputation, filters.minReputation));
      }

      if (filters?.creatorAgentId) {
        conditions.push(eq(bounties.creatorAgentId, filters.creatorAgentId));
      }

      if (filters?.claimedBy) {
        conditions.push(eq(bounties.claimedBy, filters.claimedBy));
      }

      const query = db.select().from(bounties);

      if (conditions.length > 0) {
        return await query.where(and(...conditions)).limit(limit).offset(offset);
      }

      return await query.limit(limit).offset(offset);
    } catch (error) {
      console.error('Error fetching bounties:', error);
      throw new Error('Failed to fetch bounties');
    }
  },

  async findById(id: number) {
    try {
      const result = await db.select().from(bounties).where(eq(bounties.id, id));
      return result[0] || null;
    } catch (error) {
      console.error(`Error fetching bounty with id ${id}:`, error);
      throw new Error('Failed to fetch bounty');
    }
  },

  async findByOnChainId(onChainId: number) {
    try {
      const result = await db.select().from(bounties).where(eq(bounties.onChainId, onChainId));
      return result[0] || null;
    } catch (error) {
      console.error(`Error fetching bounty with onChainId ${onChainId}:`, error);
      throw new Error('Failed to fetch bounty');
    }
  },

  async findOpenBounties(limit = 20, offset = 0) {
    try {
      return await db
        .select()
        .from(bounties)
        .where(eq(bounties.status, 'open'))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error('Error fetching open bounties:', error);
      throw new Error('Failed to fetch open bounties');
    }
  },

  async findByCreator(creatorAgentId: number, limit = 20, offset = 0) {
    try {
      return await db
        .select()
        .from(bounties)
        .where(eq(bounties.creatorAgentId, creatorAgentId))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error(`Error fetching bounties for creator ${creatorAgentId}:`, error);
      throw new Error('Failed to fetch bounties by creator');
    }
  },

  async findByClaimer(claimedBy: number, limit = 20, offset = 0) {
    try {
      return await db
        .select()
        .from(bounties)
        .where(eq(bounties.claimedBy, claimedBy))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error(`Error fetching bounties for claimer ${claimedBy}:`, error);
      throw new Error('Failed to fetch bounties by claimer');
    }
  },

  async create(data: typeof bounties.$inferInsert) {
    try {
      const result = await db.insert(bounties).values(data).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating bounty:', error);
      throw new Error('Failed to create bounty');
    }
  },

  async update(id: number, data: Partial<typeof bounties.$inferInsert>) {
    try {
      const result = await db
        .update(bounties)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(bounties.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error(`Error updating bounty with id ${id}:`, error);
      throw new Error('Failed to update bounty');
    }
  },

  async claim(id: number, agentId: number) {
    try {
      const result = await db
        .update(bounties)
        .set({
          claimedBy: agentId,
          claimedAt: new Date(),
          status: 'claimed',
          updatedAt: new Date(),
        })
        .where(eq(bounties.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error(`Error claiming bounty ${id}:`, error);
      throw new Error('Failed to claim bounty');
    }
  },

  async submit(id: number, submissionUri: string) {
    try {
      const result = await db
        .update(bounties)
        .set({
          submissionUri,
          submittedAt: new Date(),
          status: 'submitted',
          updatedAt: new Date(),
        })
        .where(eq(bounties.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error(`Error submitting bounty ${id}:`, error);
      throw new Error('Failed to submit bounty');
    }
  },

  async approve(id: number) {
    try {
      const result = await db
        .update(bounties)
        .set({
          status: 'approved',
          updatedAt: new Date(),
        })
        .where(eq(bounties.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error(`Error approving bounty ${id}:`, error);
      throw new Error('Failed to approve bounty');
    }
  },

  async reject(id: number) {
    try {
      const result = await db
        .update(bounties)
        .set({
          status: 'rejected',
          updatedAt: new Date(),
        })
        .where(eq(bounties.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error(`Error rejecting bounty ${id}:`, error);
      throw new Error('Failed to reject bounty');
    }
  },

  async cancel(id: number) {
    try {
      const result = await db
        .update(bounties)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(bounties.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error(`Error cancelling bounty ${id}:`, error);
      throw new Error('Failed to cancel bounty');
    }
  },
};
