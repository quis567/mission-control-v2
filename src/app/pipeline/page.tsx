'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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

export default function PipelinePage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteModal, setNoteModal] = useState<{ clientId: string; businessName: string } | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [taskModal, setTaskModal] = useState<{ clientId: string; businessName: string } | null>(null);
  const [activateModal, setActivateModal] = useState<{ clientId: string; businessName: string; hasEmail: boolean; alreadySent: boolean } | null>(null);
  const [activating, setActivating] = useState(false);
  const [activateMessage, setActivateMessage] = useState<string | null>(null);

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

      {/* Pipeline Columns */}
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
