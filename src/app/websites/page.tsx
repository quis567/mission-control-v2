'use client';

import { useState, useEffect } from 'react';
import WebsiteCard from '@/components/WebsiteCard';

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
          {websites.map(w => (
            <WebsiteCard key={w.id} website={w} />
          ))}
        </div>
      )}
    </div>
  );
}
