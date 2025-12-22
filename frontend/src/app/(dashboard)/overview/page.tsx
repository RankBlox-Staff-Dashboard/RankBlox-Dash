'use client';

import { 
  FileText,
  User,
  HelpCircle,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  MessageCircle
} from 'lucide-react';
import { ProfileCard } from '@/components/ProfileCard';
import { NavigationTabs } from '@/components/NavigationTabs';
import { Card } from '@/components/ui/Card';

export default function OverviewPage() {
  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <ProfileCard />

      {/* Tabs Navigation */}
      <NavigationTabs />

      {/* Staff Resources */}
      <Card className="p-5 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white/70" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Staff Resources</h3>
            <p className="text-xs text-white/50">Staff information and help documentations</p>
          </div>
        </div>

        <div className="space-y-2">
          <a 
            href="https://docs.ahscampus.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.01] group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Atlanta High Documentation</div>
                <div className="text-xs text-white/50">Official staff guidelines and procedures</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white/60 transition" />
          </a>

          <a 
            href="https://discord.gg/firealarm" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.01] group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-purple-300" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Support Discord</div>
                <div className="text-xs text-white/50">Get help with staff-related issues</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white/60 transition" />
          </a>
        </div>
      </Card>

      {/* Quick Reminders */}
      <Card className="p-5 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <h3 className="text-base font-semibold text-white">Quick Reminders</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 transition-all hover:bg-blue-500/15">
            <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">Tracked Channels</span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/30 text-blue-300">
                  Message Quota
                </span>
              </div>
              <p className="text-xs text-white/60">
                Messages are tracked across designated channels. Check the management panel for the list.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 transition-all hover:bg-yellow-500/15">
            <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">Leave Of Absence</span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/30 text-yellow-300">
                  LOA
                </span>
              </div>
              <p className="text-xs text-white/60">
                Submit an LOA under your Account Settings before taking time off.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 transition-all hover:bg-red-500/15">
            <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">Failed Quota</span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/30 text-red-300">
                  Infractions
                </span>
              </div>
              <p className="text-xs text-white/60">
                Failure to meet quota consecutively will lead to disciplinary action.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
