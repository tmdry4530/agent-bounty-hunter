import { createPublicClient, http } from 'viem';
import { Redis } from 'ioredis';
import { db } from '../db/client';
import { getContractAddresses } from '../contracts/addresses';
import { startSync, stopSync } from './sync';

const REDIS_KEY_LAST_BLOCK = 'indexer:lastBlock';

async function main() {
  console.log('Starting Event Indexer...');

  // Initialize Redis
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  // Create viem client for Monad
  const client = createPublicClient({
    chain: {
      id: 143,
      name: 'Monad',
      nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
      rpcUrls: {
        default: { http: [process.env.RPC_URL || 'http://localhost:8545'] },
      },
    },
    transport: http(),
  });

  // Get contract addresses and map to expected format
  const rawAddresses = getContractAddresses();
  const addresses = {
    agentRegistry: rawAddresses.agentIdentityRegistry,
    bountyRegistry: rawAddresses.bountyRegistry,
    reputationRegistry: rawAddresses.reputationRegistry,
    escrow: rawAddresses.bountyEscrow,
  };

  // Get last indexed block from Redis (or start from 0)
  const lastBlockStr = await redis.get(REDIS_KEY_LAST_BLOCK);
  const startBlock = lastBlockStr ? BigInt(lastBlockStr) : 0n;

  console.log(`Resuming from block ${startBlock}`);

  // Start syncing
  await startSync({
    client,
    db,
    redis,
    addresses,
    startBlock,
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await stopSync();
    await redis.quit();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await stopSync();
    await redis.quit();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Indexer failed:', err);
  process.exit(1);
});
