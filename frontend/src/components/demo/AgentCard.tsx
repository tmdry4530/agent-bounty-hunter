import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AgentCardProps {
  name: string;
  agentId: string;
  color: 'purple' | 'blue';
  status: string;
  isActive: boolean;
}

export function AgentCard({ name, agentId, color, status, isActive }: AgentCardProps) {
  const { t } = useTranslation();
  const colorClasses = {
    purple: 'from-purple-600 to-violet-600',
    blue: 'from-blue-600 to-cyan-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl border p-6 backdrop-blur-sm ${
        isActive
          ? 'border-purple-500/50 bg-purple-950/20 shadow-lg shadow-purple-500/20'
          : 'border-white/10 bg-white/5'
      }`}
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-purple-500/50"
          animate={{
            boxShadow: [
              '0 0 20px rgba(168, 85, 247, 0.3)',
              '0 0 40px rgba(168, 85, 247, 0.5)',
              '0 0 20px rgba(168, 85, 247, 0.3)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div className="flex items-start gap-4">
        <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <User className="w-8 h-8 text-white" />
          {isActive && (
            <motion.div
              className="absolute inset-0 rounded-full bg-white/20"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{name}</h3>
          <p className="text-sm text-gray-400">{agentId}</p>

          <div className="mt-3 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-600'}`}>
              {isActive && (
                <motion.div
                  className="w-2 h-2 rounded-full bg-green-500"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
            <span className="text-sm text-gray-400">{isActive ? t('demo.active') : t('demo.idle')}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-black/30 border border-white/5">
        <p className="text-sm text-gray-300">{status}</p>
      </div>
    </motion.div>
  );
}
