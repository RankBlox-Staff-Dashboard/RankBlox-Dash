'use client';

import { 
  AlertTriangle, 
  Info,
  XCircle
} from 'lucide-react';
import { ProfileCard } from '@/components/ProfileCard';
import { NavigationTabs } from '@/components/NavigationTabs';
import { Card } from '@/components/ui/Card';
import { useInfractions } from '@/hooks/useInfractions';

export default function InfractionsPage() {
  const { infractions, loading, error } = useInfractions();

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <ProfileCard />

      {/* Tabs Navigation */}
      <NavigationTabs />

      {/* Your Infractions */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <div>
            <h3 className="text-base font-semibold text-white">Your Infractions</h3>
            <p className="text-xs text-white/50">View your current and past infractions</p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-8 text-white/50">Loading infractions...</div>
        )}
        
        {error && (
          <div className="text-center py-8 text-red-400">{error}</div>
        )}

        {!loading && !error && infractions.length === 0 && (
          <div className="text-center py-8 text-white/50">No infractions found. Keep up the good work!</div>
        )}

        <div className="space-y-3">
          {infractions.map((infraction) => {
            const date = new Date(infraction.created_at).toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric'
            });
            
            return (
              <div 
                key={infraction.id}
                className={`flex items-start gap-3 p-4 rounded-xl ${
                  infraction.voided 
                    ? 'bg-white/5 opacity-60' 
                    : infraction.type === 'strike' 
                      ? 'bg-red-500/10 border border-red-500/20' 
                      : 'bg-yellow-500/10 border border-yellow-500/20'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  infraction.voided
                    ? 'bg-white/10'
                    : infraction.type === 'strike'
                      ? 'bg-red-500/20'
                      : 'bg-yellow-500/20'
                }`}>
                  <XCircle className={`w-5 h-5 ${
                    infraction.voided
                      ? 'text-white/50'
                      : infraction.type === 'strike'
                        ? 'text-red-300'
                        : 'text-yellow-300'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-white">
                      {infraction.type === 'strike' ? 'Strike Notice' : 'Activity Notice'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        infraction.voided
                          ? 'bg-white/10 text-white/50'
                          : infraction.type === 'strike'
                            ? 'bg-red-500/30 text-red-300'
                            : 'bg-yellow-500/30 text-yellow-300'
                      }`}>
                        {infraction.voided ? 'Voided' : infraction.type === 'strike' ? 'Strike' : 'Warning'}
                      </span>
                      <span className="text-xs text-white/40">{date}</span>
                    </div>
                  </div>
                  <p className="text-xs text-white/60">{infraction.reason}</p>
                  <p className="text-xs text-white/40 mt-1">
                    By {infraction.issued_by_username || 'Activity System'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Infraction Information */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-base font-semibold text-white">Infraction Information</h3>
            <p className="text-xs text-white/50">Understanding the infraction system</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-300 mb-2">About Infractions</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Infractions are issued for violations of staff policies. 
                Warnings are minor infractions, while strikes are more serious. 
                Multiple strikes may result in demotion or removal from staff. 
                Voided infractions have been removed from your record and no longer count against you.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
