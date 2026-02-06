import { motion } from 'framer-motion';
import { CheckCircle, type LucideIcon } from 'lucide-react';

interface TimelineStepProps {
  step: number;
  title: string;
  icon: LucideIcon;
  status: 'completed' | 'active' | 'pending';
  aliceAction?: string;
  bobAction?: string;
  description?: string;
}

export function TimelineStep({
  step,
  title,
  icon: Icon,
  status,
  aliceAction,
  bobAction,
  description
}: TimelineStepProps) {
  const isCompleted = status === 'completed';
  const isActive = status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: step * 0.1 }}
      className="relative"
    >
      <div className="flex items-start gap-4">
        {/* Step Indicator */}
        <div className="relative flex flex-col items-center">
          <motion.div
            className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center ${
              isCompleted
                ? 'border-green-500 bg-green-950/50'
                : isActive
                ? 'border-purple-500 bg-purple-950/50'
                : 'border-gray-700 bg-gray-900/50'
            }`}
            animate={
              isActive
                ? {
                    boxShadow: [
                      '0 0 20px rgba(168, 85, 247, 0.3)',
                      '0 0 40px rgba(168, 85, 247, 0.6)',
                      '0 0 20px rgba(168, 85, 247, 0.3)',
                    ],
                  }
                : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
          >
            {isCompleted ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <Icon
                className={`w-6 h-6 ${
                  isActive ? 'text-purple-400' : 'text-gray-500'
                }`}
              />
            )}

            {isActive && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-purple-500"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-purple-500/20"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
              </>
            )}
          </motion.div>

          {/* Vertical Line */}
          {step < 7 && (
            <div
              className={`w-0.5 h-24 mt-2 ${
                isCompleted ? 'bg-green-500/30' : 'bg-gray-800'
              }`}
            />
          )}
        </div>

        {/* Step Content */}
        <div className="flex-1 pb-8">
          <motion.div
            className={`rounded-xl border p-6 ${
              isActive
                ? 'border-purple-500/50 bg-purple-950/20 shadow-lg shadow-purple-500/10'
                : isCompleted
                ? 'border-green-500/30 bg-green-950/10'
                : 'border-white/5 bg-white/5'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3
                className={`text-lg font-semibold ${
                  isActive ? 'text-purple-300' : isCompleted ? 'text-green-300' : 'text-gray-500'
                }`}
              >
                {title}
              </h3>
              <span
                className={`text-sm font-medium ${
                  isActive ? 'text-purple-400' : isCompleted ? 'text-green-400' : 'text-gray-600'
                }`}
              >
                Step {step}
              </span>
            </div>

            {description && (
              <p className="text-sm text-gray-400 mb-4">{description}</p>
            )}

            {/* Agent Actions */}
            {(aliceAction || bobAction) && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {aliceAction && (
                  <div className="rounded-lg border border-purple-500/20 bg-purple-950/10 p-3">
                    <p className="text-xs text-purple-400 font-medium mb-1">Alice (Creator)</p>
                    <p className="text-sm text-gray-300">{aliceAction}</p>
                  </div>
                )}
                {bobAction && (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-950/10 p-3">
                    <p className="text-xs text-blue-400 font-medium mb-1">Bob (Hunter)</p>
                    <p className="text-sm text-gray-300">{bobAction}</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
