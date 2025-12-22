'use client';

import { 
  AlertTriangle, 
  TrendingUp, 
  ClipboardList,
  Clock,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from 'lucide-react';
import { ProfileCard } from '@/components/ProfileCard';
import { NavigationTabs } from '@/components/NavigationTabs';
import { Card } from '@/components/ui/Card';

// Mock payout data - in production this would come from an API
const mockPayoutHistory = [
  { id: 1, amount: -5, type: 'loss', reason: 'Weekly Quota Failed', date: '12/21/2025', status: 'completed' },
  { id: 2, amount: 5, type: 'earning', reason: 'Discord Case Claimed', date: '12/20/2025', status: 'completed' },
  { id: 3, amount: 5, type: 'earning', reason: 'Discord Case Claimed', date: '12/20/2025', status: 'completed' },
];

export default function PayoutsPage() {
  // Mock balance data
  const currentBalance = 5;
  const pendingBalance = 0;
  const totalEarned = 5;
  const minimumCashout = 100;

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <ProfileCard />

      {/* Tabs Navigation */}
      <NavigationTabs />

      {/* Current Balance */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-emerald-300" />
          </div>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/30 text-emerald-300">
            Available
          </span>
        </div>
        <div className="text-sm text-white/50 mt-3">Current Balance</div>
        <div className="text-3xl font-bold text-white">{currentBalance}</div>
        <div className="text-sm text-white/40">Robux</div>
      </Card>

      {/* Pending Balance */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-300" />
          </div>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/30 text-yellow-300">
            Pending
          </span>
        </div>
        <div className="text-sm text-white/50 mt-3">Pending Balance</div>
        <div className="text-3xl font-bold text-cyan-400">{pendingBalance}</div>
        <div className="text-sm text-white/40">Robux</div>
      </Card>

      {/* Total Earned */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-purple-300" />
          </div>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/30 text-purple-300">
            Total
          </span>
        </div>
        <div className="text-sm text-white/50 mt-3">Total Earned</div>
        <div className="text-3xl font-bold text-emerald-400">{totalEarned}</div>
        <div className="text-sm text-white/40">Robux</div>
      </Card>

      {/* Quick Cashout */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Quick Cashout</h3>
              <p className="text-xs text-white/50">Minimum cashout: {minimumCashout} Robux</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-white text-sm font-medium">
            <DollarSign className="w-4 h-4" />
            Cashout
          </button>
        </div>

        {currentBalance < minimumCashout && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span className="text-xs text-yellow-300">
              You need at least {minimumCashout} Robux to cashout. Current Balance: {currentBalance} Robux
            </span>
          </div>
        )}
      </Card>

      {/* Payout History */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-white/70" />
            <div>
              <h3 className="text-base font-semibold text-white">Payout History</h3>
              <p className="text-xs text-white/50">Your earnings and cashout history</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-white/70 text-xs font-medium">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        <div className="space-y-2">
          {mockPayoutHistory.map((item) => (
            <div 
              key={item.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  item.type === 'earning' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                }`}>
                  {item.type === 'earning' ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-300" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      item.type === 'earning' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {item.amount > 0 ? '+' : ''}{item.amount} Robux
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/30 text-emerald-300">
                      {item.status}
                    </span>
                  </div>
                  <div className="text-xs text-white/50">{item.reason}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/40">{item.date}</div>
                <div className="text-xs text-white/40">
                  {item.type === 'earning' ? 'Earning' : 'Losing'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
