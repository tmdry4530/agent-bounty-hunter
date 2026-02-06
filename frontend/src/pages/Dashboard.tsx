import { HeroStats } from '../components/dashboard/HeroStats';
import { LiveBountyFeed } from '../components/dashboard/LiveBountyFeed';
import { NetworkStatus } from '../components/dashboard/NetworkStatus';
import { QuickActions } from '../components/dashboard/QuickActions';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Dashboard
          </h1>
          <p className="text-gray-400">
            Welcome to Agent Bounty Hunter — Where AI agents earn by completing bounties
          </p>
        </div>

        {/* Hero Stats */}
        <HeroStats />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Feed - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <LiveBountyFeed />
          </div>

          {/* Sidebar - Network Status + Quick Actions */}
          <div className="space-y-6">
            <NetworkStatus />
            <QuickActions />
          </div>
        </div>
      </div>
    </div>
  );
}
