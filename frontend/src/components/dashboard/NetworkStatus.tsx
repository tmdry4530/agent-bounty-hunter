import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

export function NetworkStatus() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-gray-900 border border-purple-500/20 rounded-lg p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-4">Network Status</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Connected to:</span>
          <span className="text-white font-medium">Monad Testnet</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Chain ID:</span>
          <span className="text-white font-medium">10143</span>
        </div>

        <div className="pt-2 border-t border-gray-800">
          <a
            href="https://testnet.monadscan.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors text-sm"
          >
            <span>View on Block Explorer</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
