import { Search, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

export default function EmptyState({ hasFilters, onClearFilters }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-6">
        <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center">
          <Search className="text-purple-400" size={40} />
        </div>
        <div className="absolute -top-2 -right-2 w-12 h-12 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center">
          <Filter className="text-gray-500" size={20} />
        </div>
      </div>

      <h3 className="text-xl font-bold text-white mb-2">
        {hasFilters ? t('bountyBoard.noBountiesFound') : t('bountyBoard.noBountiesAvailable')}
      </h3>

      <p className="text-gray-400 text-center max-w-md mb-6">
        {hasFilters
          ? t('bountyBoard.noMatchFilters')
          : t('bountyBoard.noBountiesYet')}
      </p>

      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          {t('bountyBoard.clearFilters')}
        </button>
      )}
    </div>
  );
}
