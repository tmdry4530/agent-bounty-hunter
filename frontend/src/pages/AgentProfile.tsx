import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { useAccount, useReadContract } from 'wagmi';
import { parseAbi } from 'viem';
import { CONTRACTS } from '../config/contracts';
import { agentIdentityRegistryAbi, reputationRegistryAbi } from '../config/abis';
import { RegistrationCard } from '../components/profile/RegistrationCard';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { StatsGrid } from '../components/profile/StatsGrid';
import { ReputationDetails } from '../components/profile/ReputationDetails';
import { BountyHistory } from '../components/profile/BountyHistory';

export default function AgentProfile() {
  const { address, isConnected } = useAccount();

  // Check if user has an agent NFT
  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: CONTRACTS.AgentIdentityRegistry,
    abi: parseAbi(agentIdentityRegistryAbi),
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Get agent ID if balance > 0
  const { data: agentId, isLoading: agentIdLoading } = useReadContract({
    address: CONTRACTS.AgentIdentityRegistry,
    abi: parseAbi(agentIdentityRegistryAbi),
    functionName: 'tokenOfOwnerByIndex',
    args: address && balance && balance > 0n ? [address, 0n] : undefined,
    query: { enabled: !!address && !!balance && balance > 0n },
  });

  // Get agent URI
  const { data: agentURI } = useReadContract({
    address: CONTRACTS.AgentIdentityRegistry,
    abi: parseAbi(agentIdentityRegistryAbi),
    functionName: 'tokenURI',
    args: agentId ? [agentId] : undefined,
    query: { enabled: !!agentId },
  });

  // Get reputation data
  const { data: reputation } = useReadContract({
    address: CONTRACTS.ReputationRegistry,
    abi: parseAbi(reputationRegistryAbi),
    functionName: 'getReputation',
    args: agentId ? [agentId] : undefined,
    query: { enabled: !!agentId },
  });

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950 pt-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center"
          >
            <div className="w-20 h-20 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-violet-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Connect Your Wallet</h2>
            <p className="text-gray-400 text-lg mb-8">
              Connect your wallet to view or register your agent profile
            </p>
            <button className="px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all">
              Connect Wallet
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Loading state
  if (balanceLoading || agentIdLoading) {
    return (
      <div className="min-h-screen bg-gray-950 pt-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  // Not registered
  if (!balance || balance === 0n || !agentId) {
    return (
      <div className="min-h-screen bg-gray-950 pt-24 px-4">
        <div className="max-w-4xl mx-auto">
          <RegistrationCard />
        </div>
      </div>
    );
  }

  // Parse reputation data
  const reputationData = reputation as [bigint, bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
  const score = reputationData ? Number(reputationData[0]) : 0;
  const completedBounties = reputationData ? Number(reputationData[1]) : 0;
  const totalEarnings = reputationData ? reputationData[2] : 0n;
  const avgRating = reputationData ? Number(reputationData[3]) : 0;
  const totalRatings = reputationData ? Number(reputationData[4]) : 0;
  const successRate = reputationData ? Number(reputationData[5]) : 0;
  // Registered - show full profile
  return (
    <div className="min-h-screen bg-gray-950 pt-24 px-4 pb-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <ProfileHeader
          agentId={agentId}
          walletAddress={address!}
          agentURI={agentURI as string || ''}
          reputationScore={score}
        />

        <StatsGrid
          completedBounties={completedBounties}
          totalEarnings={totalEarnings}
          successRate={successRate}
          avgRating={avgRating}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ReputationDetails
            score={score}
            avgRating={avgRating}
            completedBounties={completedBounties}
            successRate={successRate}
            totalRatings={totalRatings}
          />

          <BountyHistory agentId={agentId} />
        </div>
      </div>
    </div>
  );
}
