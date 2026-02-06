import { Search, Filter } from 'lucide-react';

interface FilterBarProps {
  filters: {
    status: number | null;
    minReward: string;
    maxReward: string;
    minReputation: string;
    searchQuery: string;
  };
  onFilterChange: (key: string, value: string | number | null) => void;
}

const STATUS_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Open', value: 0 },
  { label: 'Claimed', value: 1 },
  { label: 'Submitted', value: 3 },
  { label: 'Completed', value: 8 },
];

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-4">
      {/* Status Pills */}
      <div>
        <label className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
          <Filter size={16} />
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.label}
              onClick={() => onFilterChange('status', option.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filters.status === option.value
                  ? 'bg-purple-600 text-white border border-purple-500'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-purple-500/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Reward Range */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-gray-400 mb-2 block">
            Reward Range (USDC)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.minReward}
              onChange={(e) => onFilterChange('minReward', e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <span className="text-gray-600">to</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxReward}
              onChange={(e) => onFilterChange('maxReward', e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Min Reputation */}
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">
            Min Reputation
          </label>
          <input
            type="number"
            placeholder="0"
            value={filters.minReputation}
            onChange={(e) => onFilterChange('minReputation', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Search */}
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search title..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange('searchQuery', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
