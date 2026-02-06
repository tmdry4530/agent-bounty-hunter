import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowRight, Target, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

export function QuickActions() {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="bg-gray-900 border border-purple-500/20 rounded-lg p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.quickActions')}</h3>

      <div className="space-y-3">
        <Link to="/bounties">
          <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-between group">
            <span className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              {t('dashboard.createBounty')}
            </span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </Link>

        <Link to="/profile">
          <button className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-between group border border-purple-500/20 hover:border-purple-500/40">
            <span className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              {t('dashboard.registerAgent')}
            </span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
