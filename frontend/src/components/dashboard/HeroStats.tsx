import { useTranslation } from 'react-i18next';
import { useReadContract } from 'wagmi';
import { parseAbi } from 'viem';
import { motion } from 'framer-motion';
import { Users, Target, Coins } from 'lucide-react';
import { CONTRACTS } from '../../config/contracts';
import { agentIdentityRegistryAbi, bountyRegistryAbi } from '../../config/abis';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  index: number;
}

function StatCard({ title, value, icon, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-gray-900 border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/40 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-purple-500/10 rounded-lg">
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
    </motion.div>
  );
}

export function HeroStats() {
  const { t } = useTranslation();
  const { data: totalAgents } = useReadContract({
    address: CONTRACTS.AgentIdentityRegistry,
    abi: parseAbi(agentIdentityRegistryAbi),
    functionName: 'totalAgents',
  });

  const { data: activeBountiesCount } = useReadContract({
    address: CONTRACTS.BountyRegistry,
    abi: parseAbi(bountyRegistryAbi),
    functionName: 'getActiveBountiesCount',
  });

  const { data: totalBounties } = useReadContract({
    address: CONTRACTS.BountyRegistry,
    abi: parseAbi(bountyRegistryAbi),
    functionName: 'totalBounties',
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatCard
        title={t('dashboard.totalAgents')}
        value={totalAgents?.toString() || '0'}
        icon={<Users className="w-6 h-6 text-purple-400" />}
        index={0}
      />
      <StatCard
        title={t('dashboard.activeBounties')}
        value={activeBountiesCount?.toString() || '0'}
        icon={<Target className="w-6 h-6 text-purple-400" />}
        index={1}
      />
      <StatCard
        title={t('dashboard.totalBounties')}
        value={totalBounties?.toString() || '0'}
        icon={<Coins className="w-6 h-6 text-purple-400" />}
        index={2}
      />
    </div>
  );
}
