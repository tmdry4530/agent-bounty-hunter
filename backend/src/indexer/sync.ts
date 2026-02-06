import { type PublicClient, type Address } from 'viem';
import type { Redis } from 'ioredis';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import {
  AgentIdentityRegistryABI,
  BountyRegistryABI,
  ReputationRegistryABI,
} from '../contracts/abis';
import * as handlers from './handlers';

type DB = PostgresJsDatabase<typeof schema>;

interface SyncConfig {
  client: PublicClient;
  db: DB;
  redis: Redis;
  addresses: {
    agentRegistry: Address;
    bountyRegistry: Address;
    reputationRegistry: Address;
    escrow: Address;
  };
  startBlock: bigint;
}

const REDIS_KEY_LAST_BLOCK = 'indexer:lastBlock';
const BATCH_SIZE = 1000n;
const CONFIRMATION_BLOCKS = 2n;

let isRunning = false;
let unwatchFns: (() => void)[] = [];

export async function startSync(config: SyncConfig) {
  isRunning = true;
  const { client, db, redis, addresses, startBlock } = config;

  // Get current block
  const currentBlock = await client.getBlockNumber();
  const safeBlock = currentBlock - CONFIRMATION_BLOCKS;

  console.log(`Current block: ${currentBlock}, safe block: ${safeBlock}`);

  // Historical backfill
  if (startBlock < safeBlock) {
    console.log(`Backfilling from block ${startBlock} to ${safeBlock}...`);
    await backfill(config, startBlock, safeBlock);
  }

  // Start real-time watching
  console.log('Starting real-time event watching...');
  await startWatching(config);
}

async function backfill(config: SyncConfig, fromBlock: bigint, toBlock: bigint) {
  const { client, db, redis, addresses } = config;

  for (let start = fromBlock; start <= toBlock && isRunning; start += BATCH_SIZE) {
    const end = start + BATCH_SIZE - 1n > toBlock ? toBlock : start + BATCH_SIZE - 1n;

    console.log(`Processing blocks ${start} to ${end}...`);

    // Fetch events from all contracts in parallel
    const [agentEvents, bountyEvents, reputationEvents] = await Promise.all([
      client.getContractEvents({
        address: addresses.agentRegistry,
        abi: AgentIdentityRegistryABI,
        fromBlock: start,
        toBlock: end,
      }),
      client.getContractEvents({
        address: addresses.bountyRegistry,
        abi: BountyRegistryABI,
        fromBlock: start,
        toBlock: end,
      }),
      client.getContractEvents({
        address: addresses.reputationRegistry,
        abi: ReputationRegistryABI,
        fromBlock: start,
        toBlock: end,
      }),
    ]);

    // Combine and sort by block number and log index
    const allEvents = [...agentEvents, ...bountyEvents, ...reputationEvents]
      .sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return Number(a.blockNumber - b.blockNumber);
        }
        return Number(a.logIndex - b.logIndex);
      });

    // Process each event
    for (const event of allEvents) {
      await processEvent(db, event);
    }

    // Update last processed block
    await redis.set(REDIS_KEY_LAST_BLOCK, end.toString());
  }
}

async function processEvent(db: DB, event: any) {
  const eventName = event.eventName;

  switch (eventName) {
    // AgentIdentityRegistry events
    case 'Registered':
      await handlers.handleRegistered(db, event);
      break;
    case 'MetadataSet':
      await handlers.handleMetadataSet(db, event);
      break;
    case 'AgentWalletSet':
      await handlers.handleAgentWalletSet(db, event);
      break;

    // BountyRegistry events
    case 'BountyCreated':
      await handlers.handleBountyCreated(db, event);
      break;
    case 'BountyClaimed':
      await handlers.handleBountyClaimed(db, event);
      break;
    case 'BountySubmitted':
      await handlers.handleBountySubmitted(db, event);
      break;
    case 'BountyApproved':
      await handlers.handleBountyApproved(db, event);
      break;
    case 'BountyRejected':
      await handlers.handleBountyRejected(db, event);
      break;
    case 'BountyPaid':
      await handlers.handleBountyPaid(db, event);
      break;
    case 'BountyCancelled':
      await handlers.handleBountyCancelled(db, event);
      break;
    case 'BountyExpired':
      await handlers.handleBountyExpired(db, event);
      break;

    // ReputationRegistry events
    case 'ReputationUpdated':
      await handlers.handleReputationUpdated(db, event);
      break;
    case 'ReviewAdded':
      await handlers.handleReviewAdded(db, event);
      break;
    case 'BountyCompleted':
      await handlers.handleBountyCompleted(db, event);
      break;

    default:
      // Ignore unknown events
      break;
  }
}

async function startWatching(config: SyncConfig) {
  const { client, db, redis, addresses } = config;

  // Watch AgentIdentityRegistry events
  const unwatchAgent = client.watchContractEvent({
    address: addresses.agentRegistry,
    abi: AgentIdentityRegistryABI,
    onLogs: async (logs) => {
      for (const log of logs) {
        await processEvent(db, log);
        if (log.blockNumber) {
          await redis.set(REDIS_KEY_LAST_BLOCK, log.blockNumber.toString());
        }
      }
    },
  });

  // Watch BountyRegistry events
  const unwatchBounty = client.watchContractEvent({
    address: addresses.bountyRegistry,
    abi: BountyRegistryABI,
    onLogs: async (logs) => {
      for (const log of logs) {
        await processEvent(db, log);
        if (log.blockNumber) {
          await redis.set(REDIS_KEY_LAST_BLOCK, log.blockNumber.toString());
        }
      }
    },
  });

  // Watch ReputationRegistry events
  const unwatchReputation = client.watchContractEvent({
    address: addresses.reputationRegistry,
    abi: ReputationRegistryABI,
    onLogs: async (logs) => {
      for (const log of logs) {
        await processEvent(db, log);
        if (log.blockNumber) {
          await redis.set(REDIS_KEY_LAST_BLOCK, log.blockNumber.toString());
        }
      }
    },
  });

  unwatchFns = [unwatchAgent, unwatchBounty, unwatchReputation];
}

export async function stopSync() {
  isRunning = false;
  for (const unwatch of unwatchFns) {
    unwatch();
  }
  unwatchFns = [];
  console.log('Sync stopped');
}
