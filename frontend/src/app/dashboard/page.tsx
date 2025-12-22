'use client';

import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ExternalLink,
  LifeBuoy,
  Menu,
  MessageSquare,
  Search,
  Settings,
  UserCheck,
  Users,
  Database,
  Shield,
} from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StatItem } from '@/components/ui/StatItem';
import { TabsGrid } from '@/components/ui/TabsGrid';

export default function StaffDashboardPage() {
  return (
    <div className="min-h-[100svh] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.055),transparent_55%),linear-gradient(to_bottom,#000,#050505_45%,#000)]">
      <div className="mx-auto w-full max-w-[420px] pb-10">
        <header className="px-4 pt-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/0 text-white/75 hover:bg-white/5 hover:text-white/90"
              aria-label="Open menu"
            >
              <Menu className="h-[20px] w-[20px]" strokeWidth={2.2} />
            </button>

            <div className="flex items-center gap-2">
              <Shield className="h-[18px] w-[18px] text-blue-400" strokeWidth={2.2} />
              <div className="text-[20px] font-semibold tracking-tight text-white">
                Atlanta High
              </div>
              <Badge
                className="ml-1 bg-rose-500/12 text-rose-200 ring-1 ring-rose-400/25"
              >
                Associate
              </Badge>
            </div>
          </div>

          <div className="mt-4 h-px bg-white/10" />
        </header>

        <main className="px-4">
          <Card className="mt-4 px-6 py-6">
            <div className="flex items-start gap-4">
              <Avatar />
              <div className="min-w-0">
                <div className="text-[22px] font-semibold tracking-[-0.02em] text-white">
                  Welcome, Staff BlakeGamez0
                </div>
                <div className="mt-1 flex items-center gap-2 text-[14px] text-white/55">
                  <span>Associate</span>
                  <span className="text-white/30">•</span>
                  <span className="inline-flex items-center gap-2 font-semibold text-emerald-300">
                    <span className="h-[6px] w-[6px] rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-6">
              <StatItem title="Messages" value="0/150" icon={MessageSquare} tone="blue" />
              <StatItem title="Infractions" value="0" icon={AlertTriangle} tone="yellow" />
              <StatItem title="Claimed" value="2" icon={Database} tone="green" />
              <StatItem title="Closed" value="1" icon={UserCheck} tone="purple" />
            </div>
          </Card>

          <Card className="mt-4 p-3">
            <TabsGrid
              activeKey="overview"
              items={[
                { key: 'overview', label: 'Overview', icon: BarChart3 },
                { key: 'lookup', label: 'Lookup', icon: Search },
                { key: 'infractions', label: 'Infractions', icon: AlertTriangle },
                { key: 'settings', label: 'Settings', icon: Settings },
              ]}
            />
          </Card>

          <Card className="mt-5 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/6 ring-1 ring-white/10">
                <BookOpen className="h-[18px] w-[18px] text-white/80" strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-[18px] font-semibold tracking-tight text-white">
                  Staff Resources
                </div>
                <div className="mt-0.5 text-[13px] text-white/50">
                  Staff information and help documentations
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/35 px-4 py-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/14 ring-1 ring-blue-400/20">
                  <BookOpen className="h-[18px] w-[18px] text-blue-200" strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-white">
                    Atlanta High Documentation
                  </div>
                  <div className="mt-0.5 text-[12px] text-white/45">
                    Official staff guidelines and procedures
                  </div>
                </div>
                <ExternalLink className="h-[18px] w-[18px] text-white/55" strokeWidth={2.2} />
              </div>

              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/25 px-4 py-4 opacity-70">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/14 ring-1 ring-violet-400/25">
                  <Users className="h-[18px] w-[18px] text-violet-200" strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-white">Staff Documentation</div>
                  <div className="mt-0.5 text-[12px] text-white/45">Coming Soon!</div>
                </div>
                <ExternalLink className="h-[18px] w-[18px] text-white/30" strokeWidth={2.2} />
              </div>

              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/35 px-4 py-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/14 ring-1 ring-emerald-400/25">
                  <LifeBuoy className="h-[18px] w-[18px] text-emerald-200" strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-white">Support Center</div>
                  <div className="mt-0.5 text-[12px] text-white/45">
                    Get help with staff-related issues
                  </div>
                </div>
                <ExternalLink className="h-[18px] w-[18px] text-white/55" strokeWidth={2.2} />
              </div>
            </div>
          </Card>

          <Card className="mt-5 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/6 ring-1 ring-white/10">
                <AlertTriangle className="h-[18px] w-[18px] text-white/80" strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-[18px] font-semibold tracking-tight text-white">
                  Quick Reminders
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-black/35 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/14 ring-1 ring-blue-400/20">
                    <MessageSquare
                      className="h-[18px] w-[18px] text-blue-200"
                      strokeWidth={2.2}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-white">Tracked Channels</div>
                    <div className="mt-0.5 text-[12px] text-white/45">
                      Messages tracked across designated Discord channels.
                    </div>
                  </div>
                </div>
                <Badge tone="blue" className="shrink-0">
                  Message Quota
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-black/35 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/14 ring-1 ring-amber-400/25">
                    <Users className="h-[18px] w-[18px] text-amber-200" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-white">Leave Of Absence</div>
                    <div className="mt-0.5 text-[12px] text-white/45">
                      Submit an LOA under your Account Settings.
                    </div>
                  </div>
                </div>
                <Badge tone="yellow" className="shrink-0 px-4">
                  LOA
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-3xl border border-rose-400/20 bg-rose-500/6 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/14 ring-1 ring-rose-400/25">
                    <AlertTriangle
                      className="h-[18px] w-[18px] text-rose-200"
                      strokeWidth={2.2}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-white">Failed Quota</div>
                    <div className="mt-0.5 text-[12px] text-white/45">
                      Failure to meet quota consecutively will lead to disciplinary action.
                    </div>
                  </div>
                </div>
                <Badge tone="red" className="shrink-0 px-4">
                  Infractions
                </Badge>
              </div>
            </div>
          </Card>

          <div className="mt-10 pb-4 text-center text-[12px] text-white/35">
            © 2025 Atlanta High. All rights reserved.
          </div>
        </main>
      </div>
    </div>
  );
}

