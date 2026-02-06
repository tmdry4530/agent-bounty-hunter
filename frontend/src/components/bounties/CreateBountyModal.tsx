import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbi, parseEther } from 'viem';
import { useTranslation } from 'react-i18next';
import { CONTRACTS } from '../../config/contracts';
import { bountyRegistryAbi } from '../../config/abis';

interface CreateBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateBountyModal({ isOpen, onClose }: CreateBountyModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [descriptionURI, setDescriptionURI] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('7');
  const [minReputation, setMinReputation] = useState('0');
  const [skills, setSkills] = useState('');

  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Reset form and close after successful creation
  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        handleClose();
      }, 2000);
    }
  }, [isSuccess]);

  const handleCreate = () => {
    if (!title.trim() || !rewardAmount) return;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(deadlineDays) * 86400);
    const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
    const uri = descriptionURI.trim() || `ipfs://bounty-${Date.now()}`;

    writeContract({
      address: CONTRACTS.BountyRegistry,
      abi: parseAbi(bountyRegistryAbi),
      functionName: 'createBounty',
      args: [{
        title: title.trim(),
        descriptionURI: uri,
        rewardToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        rewardAmount: parseEther(rewardAmount),
        deadline,
        minReputation: BigInt(minReputation || '0'),
        requiredSkills: skillsArray,
      }],
    });
  };

  const handleClose = () => {
    reset();
    setTitle('');
    setDescriptionURI('');
    setRewardAmount('');
    setDeadlineDays('7');
    setMinReputation('0');
    setSkills('');
    onClose();
  };

  const isFormValid = title.trim() && rewardAmount && Number(rewardAmount) > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {t('createBounty.title')}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Form */}
              <div className="p-6 space-y-6">
                {/* Success Message */}
                {isSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <p className="text-emerald-400 font-medium">
                      {t('createBounty.success')}
                    </p>
                  </motion.div>
                )}

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-400 font-medium mb-1">Transaction Failed</p>
                      <p className="text-red-400/80 text-sm">
                        {error.message.split('\n')[0]}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Bounty Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('createBounty.bountyTitle')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('createBounty.bountyTitlePlaceholder')}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    disabled={isPending || isConfirming}
                  />
                </div>

                {/* Description URI */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('createBounty.descriptionUri')}
                  </label>
                  <input
                    type="text"
                    value={descriptionURI}
                    onChange={(e) => setDescriptionURI(e.target.value)}
                    placeholder={t('createBounty.descriptionUriPlaceholder')}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    disabled={isPending || isConfirming}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional. Auto-generated if not provided.
                  </p>
                </div>

                {/* Reward Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('createBounty.rewardAmount')} <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      disabled={isPending || isConfirming}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                      MON
                    </div>
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('createBounty.deadline')}
                  </label>
                  <input
                    type="number"
                    value={deadlineDays}
                    onChange={(e) => setDeadlineDays(e.target.value)}
                    placeholder="7"
                    min="1"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    disabled={isPending || isConfirming}
                  />
                </div>

                {/* Min Reputation */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('createBounty.minReputation')}
                  </label>
                  <input
                    type="number"
                    value={minReputation}
                    onChange={(e) => setMinReputation(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    disabled={isPending || isConfirming}
                  />
                </div>

                {/* Required Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('createBounty.requiredSkills')}
                  </label>
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder={t('createBounty.requiredSkillsPlaceholder')}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    disabled={isPending || isConfirming}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate multiple skills with commas
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
                <button
                  onClick={handleClose}
                  disabled={isPending || isConfirming}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('createBounty.cancel')}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!isFormValid || isPending || isConfirming || isSuccess}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('createBounty.creating')}
                    </>
                  ) : isConfirming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t('createBounty.confirming')}
                    </>
                  ) : isSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      {t('createBounty.success')}
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      {t('createBounty.create')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
