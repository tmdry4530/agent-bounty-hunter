import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Coins, Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface BountyModalProps {
  bounty: {
    id: number;
    title: string;
    reward: string;
    status: number;
    creator: number;
    hunter?: number;
    skills: string[];
    minRep: number;
    deadline: number;
  } | null;
  isConnected: boolean;
  onClose: () => void;
}

const STATUS_LABELS = ['Open', 'Claimed', 'In Progress', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Disputed', 'Paid', 'Cancelled', 'Expired'];

const LIFECYCLE_STEPS = [
  { label: 'Open', status: 0 },
  { label: 'Claimed', status: 1 },
  { label: 'Submitted', status: 3 },
  { label: 'Approved', status: 5 },
  { label: 'Paid', status: 8 },
];

export default function BountyModal({ bounty, isConnected, onClose }: BountyModalProps) {
  if (!bounty) return null;

  const currentStepIndex = LIFECYCLE_STEPS.findIndex(step => step.status === bounty.status);
  const timeLeft = bounty.deadline - Date.now();
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

  const getActionButton = () => {
    if (!isConnected) {
      return (
        <button className="w-full py-3 px-6 bg-gray-700 text-gray-400 rounded-lg font-semibold cursor-not-allowed">
          Connect Wallet to Interact
        </button>
      );
    }

    switch (bounty.status) {
      case 0: // Open
        return (
          <button className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all">
            Claim Bounty
          </button>
        );
      case 1: // Claimed
      case 2: // In Progress
        return (
          <button className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all">
            Submit Work
          </button>
        );
      case 3: // Submitted
        return (
          <div className="flex gap-3">
            <button className="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg font-semibold transition-all">
              Approve
            </button>
            <button className="flex-1 py-3 px-6 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg font-semibold transition-all">
              Reject
            </button>
          </div>
        );
      case 5: // Approved
        return (
          <button className="w-full py-3 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all">
            Release Payment
          </button>
        );
      case 8: // Paid
        return (
          <div className="w-full py-3 px-6 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg font-semibold text-center flex items-center justify-center gap-2">
            <CheckCircle size={20} />
            Bounty Completed
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 border border-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">{bounty.title}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Bounty #{bounty.id}</span>
                <span>•</span>
                <span>by Agent #{bounty.creator}</span>
                {bounty.hunter && (
                  <>
                    <span>•</span>
                    <span>claimed by Agent #{bounty.hunter}</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Reward */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <Coins className="text-purple-400" size={32} />
                <div>
                  <div className="text-sm text-gray-400 mb-1">Reward</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {bounty.reward}
                    </span>
                    <span className="text-gray-400">USDC</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lifecycle Stepper */}
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Bounty Lifecycle</h3>
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute top-5 left-0 right-0 h-1 bg-gray-700">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${(currentStepIndex / (LIFECYCLE_STEPS.length - 1)) * 100}%` }}
                  />
                </div>

                {/* Steps */}
                <div className="relative flex justify-between">
                  {LIFECYCLE_STEPS.map((step, idx) => {
                    const isActive = idx === currentStepIndex;
                    const isCompleted = idx < currentStepIndex;
                    const isFuture = idx > currentStepIndex;

                    return (
                      <div key={step.status} className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 transition-all ${
                            isActive
                              ? 'border-purple-500 bg-purple-500 text-white scale-110'
                              : isCompleted
                              ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                              : 'border-gray-700 bg-gray-800 text-gray-500'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle size={20} />
                          ) : (
                            <span className="text-sm font-bold">{idx + 1}</span>
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            isActive ? 'text-purple-400' : isFuture ? 'text-gray-500' : 'text-gray-400'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Status */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Current Status:</span>
                  <span className="text-white font-semibold">{STATUS_LABELS[bounty.status]}</span>
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Requirements</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="text-purple-400" size={18} />
                    <span className="text-sm text-gray-400">Minimum Reputation</span>
                  </div>
                  <span className="text-2xl font-bold text-white">{bounty.minRep}</span>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="text-purple-400" size={18} />
                    <span className="text-sm text-gray-400">Time Remaining</span>
                  </div>
                  <span className={`text-2xl font-bold ${daysLeft <= 2 ? 'text-red-400' : 'text-white'}`}>
                    {daysLeft} days
                  </span>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {bounty.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-sm text-purple-300 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4">
              {getActionButton()}
            </div>

            {/* Warning for disconnected state */}
            {!isConnected && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-amber-300">
                  Connect your wallet to claim bounties, submit work, or manage your bounties.
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
