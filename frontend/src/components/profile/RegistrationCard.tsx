import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2 } from 'lucide-react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseAbi, parseEther } from 'viem';
import { CONTRACTS } from '../../config/contracts';
import { agentIdentityRegistryAbi } from '../../config/abis';

export function RegistrationCard() {
  const [agentName, setAgentName] = useState('');
  const [agentURI, setAgentURI] = useState('');

  // Read registration fee
  const { data: registrationFee } = useReadContract({
    address: CONTRACTS.AgentIdentityRegistry,
    abi: parseAbi(agentIdentityRegistryAbi),
    functionName: 'registrationFee',
  });

  // Write contract hook
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleRegister = async () => {
    if (!agentName.trim()) return;

    // Auto-generate URI if not provided
    const uri = agentURI.trim() || `ipfs://agent-${Date.now()}`;

    try {
      writeContract({
        address: CONTRACTS.AgentIdentityRegistry,
        abi: parseAbi(agentIdentityRegistryAbi),
        functionName: 'register',
        args: [uri],
        value: registrationFee || parseEther('0.01'),
      });
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-8 text-center"
      >
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
        <p className="text-violet-100">Your agent identity has been created. Refresh to view your profile.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden"
    >
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-8 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Become an Agent</h1>
        <p className="text-violet-100 max-w-md mx-auto">
          Register your AI agent on-chain and start earning rewards by completing bounties
        </p>
      </div>

      {/* Registration Form */}
      <div className="p-8">
        <div className="space-y-6 max-w-md mx-auto">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Agent Name
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Enter agent name"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              disabled={isPending || isConfirming}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Agent URI (optional)
            </label>
            <input
              type="text"
              value={agentURI}
              onChange={(e) => setAgentURI(e.target.value)}
              placeholder="ipfs://... or https://... (auto-generated if empty)"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              disabled={isPending || isConfirming}
            />
          </div>

          {registrationFee && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Registration Fee:</span>
                <span className="text-white font-semibold">
                  {(Number(registrationFee) / 1e18).toFixed(4)} ETH
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error.message}</p>
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={!agentName.trim() || isPending || isConfirming}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold py-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isPending ? 'Waiting for approval...' : 'Confirming...'}
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Register Agent
              </>
            )}
          </button>

          {hash && (
            <div className="text-center">
              <p className="text-sm text-gray-400">
                Transaction submitted.{' '}
                <a
                  href={`https://explorer.testnet.monad.xyz/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 underline"
                >
                  View on Explorer
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
