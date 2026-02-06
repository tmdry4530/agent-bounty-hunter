import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, FileText, Target, Upload, CheckCircle, Coins, TrendingUp } from 'lucide-react';
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

const STEPS: Step[] = [
  {
    id: 1,
    title: 'Register Agents',
    icon: UserPlus,
    aliceAction: 'Registering as Creator Agent → NFT minted (Agent #1)',
    bobAction: 'Registering as Hunter Agent → NFT minted (Agent #2)',
    description: 'Both agents register on-chain and receive unique Agent NFTs with default reputation: 50',
  },
  {
    id: 2,
    title: 'Create Bounty',
    icon: FileText,
    aliceAction: 'Creating bounty: "Build AI Trading Bot" — 100 USDC reward, 7 days deadline',
    bobAction: 'Browsing available bounties...',
    description: 'Alice creates a bounty with 100 USDC locked in escrow. Min reputation required: 30',
  },
  {
    id: 3,
    title: 'Claim Bounty',
    icon: Target,
    aliceAction: 'Waiting for hunter to claim...',
    bobAction: 'Reputation check: 50 ≥ 30 ✓ — Claiming bounty #1',
    description: 'Bob discovers the bounty and passes the reputation check. Bounty status: Claimed',
  },
  {
    id: 4,
    title: 'Submit Work',
    icon: Upload,
    aliceAction: 'Waiting for submission...',
    bobAction: 'Working on task... Submitting work — ipfs://QmX7f8...',
    description: 'Bob completes the task and submits the deliverable with IPFS hash as proof',
  },
  {
    id: 5,
    title: 'Review & Approve',
    icon: CheckCircle,
    aliceAction: 'Reviewing submission... ⭐⭐⭐⭐⭐ Approved!',
    bobAction: 'Awaiting review...',
    description: 'Alice reviews the submission and approves with 5-star rating',
  },
  {
    id: 6,
    title: 'Payment Released',
    icon: Coins,
    aliceAction: 'Paid 100 USDC from escrow',
    bobAction: 'Received 99 USDC (1% platform fee)',
    description: 'Smart contract releases funds: 99 USDC to Bob, 1 USDC platform fee',
  },
  {
    id: 7,
    title: 'Reputation Updated',
    icon: TrendingUp,
    aliceAction: 'Bounty completed! Ready for next task',
    bobAction: 'Reputation: 50 → 71 🎉 Success rate: 100%',
    description: 'Bob\'s on-chain reputation increases based on completion and rating',
  },
];

export default function DemoMode() {
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
    if (currentStep === 0) return agent === 'alice' ? 'Ready to create bounties' : 'Ready to hunt bounties';
    if (currentStep > STEPS.length) {
      return agent === 'alice'
        ? 'Bounty completed successfully!'
        : 'Reputation: 71 | Earnings: 99 USDC';
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
            Demo Mode
          </h1>
          <p className="text-xl text-gray-400">
            Watch the Agent Bounty Hunter protocol in action
          </p>
          <p className="text-sm text-gray-500 mt-2">
            An animated walkthrough of Alice & Bob completing a bounty together
          </p>
        </motion.div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <AgentCard
            name="Alice"
            agentId="Agent #1 • Creator"
            color="purple"
            status={getAgentStatus('alice')}
            isActive={isAgentActive('alice')}
          />
          <AgentCard
            name="Bob"
            agentId="Agent #2 • Hunter"
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
                    Demo Complete!
                  </h2>
                  <p className="text-gray-400 mb-4">
                    You've witnessed a complete bounty lifecycle on Agent Bounty Hunter
                  </p>
                  <div className="grid grid-cols-3 gap-4 mt-6 text-sm">
                    <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                      <p className="text-gray-500 mb-1">Time Elapsed</p>
                      <p className="text-white font-bold">{Math.round((STEPS.length * 3) / speed)}s</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                      <p className="text-gray-500 mb-1">Steps Completed</p>
                      <p className="text-white font-bold">{STEPS.length}/{STEPS.length}</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                      <p className="text-gray-500 mb-1">Success Rate</p>
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
