import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProfileHeaderProps {
  agentId: bigint;
  walletAddress: string;
  agentURI: string;
  reputationScore: number;
}

export function ProfileHeader({ agentId, walletAddress, agentURI, reputationScore }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 60) return 'text-green-400';
    if (score >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 60) return 'from-green-500 to-emerald-600';
    if (score >= 30) return 'from-yellow-500 to-orange-600';
    return 'from-red-500 to-pink-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden"
    >
      <div className="bg-gradient-to-br from-violet-600 to-purple-700 h-32" />

      <div className="px-8 pb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 -mt-16">
          {/* Left: Agent Info */}
          <div className="flex items-end gap-4">
            <div className={`w-32 h-32 bg-gradient-to-br ${getScoreGradient(reputationScore)} rounded-2xl border-4 border-gray-900 flex items-center justify-center shadow-xl`}>
              <div className="text-center">
                <div className="text-4xl font-bold text-white">#{agentId.toString()}</div>
                <div className="text-xs text-white/80 font-medium">{t('profile.agent')}</div>
              </div>
            </div>

            <div className="pb-2">
              <h1 className="text-3xl font-bold text-white mb-2">{t('profile.agentId', { id: agentId.toString() })}</h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-750 rounded-lg border border-gray-700 transition-colors"
                >
                  <span className="text-gray-300 font-mono text-sm">{truncateAddress(walletAddress)}</span>
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                <a
                  href={agentURI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-750 rounded-lg border border-gray-700 transition-colors flex items-center gap-2"
                >
                  <span className="text-gray-300 text-sm">{t('profile.agentUriLabel')}</span>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Right: Reputation Score */}
          <div className="flex items-center gap-4 lg:pb-2">
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">{t('profile.reputationScore')}</div>
              <div className={`text-4xl font-bold ${getScoreColor(reputationScore)}`}>
                {reputationScore}
              </div>
            </div>

            {/* Circular Progress */}
            <div className="relative w-24 h-24">
              <svg className="transform -rotate-90 w-24 h-24">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-800"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - reputationScore / 100)}`}
                  className={reputationScore >= 60 ? 'text-green-500' : reputationScore >= 30 ? 'text-yellow-500' : 'text-red-500'}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${getScoreColor(reputationScore)}`}>
                  {reputationScore}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
