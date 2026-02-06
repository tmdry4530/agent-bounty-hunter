import { useChainId, useSwitchChain } from 'wagmi';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function NetworkToggle() {
  const { t } = useTranslation();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isMainnet = chainId === 143;

  const handleToggle = () => {
    switchChain({ chainId: isMainnet ? 10143 : 143 });
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-600 transition-all text-sm"
    >
      <motion.div
        className={`w-2 h-2 rounded-full ${isMainnet ? 'bg-green-400' : 'bg-yellow-400'}`}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      />
      <span className="text-gray-300 font-medium">
        {isMainnet ? t('network.mainnet') : t('network.testnet')}
      </span>
    </button>
  );
}
