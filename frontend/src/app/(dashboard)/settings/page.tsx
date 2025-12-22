'use client';

import { useState, useEffect } from 'react';
import { 
  Settings,
  Calendar,
  Info,
  Clock,
  CheckCircle,
  XCircle,
  X,
  Loader2
} from 'lucide-react';
import { ProfileCard } from '@/components/ProfileCard';
import { NavigationTabs } from '@/components/NavigationTabs';
import { Card } from '@/components/ui/Card';
import { loaAPI } from '@/services/api';
import type { LOARequest } from '@/types';

export default function SettingsPage() {
  const [showLOAModal, setShowLOAModal] = useState(false);
  const [loaStatus, setLoaStatus] = useState<{ has_active_loa: boolean; loa: LOARequest | null }>({ has_active_loa: false, loa: null });
  const [loaHistory, setLoaHistory] = useState<LOARequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // LOA form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchLOAData();
  }, []);

  const fetchLOAData = async () => {
    try {
      setLoading(true);
      const [statusRes, historyRes] = await Promise.all([
        loaAPI.getStatus(),
        loaAPI.getRequests()
      ]);
      setLoaStatus(statusRes.data);
      setLoaHistory(historyRes.data);
    } catch (err) {
      console.error('Error fetching LOA data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLOA = async () => {
    if (!startDate || !endDate || !reason.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await loaAPI.create(startDate, endDate, reason);
      setShowLOAModal(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      await fetchLOAData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit LOA request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLOA = async (loaId: number) => {
    try {
      await loaAPI.cancel(loaId);
      await fetchLOAData();
    } catch (err: any) {
      console.error('Error cancelling LOA:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/30 text-yellow-300">Pending</span>;
      case 'approved':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/30 text-green-300">Approved</span>;
      case 'denied':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/30 text-red-300">Denied</span>;
      default:
        return null;
    }
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <ProfileCard />

      {/* Tabs Navigation */}
      <NavigationTabs />

      {/* LOA Status */}
      <Card className="p-5 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Settings className="w-4 h-4 text-yellow-400" />
          </div>
          <span className="text-sm font-semibold text-yellow-400 uppercase tracking-wide">Staff Management</span>
        </div>

        <h3 className="text-lg font-bold text-white mb-2">Leave of Absence Request</h3>
        <p className="text-sm text-white/60 mb-4">Submit a request for time off from your staff duties</p>

        {/* Current LOA Status */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-white/60" />
            <span className="text-sm font-medium text-white">Current LOA Status</span>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-white/50">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : loaStatus.has_active_loa && loaStatus.loa ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {loaStatus.loa.status === 'approved' ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : loaStatus.loa.status === 'pending' ? (
                  <Clock className="w-4 h-4 text-yellow-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-sm text-white">
                  {loaStatus.loa.status === 'approved' ? 'Currently on LOA' : 
                   loaStatus.loa.status === 'pending' ? 'LOA Request Pending' : 'LOA Denied'}
                </span>
                {getStatusBadge(loaStatus.loa.status)}
              </div>
              <p className="text-xs text-white/50">
                {new Date(loaStatus.loa.start_date).toLocaleDateString()} - {new Date(loaStatus.loa.end_date).toLocaleDateString()}
              </p>
              {loaStatus.loa.status === 'pending' && (
                <button
                  onClick={() => handleCancelLOA(loaStatus.loa!.id)}
                  className="text-xs text-red-400 hover:text-red-300 transition"
                >
                  Cancel Request
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-300">Not currently on LOA</span>
            </div>
          )}
        </div>

        {/* Request LOA Button */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-white/5 transition-all hover:bg-white/10">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-yellow-300" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white">Request Leave of Absence</h4>
              <p className="text-xs text-white/50 mt-0.5">Request time off from staff duties</p>
            </div>
          </div>
          <button 
            onClick={() => setShowLOAModal(true)}
            disabled={loaStatus.has_active_loa}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Request LOA
          </button>
        </div>
      </Card>

      {/* LOA History */}
      {loaHistory.length > 0 && (
        <Card className="p-5 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-white/70" />
            <div>
              <h3 className="text-base font-semibold text-white">LOA History</h3>
              <p className="text-xs text-white/50">Your past leave of absence requests</p>
            </div>
          </div>

          <div className="space-y-2">
            {loaHistory.map((loa) => (
              <div key={loa.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {new Date(loa.start_date).toLocaleDateString()} - {new Date(loa.end_date).toLocaleDateString()}
                    </span>
                    {getStatusBadge(loa.status)}
                  </div>
                  <p className="text-xs text-white/50 mt-1 line-clamp-1">{loa.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Staff Information */}
      <Card className="p-5 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-base font-semibold text-white">Staff Guidelines</h3>
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

      {/* LOA Modal */}
      {showLOAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-zinc-900 rounded-2xl border border-white/10 p-6 animate-scaleIn">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Request Leave of Absence</h3>
              <button
                onClick={() => setShowLOAModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={today}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || today}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Please provide a reason for your leave..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowLOAModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitLOA}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 rounded-xl bg-yellow-500/20 text-yellow-300 font-medium hover:bg-yellow-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
