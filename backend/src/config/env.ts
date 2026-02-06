import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  RPC_URL: z.string().default('https://rpc.monad.xyz'),
  CHAIN_ID: z.string().default('143'),
  PINATA_API_KEY: z.string().optional(),
  PINATA_SECRET_KEY: z.string().optional(),
  X402_DEV_BYPASS: z.string().default('false'),
  AGENT_IDENTITY_REGISTRY: z.string(),
  REPUTATION_REGISTRY: z.string(),
  BOUNTY_REGISTRY: z.string(),
  BOUNTY_ESCROW: z.string(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
