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
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<{ success: boolean; message: string; taskId?: string } | null>(null);

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
    setExecResult(null);
    try {
      // 1. Create the task
      const effectiveAgentId = agentId || 'ops-manager';
      const createRes = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          assigned_agent_id: effectiveAgentId,
          workflow_template_id: workflowId || undefined,
          client_id: clientId || undefined,
        }),
      });
      const created = await createRes.json();

      if (!created.id) {
        setExecResult({ success: false, message: 'Failed to create task' });
        return;
      }

      // 2. Auto-execute if an agent is assigned
      setExecuting(true);
      const mode = executionMode === 'auto' ? 'api' : executionMode;
      const execRes = await fetch(`/api/tasks/${created.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const execData = await execRes.json();

      if (execRes.ok) {
        setExecResult({
          success: true,
          message: execData.message || 'Task completed',
          taskId: created.id,
        });
      } else {
        setExecResult({
          success: false,
          message: execData.error || 'Execution failed',
          taskId: created.id,
        });
      }

      onCreated();
    } catch (err) {
      setExecResult({ success: false, message: String(err) });
    } finally {
      setSubmitting(false);
      setExecuting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPriority('normal');
    setAgentId('');
    setWorkflowId('');
    setClientId('');
    setExecutionMode('auto');
    setExecResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="glass-elevated p-8 w-full max-w-lg relative z-10 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-light tracking-wide text-white mb-6">Create Task</h2>

        {/* Execution result */}
        {execResult && (
          <div className={`mb-6 p-4 rounded-xl border ${execResult.success ? 'bg-emerald-400/10 border-emerald-400/20' : 'bg-red-400/10 border-red-400/20'}`}>
            <p className={`text-sm ${execResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {execResult.success ? 'Task executed successfully' : 'Execution failed'}
            </p>
            <p className="text-xs text-white/40 mt-1">{execResult.message}</p>
            <div className="flex gap-2 mt-3">
              {execResult.taskId && (
                <a href={`/tasks/${execResult.taskId}`} className="text-xs text-accent hover:text-accent/80">View Task</a>
              )}
              <button onClick={handleClose} className="text-xs text-white/40 hover:text-white/60">Close</button>
            </div>
          </div>
        )}

        {/* Executing spinner */}
        {executing && (
          <div className="mb-6 p-6 glass-subtle text-center">
            <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/60">Agent is working...</p>
            <p className="text-xs text-white/30 mt-1">This may take a few seconds</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`space-y-5 ${execResult ? 'hidden' : ''}`}>
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
              onClick={handleClose}
              disabled={executing}
              className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60 hover:bg-white/10 transition-all duration-200 disabled:opacity-30"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || executing || !title.trim()}
              className="flex-1 py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 transition-all duration-200 disabled:opacity-40"
            >
              {executing ? 'Executing...' : submitting ? 'Creating...' : 'Create & Execute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
