import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, FileText, Target, Upload, CheckCircle, Coins, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AgentCard } from '../components/demo/AgentCard';
import { TimelineStep } from '../components/demo/TimelineStep';
import { ControlBar } from '../components/demo/ControlBar';
import { TokenTransferAnimation } from '../components/demo/TokenTransferAnimation';

interface Step {
  id: number;
  title: string;
  icon: typeof UserPlus;
  aliceAction: string;
  bobAction: string;
  description?: string;
}

export default function DemoMode() {
  const { t } = useTranslation();

  const ICONS = [UserPlus, FileText, Target, Upload, CheckCircle, Coins, TrendingUp];

  const STEPS: Step[] = [1, 2, 3, 4, 5, 6, 7].map(id => ({
    id,
    title: t(`demo.steps.${id}.title`),
    icon: ICONS[id - 1],
    aliceAction: t(`demo.steps.${id}.aliceAction`),
    bobAction: t(`demo.steps.${id}.bobAction`),
    description: t(`demo.steps.${id}.description`),
  }));
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showTokenTransfer, setShowTokenTransfer] = useState(false);
  const [tokenTransferProps, setTokenTransferProps] = useState<{
    from: 'alice' | 'escrow';
    to: 'escrow' | 'bob';
    amount: number;
  }>({ from: 'alice', to: 'escrow', amount: 100 });

  // Auto-advance steps
  useEffect(() => {
    if (!isPlaying || currentStep > STEPS.length) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;

        // Trigger token animations
        if (next === 2) {
          // Alice → Escrow
          setTokenTransferProps({ from: 'alice', to: 'escrow', amount: 100 });
          setShowTokenTransfer(true);
          setTimeout(() => setShowTokenTransfer(false), 2000);
        } else if (next === 6) {
          // Escrow → Bob
          setTokenTransferProps({ from: 'escrow', to: 'bob', amount: 99 });
          setShowTokenTransfer(true);
          setTimeout(() => setShowTokenTransfer(false), 2000);
        }

        if (next > STEPS.length) {
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, (3000 / speed));

    return () => clearInterval(interval);
  }, [isPlaying, currentStep, speed]);

  const handlePlayPause = () => {
    if (currentStep === 0) {
      setCurrentStep(1);
      setIsPlaying(true);
    } else if (currentStep > STEPS.length) {
      handleReset();
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setShowTokenTransfer(false);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
  };

  const getStepStatus = (stepId: number): 'completed' | 'active' | 'pending' => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'active';
    return 'pending';
  };

  const getAgentStatus = (agent: 'alice' | 'bob'): string => {
    if (currentStep === 0) return agent === 'alice' ? t('demo.agentStatus.aliceReady') : t('demo.agentStatus.bobReady');
    if (currentStep > STEPS.length) {
      return agent === 'alice'
        ? t('demo.agentStatus.aliceComplete')
        : t('demo.agentStatus.bobComplete');
    }

    const step = STEPS[currentStep - 1];
    return agent === 'alice' ? step.aliceAction : step.bobAction;
  };

  const isAgentActive = (agent: 'alice' | 'bob'): boolean => {
    if (currentStep === 0 || currentStep > STEPS.length) return false;

    // Determine which agent is primarily active in this step
    if (currentStep === 1) return true; // Both register
    if (currentStep === 2) return agent === 'alice'; // Alice creates
    if (currentStep === 3) return agent === 'bob'; // Bob claims
    if (currentStep === 4) return agent === 'bob'; // Bob submits
    if (currentStep === 5) return agent === 'alice'; // Alice reviews
    if (currentStep === 6) return true; // Payment to both
    if (currentStep === 7) return agent === 'bob'; // Bob's reputation updates

    return false;
  };

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-violet-600 bg-clip-text text-transparent">
            {t('demo.title')}
          </h1>
          <p className="text-xl text-gray-400">
            {t('demo.subtitle')}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {t('demo.description')}
          </p>
        </motion.div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <AgentCard
            name="Alice"
            agentId={t('demo.aliceCreator')}
            color="purple"
            status={getAgentStatus('alice')}
            isActive={isAgentActive('alice')}
          />
          <AgentCard
            name="Bob"
            agentId={t('demo.bobHunter')}
            color="blue"
            status={getAgentStatus('bob')}
            isActive={isAgentActive('bob')}
          />
        </div>

        {/* Timeline */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-0"
          >
            {STEPS.map((step) => (
              <TimelineStep
                key={step.id}
                step={step.id}
                title={step.title}
                icon={step.icon}
                status={getStepStatus(step.id)}
                aliceAction={step.aliceAction}
                bobAction={step.bobAction}
                description={step.description}
              />
            ))}
          </motion.div>

          {/* Completion Message */}
          <AnimatePresence>
            {currentStep > STEPS.length && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mt-12 text-center"
              >
                <div className="inline-block rounded-2xl border border-green-500/50 bg-gradient-to-br from-green-950/50 to-emerald-950/50 p-8 backdrop-blur-sm">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center"
                  >
                    <CheckCircle className="w-8 h-8 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-green-400 mb-2">
                    {t('demo.complete')}
                  </h2>
                  <p className="text-gray-400 mb-4">
                    {t('demo.completeDesc')}
                  </p>
                  <div className="grid grid-cols-3 gap-4 mt-6 text-sm">
                    <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                      <p className="text-gray-500 mb-1">{t('demo.timeElapsed')}</p>
                      <p className="text-white font-bold">{Math.round((STEPS.length * 3) / speed)}s</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                      <p className="text-gray-500 mb-1">{t('demo.stepsCompleted')}</p>
                      <p className="text-white font-bold">{STEPS.length}/{STEPS.length}</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                      <p className="text-gray-500 mb-1">{t('demo.successRate')}</p>
                      <p className="text-white font-bold">100%</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Token Transfer Animation */}
      <AnimatePresence>
        {showTokenTransfer && (
          <TokenTransferAnimation
            isVisible={showTokenTransfer}
            from={tokenTransferProps.from}
            to={tokenTransferProps.to}
            amount={tokenTransferProps.amount}
          />
        )}
      </AnimatePresence>

      {/* Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-4">
        <ControlBar
          isPlaying={isPlaying}
          currentStep={currentStep}
          totalSteps={STEPS.length}
          speed={speed}
          onPlayPause={handlePlayPause}
          onReset={handleReset}
          onSpeedChange={handleSpeedChange}
        />
      </div>
    </div>
  );
}
