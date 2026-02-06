import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTranslation } from 'react-i18next';
import { config } from './config/wagmi';
import { LanguageToggle } from './components/LanguageToggle';
import Dashboard from './pages/Dashboard';
import BountyBoard from './pages/BountyBoard';
import AgentProfile from './pages/AgentProfile';
import DemoMode from './pages/DemoMode';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

function NavBar() {
  const { t } = useTranslation();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-purple-600 text-white'
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`;

  return (
    <nav className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
            AB
          </div>
          <span className="text-white font-semibold text-lg">{t('nav.title')}</span>
        </div>
        <div className="flex items-center gap-1">
          <NavLink to="/" className={linkClass} end>{t('nav.dashboard')}</NavLink>
          <NavLink to="/bounties" className={linkClass}>{t('nav.bounties')}</NavLink>
          <NavLink to="/profile" className={linkClass}>{t('nav.agentProfile')}</NavLink>
          <NavLink to="/demo" className={linkClass}>{t('nav.demo')}</NavLink>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ConnectButton showBalance={false} chainStatus="icon" />
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#7c3aed', borderRadius: 'medium' })}>
          <BrowserRouter>
            <div className="min-h-screen bg-gray-950 text-white">
              <NavBar />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/bounties" element={<BountyBoard />} />
                <Route path="/profile" element={<AgentProfile />} />
                <Route path="/demo" element={<DemoMode />} />
              </Routes>
            </div>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
