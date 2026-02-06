import { motion } from 'framer-motion';
import { Star, TrendingUp, Award } from 'lucide-react';

interface ReputationDetailsProps {
  score: number;
  avgRating: number;
  completedBounties: number;
  successRate: number;
  totalRatings: number;
}

export function ReputationDetails({
  score,
  avgRating,
  completedBounties,
  successRate,
  totalRatings
}: ReputationDetailsProps) {
  // Calculate component breakdown (simplified)
  const baseScore = Math.min(avgRating * 10, 50);
  const completionBonus = Math.min(completedBounties * 2, 30);
  const successBonus = Math.min(successRate / 5, 20);

  const components = [
    {
      icon: Star,
      label: 'Base Score',
      description: 'From ratings',
      value: Math.round(baseScore),
      max: 50,
      color: 'violet',
    },
    {
      icon: Award,
      label: 'Completion Bonus',
      description: `${completedBounties} bounties completed`,
      value: Math.round(completionBonus),
      max: 30,
      color: 'green',
    },
    {
      icon: TrendingUp,
      label: 'Success Rate Bonus',
      description: `${successRate}% success rate`,
      value: Math.round(successBonus),
      max: 20,
      color: 'blue',
    },
  ];

  const getBarColor = (color: string) => {
    const colors: Record<string, string> = {
      violet: 'bg-violet-500',
      green: 'bg-green-500',
      blue: 'bg-blue-500',
    };
    return colors[color] || 'bg-gray-500';
  };

  const getBarBg = (color: string) => {
    const colors: Record<string, string> = {
      violet: 'bg-violet-500/20',
      green: 'bg-green-500/20',
      blue: 'bg-blue-500/20',
    };
    return colors[color] || 'bg-gray-500/20';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 rounded-2xl border border-gray-800 p-8"
    >
      <h2 className="text-2xl font-bold text-white mb-6">Reputation Breakdown</h2>

      <div className="space-y-6">
        {components.map((component, index) => {
          const Icon = component.icon;
          const percentage = (component.value / component.max) * 100;

          return (
            <motion.div
              key={component.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-white font-medium">{component.label}</div>
                    <div className="text-sm text-gray-400">{component.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">{component.value}</div>
                  <div className="text-xs text-gray-500">/ {component.max}</div>
                </div>
              </div>

              <div className={`h-3 ${getBarBg(component.color)} rounded-full overflow-hidden`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.6 }}
                  className={`h-full ${getBarColor(component.color)} rounded-full`}
                />
              </div>
            </motion.div>
          );
        })}

        <div className="pt-6 border-t border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-gray-400 mb-1">Total Reputation Score</div>
              <div className="text-sm text-gray-500">{totalRatings} total ratings</div>
            </div>
            <div className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              {score}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
