'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const WEB_STATUS: Record<string, { color: string; dot: string }> = {
  development: { color: 'text-amber-400', dot: 'bg-amber-400' },
  staging: { color: 'text-sky-400', dot: 'bg-sky-400' },
  live: { color: 'text-emerald-400', dot: 'bg-emerald-400' },
  maintenance: { color: 'text-orange-400', dot: 'bg-orange-400' },
  archived: { color: 'text-white/30', dot: 'bg-white/30' },
};

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/websites?${params}`).then(r => r.json()).then(d => { setWebsites(d); setLoading(false); });
  }, [statusFilter]);

  const domainExpiringCount = websites.filter(w => {
    if (!w.domainExpiration) return false;
    const days = (new Date(w.domainExpiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days < 30 && days > 0;
  }).length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">Websites</h1>
          <p className="text-sm text-white/40 mt-1">{websites.length} total{domainExpiringCount > 0 ? ` · ${domainExpiringCount} domain(s) expiring soon` : ''}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="glass-subtle px-4 py-2 rounded-xl text-sm border-none">
          <option value="">All statuses</option>
          <option value="development">Development</option>
          <option value="staging">Staging</option>
          <option value="live">Live</option>
          <option value="maintenance">Maintenance</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="text-white/30 text-sm text-center py-16">Loading...</div>
      ) : websites.length === 0 ? (
        <div className="glass p-12 text-center text-white/30 text-sm">No websites yet. Add websites from client profiles.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map(w => {
            const statusInfo = WEB_STATUS[w.status] || WEB_STATUS.archived;
            const domainDays = w.domainExpiration ? Math.floor((new Date(w.domainExpiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
            return (
              <Link key={w.id} href={`/seo/${w.id}`}>
                <div className="glass p-5 hover:bg-white/15 transition-all duration-200 cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{w.url}</p>
                      <p className="text-xs text-white/30 mt-0.5">{w.client?.businessName}</p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <div className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                      <span className={`text-xs ${statusInfo.color}`}>{w.status}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-white/30">
                    {w.cmsPlatform && <p>{w.cmsPlatform}</p>}
                    {w.hostingProvider && <p>Hosted: {w.hostingProvider}</p>}
                    {domainDays != null && domainDays < 30 && domainDays > 0 && (
                      <p className="text-amber-400">Domain expires in {domainDays} days</p>
                    )}
                  </div>

                  <div className="flex gap-3 mt-3 pt-3 border-t border-white/5 text-xs text-white/20">
                    <span>{w.gaConnected ? 'GA' : ''}{w.gscConnected ? ' · GSC' : ''}</span>
                    {w.maintenancePlan && <span>Maintenance plan</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
