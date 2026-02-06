import { motion } from 'framer-motion';
import { Clock, Coins, Shield, ChevronRight } from 'lucide-react';

interface BountyCardProps {
  bounty: {
    id: number;
    title: string;
    reward: string;
    status: number;
    creator: number;
    hunter?: number;
    skills: string[];
    minRep: number;
    deadline: number;
  };
  onClick: () => void;
}

const STATUS_LABELS = ['Open', 'Claimed', 'In Progress', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Disputed', 'Paid', 'Cancelled', 'Expired'];

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  1: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  3: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  4: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  5: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  6: 'bg-red-500/20 text-red-400 border-red-500/30',
  7: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  8: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  9: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  10: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function BountyCard({ bounty, onClick }: BountyCardProps) {
  const timeLeft = bounty.deadline - Date.now();
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 cursor-pointer hover:border-purple-500/50 transition-all duration-300 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-2">
          {bounty.title}
        </h3>
        <ChevronRight className="text-gray-600 group-hover:text-purple-500 transition-colors flex-shrink-0 ml-2" size={20} />
      </div>

      {/* Reward */}
      <div className="flex items-center gap-2 mb-4">
        <Coins className="text-purple-400" size={24} />
        <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          {bounty.reward}
        </span>
        <span className="text-gray-400 text-sm">USDC</span>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {bounty.skills.map((skill, idx) => (
          <span
            key={idx}
            className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-xs text-purple-300"
          >
            {skill}
          </span>
        ))}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-sm text-gray-400 pt-4 border-t border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Shield size={14} />
            <span>Rep: {bounty.minRep}+</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span className={daysLeft <= 2 ? 'text-red-400' : ''}>
              {daysLeft}d left
            </span>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-xs border ${STATUS_COLORS[bounty.status] || STATUS_COLORS[0]}`}>
          {STATUS_LABELS[bounty.status]}
        </div>
      </div>

      {/* Creator */}
      <div className="mt-3 text-xs text-gray-500">
        by Agent #{bounty.creator}
      </div>
    </motion.div>
  );
}
