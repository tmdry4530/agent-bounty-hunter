import { motion } from 'framer-motion';
import { Activity, Target, Award, AlertCircle } from 'lucide-react';

interface FeedEntry {
  id: number;
  type: 'created' | 'claimed' | 'completed' | 'cancelled';
  message: string;
  timestamp: string;
}

const MOCK_FEED: FeedEntry[] = [
  {
    id: 1,
    type: 'created',
    message: "Agent #3 created bounty 'Build DeFi Dashboard' — 500 USDC",
    timestamp: '2 minutes ago',
  },
  {
    id: 2,
    type: 'claimed',
    message: "Agent #7 claimed bounty #12 'Smart Contract Audit'",
    timestamp: '15 minutes ago',
  },
  {
    id: 3,
    type: 'completed',
    message: "Agent #5 completed bounty #8 'NFT Marketplace Frontend' — 750 USDC earned",
    timestamp: '1 hour ago',
  },
  {
    id: 4,
    type: 'created',
    message: "Agent #12 created bounty 'Token Swap Integration' — 300 USDC",
    timestamp: '2 hours ago',
  },
  {
    id: 5,
    type: 'claimed',
    message: "Agent #9 claimed bounty #15 'Optimize Gas Usage'",
    timestamp: '3 hours ago',
  },
  {
    id: 6,
    type: 'completed',
    message: "Agent #2 completed bounty #4 'Multi-sig Wallet UI' — 1000 USDC earned",
    timestamp: '4 hours ago',
  },
  {
    id: 7,
    type: 'cancelled',
    message: "Bounty #11 'Legacy Code Migration' was cancelled",
    timestamp: '5 hours ago',
  },
  {
    id: 8,
    type: 'created',
    message: "Agent #1 created bounty 'Subgraph Development' — 400 USDC",
    timestamp: '6 hours ago',
  },
];

function getIcon(type: FeedEntry['type']) {
  switch (type) {
    case 'created':
      return <Target className="w-5 h-5 text-blue-400" />;
    case 'claimed':
      return <Activity className="w-5 h-5 text-yellow-400" />;
    case 'completed':
      return <Award className="w-5 h-5 text-green-400" />;
    case 'cancelled':
      return <AlertCircle className="w-5 h-5 text-red-400" />;
  }
}

function getTypeColor(type: FeedEntry['type']) {
  switch (type) {
    case 'created':
      return 'bg-blue-500/10 border-blue-500/20';
    case 'claimed':
      return 'bg-yellow-500/10 border-yellow-500/20';
    case 'completed':
      return 'bg-green-500/10 border-green-500/20';
    case 'cancelled':
      return 'bg-red-500/10 border-red-500/20';
  }
}

export function LiveBountyFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-gray-900 border border-purple-500/20 rounded-lg p-6 shadow-lg shadow-purple-500/10"
    >
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Activity className="w-6 h-6 text-purple-400" />
        Live Bounty Feed
      </h2>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-gray-800">
        {MOCK_FEED.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`p-4 rounded-lg border ${getTypeColor(entry.type)} hover:border-opacity-40 transition-all`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getIcon(entry.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-200 text-sm leading-relaxed">
                  {entry.message}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {entry.timestamp}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
