import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ControlBarProps {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
  onPlayPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

export function ControlBar({
  isPlaying,
  currentStep,
  totalSteps,
  speed,
  onPlayPause,
  onReset,
  onSpeedChange,
}: ControlBarProps) {
  const { t } = useTranslation();
  const speedOptions = [1, 2, 3];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky bottom-6 left-0 right-0 mx-auto max-w-4xl"
    >
      <div className="rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-2xl p-6">
        <div className="flex items-center justify-between gap-6">
          {/* Main Controls */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onPlayPause}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all ${
                isPlaying
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                  : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/30'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  {t('demo.pause')}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  {currentStep === 0 ? t('demo.startDemo') : t('demo.resume')}
                </>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              {t('demo.reset')}
            </motion.button>
          </div>

          {/* Progress Indicator */}
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-400">
                {currentStep === 0 ? t('demo.readyToStart') : currentStep > totalSteps ? t('demo.completeStatus') : t('demo.stepOf', { current: currentStep, total: totalSteps })}
              </span>
              <span className="text-sm font-medium text-purple-400">
                {Math.round((currentStep / totalSteps) * 100)}%
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-600 to-violet-600"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
              {isPlaying && currentStep <= totalSteps && (
                <motion.div
                  className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </div>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-gray-400" />
            <div className="flex gap-1">
              {speedOptions.map((option) => (
                <motion.button
                  key={option}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSpeedChange(option)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    speed === option
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {option}x
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
