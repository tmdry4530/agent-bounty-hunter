import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const isKo = i18n.language === 'ko';

  const toggleLanguage = () => {
    i18n.changeLanguage(isKo ? 'en' : 'ko');
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleLanguage}
      className="relative flex items-center w-16 h-8 rounded-full bg-gray-800 border border-gray-700 hover:border-purple-500/50 transition-colors cursor-pointer"
      title={isKo ? 'Switch to English' : '한국어로 전환'}
    >
      <motion.div
        className="absolute w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg"
        animate={{ x: isKo ? 32 : 2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {isKo ? '한' : 'EN'}
      </motion.div>
      <span className="absolute left-2 text-xs text-gray-500 select-none" style={{ opacity: isKo ? 1 : 0 }}>EN</span>
      <span className="absolute right-1.5 text-xs text-gray-500 select-none" style={{ opacity: isKo ? 0 : 1 }}>한</span>
    </motion.button>
  );
}
