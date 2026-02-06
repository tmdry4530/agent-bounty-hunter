import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

export function NetworkStatus() {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-gray-900 border border-purple-500/20 rounded-lg p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-4">{t('dashboard.networkStatus')}</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">{t('dashboard.connectedTo')}</span>
          <span className="text-white font-medium">{t('dashboard.monadTestnet')}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">{t('dashboard.chainId')}</span>
          <span className="text-white font-medium">10143</span>
        </div>

        <div className="pt-2 border-t border-gray-800">
          <a
            href="https://testnet.monadscan.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors text-sm"
          >
            <span>{t('dashboard.viewExplorer')}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
