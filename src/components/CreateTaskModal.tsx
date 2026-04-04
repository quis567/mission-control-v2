'use client';

import { useState, useEffect } from 'react';
import type { Agent, WorkflowTemplate } from '@/lib/agents';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultClientId?: string;
  defaultTitle?: string;
}

export default function CreateTaskModal({ isOpen, onClose, onCreated, defaultClientId, defaultTitle }: CreateTaskModalProps) {
  const [title, setTitle] = useState(defaultTitle || '');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [agentId, setAgentId] = useState('');
  const [workflowId, setWorkflowId] = useState('');
  const [clientId, setClientId] = useState(defaultClientId || '');
  const [executionMode, setExecutionMode] = useState<'auto' | 'api' | 'openclaw'>('auto');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [clients, setClients] = useState<{ id: string; businessName: string }[]>([]);
  const [openclawAvailable, setOpenclawAvailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/agents').then(r => r.json()).then(setAgents);
      fetch('/api/workflows').then(r => r.json()).then(setWorkflows);
      fetch('/api/clients').then(r => r.json()).then(setClients).catch(() => {});
      fetch('/api/agents/openclaw-status').then(r => r.json()).then(d => setOpenclawAvailable(d.available)).catch(() => setOpenclawAvailable(false));
      if (defaultTitle) setTitle(defaultTitle);
      if (defaultClientId) setClientId(defaultClientId);
    }
  }, [isOpen, defaultTitle, defaultClientId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          assigned_agent_id: agentId || undefined,
          workflow_template_id: workflowId || undefined,
          client_id: clientId || undefined,
          execution_mode: executionMode,
        }),
      });

      setTitle('');
      setDescription('');
      setPriority('normal');
      setAgentId('');
      setWorkflowId('');
      setClientId('');
      setExecutionMode('auto');
      onCreated();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-elevated p-8 w-full max-w-lg relative z-10">
        <h2 className="text-xl font-light tracking-wide text-white mb-6">Create Task</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide details, context, or links..."
              rows={3}
              className="mt-1 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="mt-1">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">Assign Agent</label>
              <select value={agentId} onChange={e => setAgentId(e.target.value)} className="mt-1">
                <option value="">Auto (Ops Manager)</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider">Client (optional)</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className="mt-1">
              <option value="">No client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.businessName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">Workflow</label>
              <select value={workflowId} onChange={e => setWorkflowId(e.target.value)} className="mt-1">
                <option value="">None</option>
                {workflows.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">Execution Mode</label>
              <div className="flex gap-2 mt-2">
                {(['auto', 'api', 'openclaw'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setExecutionMode(mode)}
                    disabled={mode === 'openclaw' && !openclawAvailable}
                    className={`flex-1 py-1.5 rounded-lg text-xs transition-all duration-200 border
                      ${executionMode === mode
                        ? 'bg-accent/20 border-accent/30 text-accent'
                        : 'border-white/10 text-white/40 hover:bg-white/5'}
                      ${mode === 'openclaw' && !openclawAvailable ? 'opacity-30 cursor-not-allowed' : ''}
                    `}
                  >
                    {mode === 'auto' ? 'Auto' : mode === 'api' ? 'API' : 'Local'}
                  </button>
                ))}
              </div>
              {executionMode === 'openclaw' && !openclawAvailable && (
                <p className="text-xs text-amber-400/70 mt-1">OpenClaw not detected</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60 hover:bg-white/10 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="flex-1 py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 transition-all duration-200 disabled:opacity-40"
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
