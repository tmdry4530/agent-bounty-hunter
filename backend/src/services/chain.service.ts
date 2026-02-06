import { createPublicClient, http, Address } from 'viem';
import { IAgentRegistryABI, IBountyRegistryABI } from '../contracts';

// Monad chain configuration
const monadMainnet = {
  id: 143,
  name: 'Monad Mainnet',
  network: 'monad-mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: [process.env.RPC_URL || 'https://mainnet-rpc.monad.xyz'],
    },
    public: {
      http: [process.env.RPC_URL || 'https://mainnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: 'https://mainnet-explorer.monad.xyz' },
  },
} as const;

const client = createPublicClient({
  chain: monadMainnet,
  transport: http(process.env.RPC_URL || 'https://mainnet-rpc.monad.xyz'),
});

// Contract addresses from environment
const getContractAddresses = () => {
  const agentRegistry = process.env.AGENT_REGISTRY_ADDRESS;
  const bountyRegistry = process.env.BOUNTY_REGISTRY_ADDRESS;
  const reputationRegistry = process.env.REPUTATION_REGISTRY_ADDRESS;

  if (!agentRegistry || !bountyRegistry) {
    throw new Error('Contract addresses not configured in environment variables');
  }

  return {
    agentRegistry: agentRegistry as Address,
    bountyRegistry: bountyRegistry as Address,
    reputationRegistry: reputationRegistry as Address,
  };
};

export const chainService = {
  // Agent Registry Functions
  async getAgent(agentId: bigint) {
    try {
      const addresses = getContractAddresses();
      return await client.readContract({
        address: addresses.agentRegistry,
        abi: IAgentRegistryABI,
        functionName: 'getAgent',
        args: [agentId],
      });
    } catch (error) {
      console.error(`Error fetching agent ${agentId} from chain:`, error);
      throw new Error('Failed to fetch agent from blockchain');
    }
  },

  async getAgentByWallet(walletAddress: Address) {
    try {
      const addresses = getContractAddresses();
      return await client.readContract({
        address: addresses.agentRegistry,
        abi: IAgentRegistryABI,
        functionName: 'getAgentByWallet',
        args: [walletAddress],
      });
    } catch (error) {
      console.error(`Error fetching agent by wallet ${walletAddress}:`, error);
      throw new Error('Failed to fetch agent by wallet');
    }
  },

  async getAgentMetadata(agentId: bigint, key: string) {
    try {
      const addresses = getContractAddresses();
      return await client.readContract({
        address: addresses.agentRegistry,
        abi: IAgentRegistryABI,
        functionName: 'getMetadata',
        args: [agentId, key],
      });
    } catch (error) {
      console.error(`Error fetching metadata for agent ${agentId}:`, error);
      throw new Error('Failed to fetch agent metadata');
    }
  },

  async getAgentReputation(agentId: bigint) {
    try {
      const addresses = getContractAddresses();
      return await client.readContract({
        address: addresses.agentRegistry,
        abi: IAgentRegistryABI,
        functionName: 'getReputation',
        args: [agentId],
      });
    } catch (error) {
      console.error(`Error fetching reputation for agent ${agentId}:`, error);
      throw new Error('Failed to fetch agent reputation');
    }
  },

  async isAgentActive(agentId: bigint) {
    try {
      const addresses = getContractAddresses();
      return await client.readContract({
        address: addresses.agentRegistry,
        abi: IAgentRegistryABI,
        functionName: 'isActive',
        args: [agentId],
      });
    } catch (error) {
      console.error(`Error checking if agent ${agentId} is active:`, error);
      throw new Error('Failed to check agent status');
    }
  },

  async getTotalAgents() {
    try {
      const addresses = getContractAddresses();
      return await client.readContract({
        address: addresses.agentRegistry,
        abi: IAgentRegistryABI,
        functionName: 'totalAgents',
      });
    } catch (error) {
      console.error('Error fetching total agents:', error);
      throw new Error('Failed to fetch total agents');
    }
  },

  // Bounty Registry Functions
  async getBounty(bountyId: bigint) {
    try {
      const addresses = getContractAddresses();
      return await client.readContract({
        address: addresses.bountyRegistry,
        abi: IBountyRegistryABI,
        functionName: 'getBounty',
        args: [bountyId],
      });
    } catch (error) {
      console.error(`Error fetching bounty ${bountyId} from chain:`, error);
      throw new Error('Failed to fetch bounty from blockchain');
    }
  },

  async getBountyStatus(bountyId: bigint) {
    try {
      const addresses = getContractAddresses();
      return await client.readContract({
        address: addresses.bountyRegistry,
        abi: IBountyRegistryABI,
        functionName: 'getBountyStatus',
        args: [bountyId],
      });
    } catch (error) {
      console.error(`Error fetching status for bounty ${bountyId}:`, error);
      throw new Error('Failed to fetch bounty status');
    }
  },

  async getBountiesByCreator(agentId: bigint) {
    try {
      const addresses = getContractAddresses();
      return await client.readContract({
        address: addresses.bountyRegistry,
        abi: IBountyRegistryABI,
        functionName: 'getBountiesByCreator',
        args: [agentId],
      });
    } catch (error) {
      console.error(`Error fetching bounties by creator ${agentId}:`, error);
      throw new Error('Failed to fetch bounties by creator');
    }
  },

  async getBountiesByHunter(agentId: bigint) {
    try {
      const addresses = getContractAddresses();
      return await client.readContract({
        address: addresses.bountyRegistry,
        abi: IBountyRegistryABI,
        functionName: 'getBountiesByHunter',
        args: [agentId],
      });
    } catch (error) {
      console.error(`Error fetching bounties by hunter ${agentId}:`, error);
      throw new Error('Failed to fetch bounties by hunter');
    }
  },

  async getTotalBounties() {
    try {
      const addresses = getContractAddresses();
      return await client.readContract({
        address: addresses.bountyRegistry,
        abi: IBountyRegistryABI,
        functionName: 'totalBounties',
      });
    } catch (error) {
      console.error('Error fetching total bounties:', error);
      throw new Error('Failed to fetch total bounties');
    }
  },

  // Utility Functions
  async getBlockNumber() {
    try {
      return await client.getBlockNumber();
    } catch (error) {
      console.error('Error fetching block number:', error);
      throw new Error('Failed to fetch block number');
    }
  },

  async getBalance(address: Address) {
    try {
      return await client.getBalance({ address });
    } catch (error) {
      console.error(`Error fetching balance for ${address}:`, error);
      throw new Error('Failed to fetch balance');
    }
  },

  getClient() {
    return client;
  },
};
