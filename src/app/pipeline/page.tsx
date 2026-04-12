'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import PipelineColumn from '@/components/PipelineColumn';
import CreateTaskModal from '@/components/CreateTaskModal';
import { PageLoader } from '@/components/Spinner';

const PIPELINE_COLUMNS = [
  { status: 'lead', label: 'Lead', color: 'bg-blue-400', revenueLabel: 'est.' },
  { status: 'prospect', label: 'Prospect', color: 'bg-indigo-400', revenueLabel: 'est.' },
  { status: 'proposal', label: 'Proposal', color: 'bg-purple-400', revenueLabel: 'est.' },
  { status: 'active', label: 'Active Client', color: 'bg-emerald-400', revenueLabel: '' },
  { status: 'paused', label: 'Paused', color: 'bg-amber-400', revenueLabel: 'lost' },
  { status: 'churned', label: 'Churned', color: 'bg-red-400', revenueLabel: 'lost' },
];

const STATUS_COLORS: Record<string, string> = {
  lead: 'bg-blue-400/15 text-blue-400',
  prospect: 'bg-indigo-400/15 text-indigo-400',
  proposal: 'bg-purple-400/15 text-purple-400',
  active: 'bg-emerald-400/15 text-emerald-400',
  paused: 'bg-amber-400/15 text-amber-400',
  churned: 'bg-red-400/15 text-red-400',
};

const HEALTH_COLORS: Record<string, string> = {
  green: 'bg-emerald-400', yellow: 'bg-amber-400', red: 'bg-red-400', gray: 'bg-white/20',
};

function staleIndicator(daysInStage: number, status: string): { text: string; color: string } | null {
  const isProposal = status === 'proposal';
  const isLeadLike = ['lead', 'prospect'].includes(status);
  if (!isLeadLike && !isProposal) return null;
  if (isProposal) {
    if (daysInStage >= 14) return { text: 'Stale', color: 'text-red-400' };
    if (daysInStage >= 7) return { text: 'Going cold', color: 'text-amber-400' };
  } else {
    if (daysInStage >= 30) return { text: 'Stale', color: 'text-red-400' };
    if (daysInStage >= 14) return { text: 'Going cold', color: 'text-amber-400' };
  }
  return null;
}

