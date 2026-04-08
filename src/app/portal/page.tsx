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
  const [health, setHealth] = useState<any>(null);
  const [leads, setLeads] = useState<any>(null);
  const [gbp, setGbp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingHealth, setRefreshingHealth] = useState(false);
  const [refreshingGbp, setRefreshingGbp] = useState(false);

  const fetchDashboard = useCallback(async () => {
    const [dashRes, healthRes, leadsRes, gbpRes] = await Promise.all([
      portalFetch('/api/portal/dashboard'),
      portalFetch('/api/portal/health'),
      portalFetch('/api/portal/leads'),
      portalFetch('/api/portal/gbp'),
    ]);
    if (dashRes.ok) setData(await dashRes.json());
    if (healthRes.ok) setHealth(await healthRes.json());
    if (leadsRes.ok) setLeads(await leadsRes.json());
    if (gbpRes.ok) setGbp(await gbpRes.json());
    setLoading(false);
  }, []);

  const refreshHealth = async () => {
    setRefreshingHealth(true);
    const res = await portalFetch('/api/portal/health', { method: 'POST' });
    if (res.ok) setHealth(await res.json());
    setRefreshingHealth(false);
  };

  const refreshGbp = async () => {
    setRefreshingGbp(true);
    const res = await portalFetch('/api/portal/gbp', { method: 'POST' });
    if (res.ok) {
      const snap = await res.json();
      setGbp((prev: any) => ({ ...(prev || {}), snapshot: snap.snapshot }));
    }
    setRefreshingGbp(false);
  };

  const connectGbp = async () => {
    const res = await portalFetch('/api/portal/gbp/connect');
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
  };

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Hi, {data.contactName || 'there'}</h1>
          <p className="text-white/40 text-sm">{data.businessName}</p>
        </div>
        <button onClick={logout} className="text-xs text-white/30 hover:text-white/50 transition-colors">Sign out</button>
      </div>

      {/* Website hero card with screenshot */}
      {data.website && (
        <div className="glass rounded-xl overflow-hidden mb-8">
          {data.website.screenshotUrl && (
            <a
              href={data.website.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-[16/9] bg-white/5 overflow-hidden border-b border-white/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.website.screenshotUrl}
                alt={`${data.businessName} website screenshot`}
                className="w-full h-full object-cover object-top hover:scale-[1.02] transition-transform duration-300"
                loading="lazy"
              />
            </a>
          )}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Your website</p>
                <a href={data.website.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors truncate block">
                  {data.website.url}
                </a>
              </div>
              <span className={`text-xs font-medium shrink-0 ml-3 ${SITE_STATUS_COLORS[data.website.status] || 'text-white/40'}`}>
                {data.website.status === 'live' ? '● Live' : data.website.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================== */}
      {/* SECTION: YOUR BUSINESS                    */}
      {/* ======================================== */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xs text-white/50 uppercase tracking-[0.15em] font-semibold">Your Business</h2>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* Leads / Form Submissions */}
      {leads && (
        <div className="glass rounded-xl p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">Leads</p>
            {leads.submissions.length > 0 && (
              <a
                href="/api/portal/leads?format=csv"
                className="text-xs text-cyan-400 hover:text-cyan-300"
                onClick={(e) => {
                  e.preventDefault();
                  const token = localStorage.getItem('portal_token');
                  const link = document.createElement('a');
                  link.href = '/api/portal/leads?format=csv';
                  fetch('/api/portal/leads?format=csv', { headers: { 'x-portal-token': token || '' } })
                    .then((r) => r.blob())
                    .then((b) => {
                      const url = URL.createObjectURL(b);
                      link.href = url;
                      link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
                      link.click();
                      URL.revokeObjectURL(url);
                    });
                }}
              >
                Export CSV
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-3xl font-bold text-white">{leads.stats.thisMonth}</p>
              <p className="text-[11px] text-white/40 uppercase tracking-wide">This month</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white/40">{leads.stats.lastMonth}</p>
              <p className="text-[11px] text-white/40 uppercase tracking-wide">Last month</p>
            </div>
          </div>
          {leads.submissions.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-3 border-t border-white/5 mt-3">No leads captured yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pt-3 border-t border-white/5">
              {leads.submissions.slice(0, 5).map((l: any) => (
                <div key={l.id} className="text-xs border-b border-white/5 pb-2 last:border-0">
                  <div className="flex justify-between">
                    <span className="text-white font-medium truncate pr-2">{l.name || 'Anonymous'}</span>
                    <span className="text-white/30 shrink-0">{new Date(l.createdAt).toLocaleDateString()}</span>
                  </div>
                  {(l.email || l.phone) && (
                    <p className="text-white/50 truncate">{[l.email, l.phone].filter(Boolean).join(' · ')}</p>
                  )}
                  {l.message && <p className="text-white/40 line-clamp-2 mt-1">{l.message}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Google Business Profile */}
      {gbp && (
        <div className="glass rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">Google Reviews</p>
            {(gbp.connected || gbp.placeId) && (
              <button
                onClick={refreshGbp}
                disabled={refreshingGbp}
                className="text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-40"
              >
                {refreshingGbp ? 'Refreshing…' : 'Refresh'}
              </button>
            )}
          </div>
          {!gbp.connected && !gbp.placeId && (
            <div className="text-center py-4">
              <p className="text-xs text-white/40 mb-3">Connect your Google Business Profile to see reviews here.</p>
              <button
                onClick={connectGbp}
                className="text-xs px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Connect Google
              </button>
            </div>
          )}
          {gbp.snapshot && (
            <>
              <div className="flex items-center gap-6 mb-3">
                <div>
                  <p className="text-3xl font-bold text-amber-400">
                    {gbp.snapshot.rating != null ? Number(gbp.snapshot.rating).toFixed(1) : '—'}
                  </p>
                  <p className="text-[11px] text-white/40 uppercase tracking-wide">{gbp.snapshot.reviewCount ?? 0} reviews</p>
                </div>
                {gbp.snapshot.newReviewsMonth != null && (
                  <div>
                    <p className="text-3xl font-semibold text-emerald-400">+{gbp.snapshot.newReviewsMonth}</p>
                    <p className="text-[11px] text-white/40 uppercase tracking-wide">New this month</p>
                  </div>
                )}
              </div>
              {(() => {
                try {
                  const recent = JSON.parse(gbp.snapshot.recentReviews || '[]');
                  return recent.length > 0 ? (
                    <div className="space-y-2 pt-3 border-t border-white/5">
                      {recent.slice(0, 3).map((r: any, i: number) => (
                        <div key={i} className="text-xs">
                          <div className="flex justify-between">
                            <span className="text-white font-medium">{r.author}</span>
                            <span className="text-amber-400">{'★'.repeat(r.rating)}</span>
                          </div>
                          {r.text && <p className="text-white/50 line-clamp-2 mt-1">{r.text}</p>}
                        </div>
                      ))}
                    </div>
                  ) : null;
                } catch { return null; }
              })()}
              {gbp.reviewUrl && (
                <a
                  href={gbp.reviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs text-cyan-400 hover:text-cyan-300 mt-3"
                >
                  Respond to reviews →
                </a>
              )}
            </>
          )}
        </div>
      )}

      {/* ======================================== */}
      {/* SECTION: YOUR WEBSITE                     */}
      {/* ======================================== */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xs text-white/50 uppercase tracking-[0.15em] font-semibold">Your Website</h2>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* SEO snapshot */}
      {data.seo && (
        <div className="glass rounded-xl p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">SEO Health</p>
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

      {/* Website Health */}
      {health?.snapshot && (
        <div className="glass rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">Performance &amp; Uptime</p>
            <button
              onClick={refreshHealth}
              disabled={refreshingHealth}
              className="text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-40"
            >
              {refreshingHealth ? 'Checking…' : 'Refresh'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-white/40">Status</p>
              <p className={`text-sm font-semibold ${health.snapshot.uptime ? 'text-emerald-400' : 'text-red-400'}`}>
                {health.snapshot.uptime ? '● Online' : '● Offline'}
                {health.snapshot.httpStatus ? ` (${health.snapshot.httpStatus})` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/40">Response</p>
              <p className="text-sm font-semibold text-white">
                {health.snapshot.responseTimeMs ? `${health.snapshot.responseTimeMs}ms` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/40">Mobile Score</p>
              <p className={`text-sm font-semibold ${
                (health.snapshot.pagespeedMobile ?? 0) >= 90 ? 'text-emerald-400' :
                (health.snapshot.pagespeedMobile ?? 0) >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {health.snapshot.pagespeedMobile ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/40">Desktop Score</p>
              <p className={`text-sm font-semibold ${
                (health.snapshot.pagespeedDesktop ?? 0) >= 90 ? 'text-emerald-400' :
                (health.snapshot.pagespeedDesktop ?? 0) >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {health.snapshot.pagespeedDesktop ?? '—'}
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-white/40">SSL: </span>
              <span className={health.snapshot.sslValid ? 'text-emerald-400' : 'text-red-400'}>
                {health.snapshot.sslValid ? 'Valid' : 'Invalid'}
              </span>
              {health.snapshot.sslExpiresAt && (
                <span className="text-white/30"> · expires {new Date(health.snapshot.sslExpiresAt).toLocaleDateString()}</span>
              )}
            </div>
            {health.snapshot.netlifyDeployedAt && (
              <div>
                <span className="text-white/40">Last deploy: </span>
                <span className="text-white/60">{new Date(health.snapshot.netlifyDeployedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
      {!health?.snapshot && (
        <div className="glass rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Performance &amp; Uptime</p>
            <button
              onClick={refreshHealth}
              disabled={refreshingHealth}
              className="text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-40"
            >
              {refreshingHealth ? 'Running first check…' : 'Run first check'}
            </button>
          </div>
        </div>
      )}

      {/* ======================================== */}
      {/* SECTION: YOUR REQUESTS                    */}
      {/* ======================================== */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xs text-white/50 uppercase tracking-[0.15em] font-semibold">Your Requests</h2>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* Request stats */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{data.openRequests}</p>
          <p className="text-[11px] text-white/40 uppercase tracking-wide">Open</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{data.completedRequests}</p>
          <p className="text-[11px] text-white/40 uppercase tracking-wide">Completed</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white/60">{data.totalRequests}</p>
          <p className="text-[11px] text-white/40 uppercase tracking-wide">Total</p>
        </div>
      </div>

      {/* Quick action */}
      {data.slug && (
        <a
          href={`/request/${data.slug}`}
          className="block w-full py-3 rounded-xl bg-accent text-black font-semibold text-center hover:brightness-110 transition-all mb-4"
        >
          Submit a New Request
        </a>
      )}

      {/* Recent activity */}
      <div>
        <p className="text-xs text-white/40 mb-2">Recent activity</p>
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
