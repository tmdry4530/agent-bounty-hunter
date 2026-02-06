import { motion } from 'framer-motion';
import { Trophy, Coins, TrendingUp, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StatsGridProps {
  completedBounties: number;
  totalEarnings: bigint;
  successRate: number;
  avgRating: number;
}

export function StatsGrid({ completedBounties, totalEarnings, successRate, avgRating }: StatsGridProps) {
  const { t } = useTranslation();
  const formatUSDC = (amount: bigint) => {
    const usdcAmount = Number(amount) / 1e6;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(usdcAmount);
  };

  const formatRating = (rating: number) => {
    return (rating / 100).toFixed(1);
  };

  const stats = [
    {
      icon: Trophy,
      label: t('profile.completedBounties'),
      value: completedBounties.toString(),
      gradient: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-500/10 to-purple-600/10',
    },
    {
      icon: Coins,
      label: t('profile.totalEarnings'),
      value: formatUSDC(totalEarnings),
      gradient: 'from-green-500 to-emerald-600',
      bgGradient: 'from-green-500/10 to-emerald-600/10',
    },
    {
      icon: TrendingUp,
      label: t('profile.successRate'),
      value: `${successRate}%`,
      gradient: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-500/10 to-cyan-600/10',
    },
    {
      icon: Star,
      label: t('profile.averageRating'),
      value: `${formatRating(avgRating)} / 5.0`,
      gradient: 'from-yellow-500 to-orange-600',
      bgGradient: 'from-yellow-500/10 to-orange-600/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-900 rounded-xl border border-gray-800 p-6 hover:border-gray-700 transition-colors"
          >
            <div className={`w-12 h-12 bg-gradient-to-br ${stat.bgGradient} rounded-lg flex items-center justify-center mb-4`}>
              <Icon className={`w-6 h-6 bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent' }} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
