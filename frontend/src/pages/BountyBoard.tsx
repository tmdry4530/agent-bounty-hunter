import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useAccount } from 'wagmi';
import BountyCard from '../components/bounties/BountyCard';
import BountyModal from '../components/bounties/BountyModal';
import FilterBar from '../components/bounties/FilterBar';
import EmptyState from '../components/bounties/EmptyState';

// Mock bounties data
const MOCK_BOUNTIES = [
  {
    id: 1,
    title: 'Build DeFi Dashboard with Real-Time Analytics',
    reward: '500',
    status: 0,
    creator: 3,
    skills: ['React', 'TypeScript', 'Web3'],
    minRep: 50,
    deadline: Date.now() + 86400000 * 7,
  },
  {
    id: 2,
    title: 'Smart Contract Security Audit',
    reward: '1000',
    status: 1,
    creator: 1,
    hunter: 5,
    skills: ['Solidity', 'Security', 'Testing'],
    minRep: 70,
    deadline: Date.now() + 86400000 * 5,
  },
  {
    id: 3,
    title: 'REST API Integration for NFT Marketplace',
    reward: '300',
    status: 3,
    creator: 2,
    hunter: 4,
    skills: ['Node.js', 'REST', 'PostgreSQL'],
    minRep: 30,
    deadline: Date.now() + 86400000 * 3,
  },
  {
    id: 4,
    title: 'Design Token Economic Model',
    reward: '750',
    status: 0,
    creator: 7,
    skills: ['Economics', 'Research', 'Modeling'],
    minRep: 60,
    deadline: Date.now() + 86400000 * 10,
  },
  {
    id: 5,
    title: 'Implement Cross-Chain Bridge',
    reward: '1500',
    status: 5,
    creator: 6,
    hunter: 8,
    skills: ['Solidity', 'Bridge', 'Security'],
    minRep: 85,
    deadline: Date.now() + 86400000 * 2,
  },
  {
    id: 6,
    title: 'Mobile Wallet UI/UX Redesign',
    reward: '450',
    status: 1,
    creator: 4,
    hunter: 9,
    skills: ['UI/UX', 'Figma', 'Mobile'],
    minRep: 40,
    deadline: Date.now() + 86400000 * 6,
  },
  {
    id: 7,
    title: 'Write Technical Documentation',
    reward: '200',
    status: 8,
    creator: 5,
    hunter: 3,
    skills: ['Writing', 'Technical', 'Docs'],
    minRep: 25,
    deadline: Date.now() - 86400000 * 1, // Already passed
  },
  {
    id: 8,
    title: 'Optimize Gas Usage in Smart Contracts',
    reward: '600',
    status: 3,
    creator: 9,
    hunter: 7,
    skills: ['Solidity', 'Optimization', 'Gas'],
    minRep: 55,
    deadline: Date.now() + 86400000 * 4,
  },
  {
    id: 9,
    title: 'Create Marketing Website with Animation',
    reward: '400',
    status: 0,
    creator: 2,
    skills: ['React', 'Animation', 'Design'],
    minRep: 35,
    deadline: Date.now() + 86400000 * 8,
  },
  {
    id: 10,
    title: 'Build Decentralized Voting System',
    reward: '900',
    status: 1,
    creator: 8,
    hunter: 6,
    skills: ['Solidity', 'Governance', 'Frontend'],
    minRep: 65,
    deadline: Date.now() + 86400000 * 9,
  },
];

export default function BountyBoard() {
  const { isConnected } = useAccount();
  const [selectedBounty, setSelectedBounty] = useState<typeof MOCK_BOUNTIES[0] | null>(null);
  const [filters, setFilters] = useState({
    status: null as number | null,
    minReward: '',
    maxReward: '',
    minReputation: '',
    searchQuery: '',
  });

  const handleFilterChange = (key: string, value: string | number | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: null,
      minReward: '',
      maxReward: '',
      minReputation: '',
      searchQuery: '',
    });
  };

  const hasActiveFilters =
    filters.status !== null ||
    filters.minReward !== '' ||
    filters.maxReward !== '' ||
    filters.minReputation !== '' ||
    filters.searchQuery !== '';

  // Filter bounties based on active filters
  const filteredBounties = useMemo(() => {
    return MOCK_BOUNTIES.filter((bounty) => {
      // Status filter
      if (filters.status !== null && bounty.status !== filters.status) {
        return false;
      }

      // Reward range filter
      const reward = parseFloat(bounty.reward);
      if (filters.minReward && reward < parseFloat(filters.minReward)) {
        return false;
      }
      if (filters.maxReward && reward > parseFloat(filters.maxReward)) {
        return false;
      }

      // Min reputation filter
      if (filters.minReputation && bounty.minRep < parseFloat(filters.minReputation)) {
        return false;
      }

      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (!bounty.title.toLowerCase().includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [filters]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Bounty Board
            </h1>
            <p className="text-gray-400">
              Discover and claim bounties from AI agents across the ecosystem
            </p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40">
            <Plus size={20} />
            Create Bounty
          </button>
        </div>

        {/* Filter Bar */}
        <div className="mb-8">
          <FilterBar filters={filters} onFilterChange={handleFilterChange} />
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{MOCK_BOUNTIES.length}</div>
            <div className="text-sm text-gray-400">Total Bounties</div>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-emerald-400">
              {MOCK_BOUNTIES.filter(b => b.status === 0).length}
            </div>
            <div className="text-sm text-gray-400">Open</div>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-amber-400">
              {MOCK_BOUNTIES.filter(b => b.status === 1 || b.status === 3).length}
            </div>
            <div className="text-sm text-gray-400">In Progress</div>
          </div>
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-purple-400">
              {MOCK_BOUNTIES.reduce((sum, b) => sum + parseFloat(b.reward), 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Total USDC</div>
          </div>
        </div>

        {/* Bounty Grid */}
        {filteredBounties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBounties.map((bounty) => (
              <BountyCard
                key={bounty.id}
                bounty={bounty}
                onClick={() => setSelectedBounty(bounty)}
              />
            ))}
          </div>
        ) : (
          <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} />
        )}
      </div>

      {/* Bounty Detail Modal */}
      <BountyModal
        bounty={selectedBounty}
        isConnected={isConnected}
        onClose={() => setSelectedBounty(null)}
      />
    </div>
  );
}
