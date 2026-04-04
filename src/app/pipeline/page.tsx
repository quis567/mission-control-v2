'use client';

import { useState, useEffect, useCallback } from 'react';
import PipelineColumn from '@/components/PipelineColumn';
import CreateTaskModal from '@/components/CreateTaskModal';

const PIPELINE_COLUMNS = [
  { status: 'lead', label: 'Lead', color: 'bg-sky-400' },
  { status: 'prospect', label: 'Prospect', color: 'bg-amber-400' },
  { status: 'proposal', label: 'Proposal', color: 'bg-blue-400' },
  { status: 'active', label: 'Active Client', color: 'bg-emerald-400' },
  { status: 'paused', label: 'Paused', color: 'bg-orange-400' },
  { status: 'churned', label: 'Churned', color: 'bg-red-400' },
];

export default function PipelinePage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteModal, setNoteModal] = useState<{ clientId: string; businessName: string } | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [taskModal, setTaskModal] = useState<{ clientId: string; businessName: string } | null>(null);

  const fetchClients = useCallback(async () => {
    const res = await fetch('/api/clients');
    setClients(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleDrop = async (clientId: string, newStatus: string) => {
    // Optimistic update
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus, updatedAt: new Date().toISOString() } : c));

    await fetch(`/api/clients/${clientId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const handleQuickAction = (clientId: string, action: 'note' | 'task') => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    if (action === 'note') {
      setNoteModal({ clientId, businessName: client.businessName });
    } else {
      setTaskModal({ clientId, businessName: client.businessName });
    }
  };

  const handleAddNote = async () => {
    if (!noteModal || !noteContent.trim()) return;
    await fetch(`/api/clients/${noteModal.clientId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteContent.trim() }),
    });
    setNoteContent('');
    setNoteModal(null);
  };

  const totalRevenue = clients.filter(c => c.status === 'active').reduce((s, c) => s + (c.monthlyRevenue || 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-white/30 text-sm">Loading pipeline...</div></div>;
  }

  return (
    <div className="max-w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">Pipeline</h1>
          <p className="text-sm text-white/40 mt-1">
            {clients.length} clients · ${totalRevenue.toLocaleString()}/mo active revenue
          </p>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {PIPELINE_COLUMNS.map(col => (
          <PipelineColumn
            key={col.status}
            status={col.status}
            label={col.label}
            color={col.color}
            clients={clients.filter(c => c.status === col.status)}
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
            <textarea
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              placeholder="Write a note..."
              rows={4}
              className="resize-none text-sm mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setNoteModal(null)} className="px-3 py-1.5 rounded-lg border border-white/15 text-white/40 text-xs">Cancel</button>
              <button onClick={handleAddNote} disabled={!noteContent.trim()} className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs disabled:opacity-40">Add Note</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {taskModal && (
        <CreateTaskModal
          isOpen={true}
          onClose={() => setTaskModal(null)}
          onCreated={() => { setTaskModal(null); fetchClients(); }}
          defaultClientId={taskModal.clientId}
          defaultTitle={`[${taskModal.businessName}] `}
        />
      )}
    </div>
  );
}
