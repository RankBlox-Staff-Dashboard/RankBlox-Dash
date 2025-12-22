'use client';

import { 
  Settings,
  MessageSquare,
  Calendar,
  Info
} from 'lucide-react';
import { ProfileCard } from '@/components/ProfileCard';
import { NavigationTabs } from '@/components/NavigationTabs';
import { Card } from '@/components/ui/Card';

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <ProfileCard />

      {/* Tabs Navigation */}
      <NavigationTabs />

      {/* Staff Settings */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-white/70" />
          <div>
            <h3 className="text-base font-semibold text-white">Staff Settings</h3>
            <p className="text-xs text-white/50">Manage your staff account settings</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Custom Messages */}
          <div className="p-4 rounded-xl bg-white/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-blue-300" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">Custom Messages</h4>
                  <p className="text-xs text-white/50 mt-0.5">Set custom greeting and ending messages for tickets</p>
                </div>
              </div>
              <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-white transition">
                Set Custom Messages
              </button>
            </div>
          </div>

          {/* Request LOA */}
          <div className="p-4 rounded-xl bg-white/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-yellow-300" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">Request Leave of Absence</h4>
                  <p className="text-xs text-white/50 mt-0.5">Request time off from staff duties</p>
                </div>
              </div>
              <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-white transition">
                Request LOA
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Staff Information */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-base font-semibold text-white">Staff Information</h3>
            <p className="text-xs text-white/50">Important information for staff members</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-300 mb-2">Staff Guidelines</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Remember to complete your weekly message quota of 150 messages in the tracked channels. 
                If you need time off, submit an LOA request through the settings page. 
                Failure to meet quota without an approved LOA may result in infractions.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