export default function PipelinePage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('pipelineView') as 'kanban' | 'table') || 'kanban';
    return 'kanban';
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('days_desc');
  const [noteModal, setNoteModal] = useState<{ clientId: string; businessName: string } | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [taskModal, setTaskModal] = useState<{ clientId: string; businessName: string } | null>(null);
  const [activateModal, setActivateModal] = useState<{ clientId: string; businessName: string; hasEmail: boolean; alreadySent: boolean } | null>(null);
  const [activating, setActivating] = useState(false);
  const [activateMessage, setActivateMessage] = useState<string | null>(null);

  const toggleView = (mode: 'kanban' | 'table') => { setViewMode(mode); localStorage.setItem('pipelineView', mode); };

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setClients(data); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Enrich with daysInStage
  const enriched = useMemo(() => clients.map(c => {
    const changedAt = c.statusChangedAt || c.updatedAt || c.createdAt;
    const daysInStage = Math.floor((Date.now() - new Date(changedAt).getTime()) / (1000 * 60 * 60 * 24));
    return { ...c, daysInStage };
  }), [clients]);

  const handleDrop = async (clientId: string, newStatus: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    // Intercept moves INTO 'active' so we can prompt about the welcome email.
    // Other moves go straight through.
    if (newStatus === 'active' && client.status !== 'active') {
      setActivateModal({
        clientId,
        businessName: client.businessName,
        hasEmail: !!client.email,
        alreadySent: !!client.onboardingEmailSentAt,
      });
      return;
    }

    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus, statusChangedAt: new Date().toISOString() } : c));
    await fetch(`/api/clients/${clientId}/move`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
  };

  const handleActivate = async (sendWelcome: boolean) => {
    if (!activateModal) return;
    setActivating(true);
    try {
      const res = await fetch(`/api/clients/${activateModal.clientId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendWelcome }),
      });
      if (res.ok) {
        const data = await res.json();
        setClients(prev => prev.map(c => c.id === activateModal.clientId
          ? { ...c, status: 'active', statusChangedAt: new Date().toISOString(), onboardingEmailSentAt: data.emailSent ? new Date().toISOString() : c.onboardingEmailSentAt }
          : c
        ));
        const parts: string[] = [`${activateModal.businessName} activated`];
        if (data.emailSent) parts.push('welcome email sent');
        else if (sendWelcome && data.emailSkippedReason) parts.push(`email skipped (${data.emailSkippedReason})`);
        if (data.tasksCreated > 0) parts.push(`${data.tasksCreated} onboarding tasks created`);
        setActivateMessage(parts.join(' · '));
        setTimeout(() => setActivateMessage(null), 5000);
      }
    } catch { /* */ } finally {
      setActivating(false);
      setActivateModal(null);
    }
  };

  const handleQuickAction = (clientId: string, action: 'note' | 'task') => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    if (action === 'note') setNoteModal({ clientId, businessName: client.businessName });
    else setTaskModal({ clientId, businessName: client.businessName });
  };

  const handleAddNote = async () => {
    if (!noteModal || !noteContent.trim()) return;
    await fetch(`/api/clients/${noteModal.clientId}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: noteContent.trim() }) });
    setNoteContent(''); setNoteModal(null);
  };

  // Filtered + sorted for table view
  const filtered = useMemo(() => {
    let arr = [...enriched];
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(c =>
        c.businessName?.toLowerCase().includes(q) ||
        c.contactName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) arr = arr.filter(c => c.status === statusFilter);
    switch (sortBy) {
      case 'days_desc': return arr.sort((a, b) => (b.daysInStage || 0) - (a.daysInStage || 0));
      case 'days_asc': return arr.sort((a, b) => (a.daysInStage || 0) - (b.daysInStage || 0));
      case 'revenue_desc': return arr.sort((a, b) => (b.monthlyRevenue || 0) - (a.monthlyRevenue || 0));
      case 'revenue_asc': return arr.sort((a, b) => (a.monthlyRevenue || 0) - (b.monthlyRevenue || 0));
      case 'name_az': return arr.sort((a, b) => a.businessName.localeCompare(b.businessName));
      case 'status': return arr.sort((a, b) => {
        const order = ['lead', 'prospect', 'proposal', 'active', 'paused', 'churned'];
        return order.indexOf(a.status) - order.indexOf(b.status);
      });
      default: return arr;
    }
  }, [enriched, search, statusFilter, sortBy]);

  // Revenue calculations
  const activeRevenue = enriched.filter(c => c.status === 'active').reduce((s, c) => s + (c.monthlyRevenue || 0), 0);
  const pipelineRevenue = enriched.filter(c => ['lead', 'prospect', 'proposal'].includes(c.status)).reduce((s, c) => s + (c.monthlyRevenue || 0), 0);
  const pipelineCount = enriched.filter(c => ['lead', 'prospect', 'proposal'].includes(c.status)).length;
  const activeCount = enriched.filter(c => c.status === 'active').length;
  const totalFunnel = pipelineCount + activeCount;
  const conversionRate = totalFunnel > 0 ? Math.round((activeCount / totalFunnel) * 100) : 0;

  if (loading) return <PageLoader text="Loading pipeline..." />;

  return (
    <div className="max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">Pipeline</h1>
          <p className="text-sm text-white/40 mt-1">
            {clients.length} clients · <span className="text-emerald-400/70">${activeRevenue.toLocaleString()}/mo active</span> · <span className="text-blue-400/70">${pipelineRevenue.toLocaleString()}/mo in pipeline</span>
          </p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => toggleView('kanban')} title="Kanban view" className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-accent/20 text-accent' : 'text-white/30 hover:text-white/50'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>
          </button>
          <button onClick={() => toggleView('table')} title="List view" className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-accent/20 text-accent' : 'text-white/30 hover:text-white/50'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h2.25m-2.25 0c-.621 0-1.125.504-1.125 1.125M12 12c.621 0 1.125.504 1.125 1.125m-2.25 0v1.5c0 .621.504 1.125 1.125 1.125m0-3.75c.621 0 1.125.504 1.125 1.125" /></svg>
          </button>
        </div>
      </div>

      {/* Conversion Funnel Bar */}
      <div className="glass p-3 mb-4 flex items-center gap-3 overflow-x-auto text-xs">
        {['lead', 'prospect', 'proposal', 'active'].map((stage, i) => {
          const count = enriched.filter(c => c.status === stage).length;
          const rev = enriched.filter(c => c.status === stage).reduce((s, c) => s + (c.monthlyRevenue || 0), 0);
          const col = PIPELINE_COLUMNS.find(c => c.status === stage)!;
          return (
            <div key={stage} className="flex items-center gap-3 shrink-0">
              <div className="text-center">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${col.color}`} />
                  <span className="text-white/50">{col.label} ({count})</span>
                </div>
                <p className="text-[10px] text-white/25">${rev.toLocaleString()}</p>
              </div>
              {i < 3 && <span className="text-white/15">→</span>}
            </div>
          );
        })}
        <div className="ml-auto shrink-0 text-white/25">
          Conversion: <span className="text-accent">{conversionRate}%</span>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="grid grid-cols-6 gap-3">
          {PIPELINE_COLUMNS.map(col => (
            <PipelineColumn
              key={col.status}
              status={col.status}
              label={col.label}
              color={col.color}
              revenueLabel={col.revenueLabel}
              clients={enriched.filter(c => c.status === col.status)}
              onDrop={handleDrop}
              onQuickAction={handleQuickAction}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <>
          {/* Status Tabs */}
          <div className="flex gap-1 mb-4 overflow-x-auto">
            {[
              { value: '', label: 'All', count: enriched.length },
              ...PIPELINE_COLUMNS.map(col => ({ value: col.status, label: col.label, count: enriched.filter(c => c.status === col.status).length })),
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-4 py-2 rounded-xl text-sm transition-all duration-200 shrink-0 ${statusFilter === tab.value ? 'glass-active text-accent' : 'text-white/40 hover:bg-white/5'}`}
              >
                {tab.label} <span className="text-xs text-white/20 ml-1">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <input type="text" placeholder="Search pipeline..." value={search} onChange={e => setSearch(e.target.value)} className="glass-subtle px-4 py-2 rounded-xl text-sm w-56 border-none" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="glass-subtle px-4 py-2 rounded-xl text-sm border-none">
              <option value="days_desc">Days in stage (longest)</option>
              <option value="days_asc">Days in stage (shortest)</option>
              <option value="revenue_desc">Revenue (high to low)</option>
              <option value="revenue_asc">Revenue (low to high)</option>
              <option value="status">Stage order</option>
              <option value="name_az">Name (A-Z)</option>
            </select>
            <span className="ml-auto text-xs text-white/25">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="glass p-12 text-center">
              <p className="text-white/30 text-sm">No clients match your filters</p>
            </div>
          ) : (
            <div className="glass overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 text-white/40 font-medium">Client</th>
                    <th className="text-left p-3 text-white/40 font-medium">Contact</th>
                    <th className="text-left p-3 text-white/40 font-medium">Stage</th>
                    <th className="text-right p-3 text-white/40 font-medium">Revenue</th>
                    <th className="text-left p-3 text-white/40 font-medium">Package</th>
                    <th className="text-right p-3 text-white/40 font-medium">Days in Stage</th>
                    <th className="text-left p-3 text-white/40 font-medium">Alert</th>
                    <th className="text-center p-3 text-white/40 font-medium">Health</th>
                    <th className="text-center p-3 text-white/40 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const stale = staleIndicator(c.daysInStage, c.status);
                    return (
                      <tr key={c.id} className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                        <td className="p-3">
                          <Link href={`/clients/${c.id}`} className="text-white/70 hover:text-accent">{c.businessName}</Link>
                          {c.businessType && <p className="text-[10px] text-white/25 mt-0.5">{c.businessType}{c.city ? ` · ${c.city}` : ''}</p>}
                        </td>
                        <td className="p-3 text-white/40">{c.contactName || '--'}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${STATUS_COLORS[c.status] || 'bg-white/10 text-white/40'}`}>{PIPELINE_COLUMNS.find(col => col.status === c.status)?.label || c.status}</span></td>
                        <td className="p-3 text-right text-accent">{c.monthlyRevenue ? `$${c.monthlyRevenue.toLocaleString()}` : '--'}</td>
                        <td className="p-3 text-white/40">{c.package?.name || '--'}</td>
                        <td className="p-3 text-right text-white/50">{c.daysInStage}d</td>
                        <td className="p-3">{stale ? <span className={`text-[10px] ${stale.color}`}>{stale.text}</span> : <span className="text-white/15">--</span>}</td>
                        <td className="p-3 text-center">{c.status === 'active' ? <div className={`w-2.5 h-2.5 rounded-full mx-auto ${HEALTH_COLORS[c.health] || 'bg-white/20'}`} /> : <span className="text-white/15">--</span>}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleQuickAction(c.id, 'task')} className="text-[10px] text-white/30 hover:text-white/60 px-1.5 py-0.5 rounded hover:bg-white/5">+task</button>
                            <button onClick={() => handleQuickAction(c.id, 'note')} className="text-[10px] text-white/30 hover:text-white/60 px-1.5 py-0.5 rounded hover:bg-white/5">+note</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Quick Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setNoteModal(null)} />
          <div className="glass-elevated p-6 w-full max-w-md relative z-10">
            <h2 className="text-sm font-medium text-white/80 mb-4">Add Note — {noteModal.businessName}</h2>
            <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Write a note..." rows={4} className="resize-none text-sm mb-4" autoFocus />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setNoteModal(null)} className="px-3 py-1.5 rounded-lg border border-white/15 text-white/40 text-xs">Cancel</button>
              <button onClick={handleAddNote} disabled={!noteContent.trim()} className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs disabled:opacity-40">Add Note</button>
            </div>
          </div>
        </div>
      )}

      {taskModal && (
        <CreateTaskModal isOpen={true} onClose={() => setTaskModal(null)} onCreated={() => { setTaskModal(null); fetchClients(); }} defaultClientId={taskModal.clientId} defaultTitle={`[${taskModal.businessName}] `} />
      )}

      {/* Activate Client Modal */}
      {activateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !activating && setActivateModal(null)} />
          <div className="glass-elevated p-6 w-full max-w-md relative z-10">
            <h2 className="text-base font-medium text-white/90 mb-2">Activate {activateModal.businessName}?</h2>
            <p className="text-xs text-white/50 mb-4 leading-relaxed">
              This will mark the client as active and create an onboarding checklist (11 tasks) on their profile.
            </p>

            <div className="glass-subtle p-3 mb-4 text-xs">
              <p className="text-white/70 mb-1.5 font-medium">Send welcome email?</p>
              <p className="text-white/40 leading-relaxed">
                Includes a one-click login link to their portal and instructions for submitting change requests.
              </p>
              {!activateModal.hasEmail && (
                <p className="text-amber-400/80 mt-2">⚠ No email address on file — email cannot be sent.</p>
              )}
              {activateModal.alreadySent && (
                <p className="text-amber-400/80 mt-2">⚠ A welcome email was already sent previously. Sending again will create a new login link.</p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setActivateModal(null)}
                disabled={activating}
                className="px-3 py-1.5 rounded-lg border border-white/15 text-white/50 text-xs hover:bg-white/5 transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={() => handleActivate(false)}
                disabled={activating}
                className="px-3 py-1.5 rounded-lg border border-white/15 text-white/60 text-xs hover:bg-white/5 transition-all disabled:opacity-40"
              >
                Activate without email
              </button>
              <button
                onClick={() => handleActivate(true)}
                disabled={activating || !activateModal.hasEmail}
                className="px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/30 text-accent text-xs hover:bg-accent/30 transition-all disabled:opacity-40"
              >
                {activating ? 'Activating...' : 'Activate & send welcome'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activation Toast */}
      {activateMessage && (
        <div className="fixed bottom-6 right-6 z-50 glass-elevated px-4 py-3 border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 text-xs max-w-md">
          ✓ {activateMessage}
        </div>
      )}
    </div>
  );
}
