'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { PageLoader } from '@/components/Spinner';

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-400/15 text-emerald-400', lead: 'bg-blue-400/15 text-blue-400',
  prospect: 'bg-purple-400/15 text-purple-400', proposal: 'bg-amber-400/15 text-amber-400',
  paused: 'bg-white/10 text-white/40', churned: 'bg-red-400/15 text-red-400',
};

const HEALTH_COLORS: Record<string, string> = {
  green: 'bg-emerald-400', yellow: 'bg-amber-400', red: 'bg-red-400', gray: 'bg-white/20',
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function healthBorder(h: string) {
  if (h === 'green') return 'border-l-emerald-400/40';
  if (h === 'yellow') return 'border-l-amber-400/40';
  if (h === 'red') return 'border-l-red-400/40';
  return 'border-l-white/10';
}

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('revenue_desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('clientsView') as 'cards' | 'table') || 'cards';
    return 'cards';
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trash, setTrash] = useState<any[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);

  const fetchTrash = useCallback(async () => {
    setTrashLoading(true);
    try {
      const res = await fetch('/api/clients/trash');
      if (res.ok) setTrash(await res.json());
    } finally { setTrashLoading(false); }
  }, []);

  const openTrash = () => { setShowTrash(true); fetchTrash(); };

  const restoreClient = async (id: string) => {
    const res = await fetch(`/api/clients/${id}/restore`, { method: 'POST' });
    if (res.ok) {
      setTrash(t => t.filter(c => c.id !== id));
      fetchClients();
    }
  };

  const fetchClients = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/clients?${params}`);
      if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setClients(data); }
    } catch {} finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const toggleView = (mode: 'cards' | 'table') => { setViewMode(mode); localStorage.setItem('clientsView', mode); };

  const sorted = useMemo(() => {
    const arr = [...clients];
    switch (sortBy) {
      case 'revenue_desc': return arr.sort((a, b) => (b.monthlyRevenue || 0) - (a.monthlyRevenue || 0));
      case 'revenue_asc': return arr.sort((a, b) => (a.monthlyRevenue || 0) - (b.monthlyRevenue || 0));
      case 'activity_oldest': return arr.sort((a, b) => {
        const aDate = a.lastActivity?.date ? new Date(a.lastActivity.date).getTime() : 0;
        const bDate = b.lastActivity?.date ? new Date(b.lastActivity.date).getTime() : 0;
        return aDate - bDate;
      });
      case 'seo_lowest': return arr.sort((a, b) => (a.avgSeoScore ?? 999) - (b.avgSeoScore ?? 999));
      case 'name_az': return arr.sort((a, b) => a.businessName.localeCompare(b.businessName));
      case 'date_newest': return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      default: return arr;
    }
  }, [clients, sortBy]);

  // Stats
  const totalMrr = clients.reduce((s, c) => s + (c.monthlyRevenue || 0), 0);
  const activeCount = clients.filter(c => c.status === 'active').length;
  const leadCount = clients.filter(c => c.status === 'lead').length;
  const healthCounts = { green: 0, yellow: 0, red: 0 };
  clients.forEach(c => { if (c.health in healthCounts) healthCounts[c.health as keyof typeof healthCounts]++; });
  const avgSeo = (() => {
    const scores = clients.map(c => c.avgSeoScore).filter((s): s is number => s !== null);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  })();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">Clients</h1>
          <p className="text-sm text-white/40 mt-1">
            {clients.length} total
            {activeCount > 0 && <> · <span className="text-emerald-400/70">{activeCount} active</span></>}
            {leadCount > 0 && <> · <span className="text-blue-400/70">{leadCount} leads</span></>}
            {totalMrr > 0 && <> · <span className="text-accent">${totalMrr.toLocaleString()}/mo MRR</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openTrash}
            title="View recently deleted clients"
            className="px-3 py-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 text-sm transition-all duration-200 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            Trash
          </button>
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200">+ Add Client</button>
        </div>
      </div>

      {/* Trash modal */}
      {showTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTrash(false)}>
          <div className="glass rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <h2 className="text-lg font-light text-white/90">Recently Deleted</h2>
                <p className="text-xs text-white/40 mt-0.5">Clients are kept for 7 days before being permanently removed</p>
              </div>
              <button onClick={() => setShowTrash(false)} className="text-white/30 hover:text-white/60 text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto p-4">
              {trashLoading ? (
                <div className="text-center py-12 text-white/30 text-sm">Loading…</div>
              ) : trash.length === 0 ? (
                <div className="text-center py-12 text-white/30 text-sm">Trash is empty</div>
              ) : (
                <div className="space-y-2">
                  {trash.map(c => {
                    const days = Math.floor(c.hoursLeft / 24);
                    const hours = c.hoursLeft % 24;
                    const timeLeft = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
                    const urgent = c.hoursLeft < 24;
                    return (
                      <div key={c.id} className="glass-subtle rounded-xl p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white/80 truncate">{c.businessName}</p>
                          <p className="text-xs text-white/40 mt-0.5 truncate">
                            {c.businessType && <span>{c.businessType}</span>}
                            {c.city && <span> · {c.city}{c.state ? `, ${c.state}` : ''}</span>}
                            {c._count.websites > 0 && <span> · {c._count.websites} site{c._count.websites > 1 ? 's' : ''}</span>}
                          </p>
                          <p className={`text-[10px] mt-1 ${urgent ? 'text-red-400' : 'text-white/30'}`}>
                            Auto-deletes in {timeLeft}
                          </p>
                        </div>
                        <button
                          onClick={() => restoreClient(c.id)}
                          className="px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/30 text-accent text-xs hover:bg-accent/30 transition-all shrink-0"
                        >
                          Restore
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="glass p-4">
          <p className="text-xs text-white/40">MRR</p>
          <p className="text-xl font-light mt-1 text-accent">${totalMrr.toLocaleString()}</p>
        </div>
        <div className="glass p-4">
          <p className="text-xs text-white/40">Healthy</p>
          <p className="text-xl font-light mt-1 text-emerald-400">{healthCounts.green}</p>
        </div>
        <div className="glass p-4">
          <p className="text-xs text-white/40">Needs Attention</p>
          <p className="text-xl font-light mt-1 text-amber-400">{healthCounts.yellow}</p>
        </div>
        <div className="glass p-4">
          <p className="text-xs text-white/40">Avg SEO</p>
          <p className={`text-xl font-light mt-1 ${avgSeo !== null ? scoreColor(avgSeo) : 'text-white/20'}`}>{avgSeo !== null ? avgSeo : '--'}</p>
        </div>
      </div>

      {/* Filters + Sort + View Toggle */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <input type="text" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="glass-subtle px-4 py-2 rounded-xl text-sm w-56 border-none" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="glass-subtle px-4 py-2 rounded-xl text-sm border-none">
          <option value="">All statuses</option>
          <option value="lead">Lead</option>
          <option value="prospect">Prospect</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="churned">Churned</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="glass-subtle px-4 py-2 rounded-xl text-sm border-none">
          <option value="revenue_desc">Revenue (high to low)</option>
          <option value="revenue_asc">Revenue (low to high)</option>
          <option value="activity_oldest">Last activity (oldest)</option>
          <option value="seo_lowest">SEO score (lowest)</option>
          <option value="name_az">Name (A-Z)</option>
          <option value="date_newest">Date added (newest)</option>
        </select>
        <div className="ml-auto flex gap-1">
          <button onClick={() => toggleView('cards')} className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-accent/20 text-accent' : 'text-white/30 hover:text-white/50'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
          </button>
          <button onClick={() => toggleView('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-accent/20 text-accent' : 'text-white/30 hover:text-white/50'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h2.25m-2.25 0c-.621 0-1.125.504-1.125 1.125M12 12c.621 0 1.125.504 1.125 1.125m-2.25 0v1.5c0 .621.504 1.125 1.125 1.125m0-3.75c.621 0 1.125.504 1.125 1.125" /></svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <PageLoader text="Loading clients..." />
      ) : sorted.length === 0 ? (
        <div className="glass p-12 text-center">
          <p className="text-white/30 text-sm">No clients found</p>
          <button onClick={() => setShowAddModal(true)} className="mt-3 text-accent text-sm hover:text-accent/80">Add your first client</button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(c => (
            <div key={c.id} className={`glass border-l-2 ${healthBorder(c.health)} hover:bg-white/[0.03] transition-all`}>
              {/* Header */}
              <div className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <Link href={`/clients/${c.id}`} className="text-sm font-medium text-white/80 hover:text-white truncate flex-1">{c.businessName}</Link>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || 'bg-white/10 text-white/40'}`}>{c.status}</span>
                    <div className={`w-2 h-2 rounded-full ${HEALTH_COLORS[c.health] || 'bg-white/20'}`} />
                  </div>
                </div>
                {c.contactName && <p className="text-xs text-white/40 mt-0.5">{c.contactName}</p>}
                <p className="text-[10px] text-white/25 mt-0.5">
                  {[c.businessType, [c.city, c.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                </p>
              </div>

              {/* Info Boxes */}
              <div className="px-4 pb-2 grid grid-cols-3 gap-2">
                <div className="rounded-lg p-2 bg-accent/5 border border-accent/10 text-center">
                  <p className="text-xs font-medium text-accent">{c.monthlyRevenue ? `$${c.monthlyRevenue.toLocaleString()}` : '--'}</p>
                  <p className="text-[9px] text-white/25">{c.package?.name || 'No package'}</p>
                </div>
                <div className={`rounded-lg p-2 text-center ${c.avgSeoScore !== null ? 'bg-white/[0.03] border border-white/5' : 'bg-white/[0.02] border border-white/5'}`}>
                  <p className={`text-xs font-medium ${c.avgSeoScore !== null ? scoreColor(c.avgSeoScore) : 'text-white/20'}`}>
                    {c.avgSeoScore !== null ? `SEO: ${c.avgSeoScore}%` : 'SEO: --'}
                  </p>
                  <p className="text-[9px] text-white/25">{c.totalSeoIssues > 0 ? `${c.totalSeoIssues} issues` : c.avgSeoScore !== null ? 'No issues' : 'Not audited'}</p>
                </div>
                <div className="rounded-lg p-2 bg-blue-400/5 border border-blue-400/10 text-center">
                  <p className="text-xs font-medium text-blue-400">{c.websiteCount} site{c.websiteCount !== 1 ? 's' : ''}</p>
                  <p className="text-[9px] text-white/25">{c.websites?.[0]?.cmsPlatform || '--'}</p>
                </div>
              </div>

              {/* Last Activity */}
              <div className="px-4 pb-2">
                <p className={`text-[10px] ${c.lastActivity ? 'text-white/25' : 'text-amber-400/50'}`}>
                  {c.lastActivity ? `${c.lastActivity.description} — ${timeAgo(c.lastActivity.date)}` : 'No recent activity'}
                </p>
              </div>

              {/* Actions */}
              <div className="px-4 pb-3 pt-1 flex gap-2">
                <Link href={`/clients/${c.id}`} className="px-3 py-1.5 rounded-lg bg-accent/15 text-accent text-[11px] hover:bg-accent/25 transition-all">View Profile</Link>
                {c.websites?.[0]?.id && <Link href={`/seo/${c.websites[0].id}`} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-[11px] hover:bg-white/10 transition-all">SEO Dashboard</Link>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="glass overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-white/40 font-medium">Client</th>
                <th className="text-left p-3 text-white/40 font-medium">Contact</th>
                <th className="text-left p-3 text-white/40 font-medium">Status</th>
                <th className="text-left p-3 text-white/40 font-medium">Package</th>
                <th className="text-right p-3 text-white/40 font-medium">Revenue</th>
                <th className="text-right p-3 text-white/40 font-medium">SEO</th>
                <th className="text-right p-3 text-white/40 font-medium">Sites</th>
                <th className="text-left p-3 text-white/40 font-medium">Last Activity</th>
                <th className="text-center p-3 text-white/40 font-medium">Health</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => (
                <tr key={c.id} className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                  <td className="p-3"><Link href={`/clients/${c.id}`} className="text-white/70 hover:text-accent">{c.businessName}</Link></td>
                  <td className="p-3 text-white/40">{c.contactName || '--'}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${STATUS_COLORS[c.status] || ''}`}>{c.status}</span></td>
                  <td className="p-3 text-white/40">{c.package?.name || '--'}</td>
                  <td className="p-3 text-right text-accent">{c.monthlyRevenue ? `$${c.monthlyRevenue.toLocaleString()}` : '--'}</td>
                  <td className={`p-3 text-right ${c.avgSeoScore !== null ? scoreColor(c.avgSeoScore) : 'text-white/20'}`}>{c.avgSeoScore !== null ? `${c.avgSeoScore}%` : '--'}</td>
                  <td className="p-3 text-right text-white/40">{c.websiteCount}</td>
                  <td className="p-3 text-white/30">{c.lastActivity ? `${c.lastActivity.description} — ${timeAgo(c.lastActivity.date)}` : <span className="text-amber-400/50">None</span>}</td>
                  <td className="p-3 text-center"><div className={`w-2.5 h-2.5 rounded-full mx-auto ${HEALTH_COLORS[c.health] || 'bg-white/20'}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && <AddClientModal onClose={() => setShowAddModal(false)} onCreated={() => { setShowAddModal(false); fetchClients(); }} />}
    </div>
  );
}

function AddClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ businessName: '', contactName: '', email: '', phone: '', businessType: '', city: '', state: '', status: 'lead', monthlyRevenue: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim()) return;
    setSubmitting(true);
    await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSubmitting(false);
    onCreated();
  };

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-elevated p-8 w-full max-w-lg relative z-10 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-light tracking-wide text-white mb-6">Add Client</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-xs text-white/50 uppercase tracking-wider">Business Name *</label><input value={form.businessName} onChange={e => set('businessName', e.target.value)} className="mt-1" autoFocus /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-white/50 uppercase tracking-wider">Contact Name</label><input value={form.contactName} onChange={e => set('contactName', e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs text-white/50 uppercase tracking-wider">Business Type</label><input value={form.businessType} onChange={e => set('businessType', e.target.value)} placeholder="e.g. Plumber, Roofer" className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-white/50 uppercase tracking-wider">Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs text-white/50 uppercase tracking-wider">Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-xs text-white/50 uppercase tracking-wider">City</label><input value={form.city} onChange={e => set('city', e.target.value)} className="mt-1" /></div>
            <div><label className="text-xs text-white/50 uppercase tracking-wider">State</label><input value={form.state} onChange={e => set('state', e.target.value)} placeholder="FL" className="mt-1" /></div>
            <div><label className="text-xs text-white/50 uppercase tracking-wider">Status</label><select value={form.status} onChange={e => set('status', e.target.value)} className="mt-1"><option value="lead">Lead</option><option value="prospect">Prospect</option><option value="active">Active</option></select></div>
          </div>
          <div><label className="text-xs text-white/50 uppercase tracking-wider">Monthly Revenue ($)</label><input type="number" value={form.monthlyRevenue} onChange={e => set('monthlyRevenue', e.target.value)} placeholder="0" className="mt-1" /></div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60 hover:bg-white/10 transition-all duration-200">Cancel</button>
            <button type="submit" disabled={submitting || !form.businessName.trim()} className="flex-1 py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 transition-all duration-200 disabled:opacity-40">{submitting ? 'Adding...' : 'Add Client'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
