import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, Clock, CheckCircle, XCircle, Coins } from 'lucide-react';

interface BountyHistoryProps {
  agentId: bigint;
}

// Mock data - replace with actual contract reads
const mockCreatedBounties = [
  {
    id: 1,
    title: 'Build React Component Library',
    reward: '500.00 USDC',
    status: 'completed',
    date: '2024-01-15',
  },
  {
    id: 2,
    title: 'Smart Contract Audit',
    reward: '1,200.00 USDC',
    status: 'in_progress',
    date: '2024-01-18',
  },
  {
    id: 3,
    title: 'API Integration',
    reward: '300.00 USDC',
    status: 'open',
    date: '2024-01-20',
  },
];

const mockHuntedBounties = [
  {
    id: 4,
    title: 'Optimize Database Queries',
    reward: '400.00 USDC',
    status: 'completed',
    date: '2024-01-12',
    rating: 5,
  },
  {
    id: 5,
    title: 'Design Landing Page',
    reward: '600.00 USDC',
    status: 'completed',
    date: '2024-01-10',
    rating: 4,
  },
  {
    id: 6,
    title: 'Write Technical Docs',
    reward: '250.00 USDC',
    status: 'submitted',
    date: '2024-01-19',
  },
  {
    id: 7,
    title: 'Bug Fix - Payment Flow',
    reward: '350.00 USDC',
    status: 'in_progress',
    date: '2024-01-21',
  },
];

export function BountyHistory({ agentId: _agentId }: BountyHistoryProps) {
  const [activeTab, setActiveTab] = useState<'created' | 'hunted'>('hunted');

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      completed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
      in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Clock },
      submitted: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Target },
      open: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Trophy },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
    };

    const style = styles[status] || styles.open;
    const Icon = style.icon;

    return (
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${style.bg} ${style.text} text-xs font-medium`}>
        <Icon className="w-3.5 h-3.5" />
        {status.replace('_', ' ').toUpperCase()}
      </div>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.div
            key={star}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: star * 0.05 }}
          >
            <svg
              className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-700 text-gray-700'}`}
              viewBox="0 0 20 20"
            >
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
          </motion.div>
        ))}
      </div>
    );
  };

  const bounties = activeTab === 'created' ? mockCreatedBounties : mockHuntedBounties;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden"
    >
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-4">Bounty History</h2>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('hunted')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'hunted'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
            }`}
          >
            Hunted
          </button>
          <button
            onClick={() => setActiveTab('created')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'created'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
            }`}
          >
            Created
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-800">
        {bounties.map((bounty, index) => (
          <motion.div
            key={bounty.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-6 hover:bg-gray-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-white">{bounty.title}</h3>
                  {getStatusBadge(bounty.status)}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4" />
                    <span className="font-medium text-green-400">{bounty.reward}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(bounty.date).toLocaleDateString()}</span>
                  </div>
                  {'rating' in bounty && typeof (bounty as any).rating === 'number' && (
                    <div className="flex items-center gap-1.5">
                      {renderStars((bounty as any).rating)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {bounties.length === 0 && (
        <div className="p-12 text-center">
          <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No bounties {activeTab === 'created' ? 'created' : 'hunted'} yet</p>
        </div>
      )}
    </motion.div>
  );
}
