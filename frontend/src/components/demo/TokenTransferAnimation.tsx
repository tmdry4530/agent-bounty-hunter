import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';

interface TokenTransferAnimationProps {
  isVisible: boolean;
  from: 'alice' | 'escrow';
  to: 'escrow' | 'bob';
  amount: number;
}

export function TokenTransferAnimation({ isVisible, from, to, amount }: TokenTransferAnimationProps) {
  if (!isVisible) return null;

  const getAnimationPath = () => {
    if (from === 'alice' && to === 'escrow') {
      return { x: [0, 200], y: [0, -50, 0] };
    } else if (from === 'escrow' && to === 'bob') {
      return { x: [0, 200], y: [0, -50, 0] };
    }
    return { x: [0, 400], y: [0, -100, 0] };
  };

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative"
        initial={{ scale: 0, ...getAnimationPath() }}
        animate={{
          scale: [0, 1.2, 1, 1.2, 0],
          ...getAnimationPath()
        }}
        transition={{ duration: 2, ease: "easeInOut" }}
      >
        <div className="relative">
          {/* Glow Effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-purple-500/50 blur-xl"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />

          {/* Coin */}
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center border-4 border-yellow-300 shadow-2xl">
            <Coins className="w-8 h-8 text-white" />
          </div>

          {/* Amount Label */}
          <motion.div
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full border border-purple-500/50"
            animate={{ y: [-5, 0, -5] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <span className="text-sm font-bold text-yellow-400">{amount} USDC</span>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
