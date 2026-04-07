'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePortalAuth, portalFetch } from '@/lib/portalAuth';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-400/15 text-blue-400',
  in_progress: 'bg-amber-400/15 text-amber-400',
  complete: 'bg-emerald-400/15 text-emerald-400',
};
const STATUS_LABELS: Record<string, string> = { new: 'New', in_progress: 'In Progress', complete: 'Complete' };

const SITE_STATUS_COLORS: Record<string, string> = {
  live: 'text-emerald-400', development: 'text-amber-400', maintenance: 'text-orange-400',
};

export default function PortalDashboard() {
  const { client, loading: authLoading, logout } = usePortalAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    const res = await portalFetch('/api/portal/dashboard');
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!client) { router.push('/portal/login'); return; }
    fetchDashboard();
  }, [client, authLoading, router, fetchDashboard]);

  if (authLoading || loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Hi, {data.contactName || 'there'}</h1>
          <p className="text-white/40 text-sm">{data.businessName}</p>
        </div>
        <button onClick={logout} className="text-xs text-white/30 hover:text-white/50 transition-colors">Sign out</button>
      </div>

      {/* Website status */}
      {data.website && (
        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Your website</p>
              <a href={data.website.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
                {data.website.url}
              </a>
            </div>
            <span className={`text-xs font-medium ${SITE_STATUS_COLORS[data.website.status] || 'text-white/40'}`}>
              {data.website.status === 'live' ? '● Live' : data.website.status}
            </span>
          </div>
          {data.website.lastUpdated && (
            <p className="text-xs text-white/25 mt-2">Last updated {new Date(data.website.lastUpdated).toLocaleDateString()}</p>
          )}
        </div>
      )}

      {/* SEO snapshot */}
      {data.seo && (
        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">SEO Health</p>
            {data.seo.lastCrawled && (
              <p className="text-xs text-white/25">Updated {new Date(data.seo.lastCrawled).toLocaleDateString()}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Score circle */}
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  stroke={
                    data.seo.score === null ? 'rgba(255,255,255,0.2)' :
                    data.seo.score >= 80 ? '#34d399' :
                    data.seo.score >= 60 ? '#fbbf24' : '#f87171'
                  }
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${((data.seo.score ?? 0) / 100) * 97.4} 97.4`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {data.seo.score ?? '—'}
                </span>
              </div>
            </div>
            {/* Stats */}
            <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
              <div>
                <p className="text-lg font-semibold text-white">{data.seo.pagesCrawled}</p>
                <p className="text-xs text-white/40">Pages tracked</p>
              </div>
              <div>
                <p className={`text-lg font-semibold ${data.seo.totalIssues === 0 ? 'text-emerald-400' : data.seo.totalIssues < 5 ? 'text-amber-400' : 'text-red-400'}`}>
                  {data.seo.totalIssues}
                </p>
                <p className="text-xs text-white/40">Issues found</p>
              </div>
            </div>
          </div>
          {data.seo.topIssues.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <p className="text-xs text-white/30 mb-2">Most common issues</p>
              <div className="space-y-1.5">
                {data.seo.topIssues.map((iss: { type: string; count: number }) => (
                  <div key={iss.type} className="flex items-center justify-between text-xs">
                    <span className="text-white/60 truncate pr-2">{iss.type}</span>
                    <span className="text-white/30 shrink-0">×{iss.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.seo.score === null && (
            <p className="text-xs text-white/30 mt-3 text-center">Awaiting first SEO scan</p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{data.openRequests}</p>
          <p className="text-xs text-white/40">Open</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{data.completedRequests}</p>
          <p className="text-xs text-white/40">Completed</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white/60">{data.totalRequests}</p>
          <p className="text-xs text-white/40">Total</p>
        </div>
      </div>

      {/* Quick action */}
      {data.slug && (
        <a
          href={`/request/${data.slug}`}
          className="block w-full py-3 rounded-xl bg-accent text-black font-semibold text-center hover:brightness-110 transition-all mb-6"
        >
          Submit a New Request
        </a>
      )}

      {/* Recent activity */}
      <div>
        <h2 className="text-sm text-white/40 uppercase tracking-wider mb-3">Recent Activity</h2>
        {data.recentRequests.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center text-white/30 text-sm">No requests yet</div>
        ) : (
          <div className="space-y-2">
            {data.recentRequests.map((req: any) => (
              <div key={req.id} className="glass rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{req.changeType}</p>
                    <p className="text-xs text-white/30">{req.pageLocation} · {new Date(req.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[req.status]}`}>
                    {STATUS_LABELS[req.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
