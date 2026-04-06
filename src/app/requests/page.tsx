'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageLoader } from '@/components/Spinner';

interface ChangeRequest {
  id: string;
  clientId: string;
  changeType: string;
  pageLocation: string;
  details: string;
  priority: string;
  status: string;
  files: string | null;
  generatedPrompt: string | null;
  internalNotes: string | null;
  submittedAt: string;
  completedAt: string | null;
  client: {
    id: string;
    businessName: string;
    contactName: string | null;
    email: string | null;
    slug: string | null;
    websites: { url: string }[];
  };
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-400/15 text-blue-400',
  'in_progress': 'bg-amber-400/15 text-amber-400',
  complete: 'bg-emerald-400/15 text-emerald-400',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  'in_progress': 'In Progress',
  complete: 'Complete',
};

export default function RequestsDashboard() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRequests = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterPriority) params.set('priority', filterPriority);

    const res = await fetch(`/api/change-requests?${params}`);
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  }, [filterStatus, filterPriority]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const updateStatus = async (id: string, status: string) => {
    setSaving(true);
    const res = await fetch(`/api/change-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRequests(prev => prev.map(r => r.id === id ? updated : r));
      if (selectedRequest?.id === id) setSelectedRequest(updated);
    }
    setSaving(false);
  };

  const saveNotes = async (id: string) => {
    setSaving(true);
    const res = await fetch(`/api/change-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internalNotes: notes }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRequests(prev => prev.map(r => r.id === id ? updated : r));
      setSelectedRequest(updated);
    }
    setSaving(false);
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openDetail = (req: ChangeRequest) => {
    setSelectedRequest(req);
    setNotes(req.internalNotes || '');
    setCopied(false);
  };

  // Stats
  const newCount = requests.filter(r => r.status === 'new').length;
  const inProgressCount = requests.filter(r => r.status === 'in_progress').length;
  const completeCount = requests.filter(r => r.status === 'complete').length;
  const urgentCount = requests.filter(r => r.priority === 'urgent' && r.status !== 'complete').length;

  if (loading) return <PageLoader text="Loading requests..." />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Change Requests</h1>
        <p className="text-white/40 text-sm mt-1">Client website change requests with auto-generated prompts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'New', value: newCount, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'In Progress', value: inProgressCount, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { label: 'Complete', value: completeCount, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
          { label: 'Urgent', value: urgentCount, color: 'text-red-400', bg: 'bg-red-400/10' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-white/40 text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/50"
        >
          <option value="" className="bg-[#1a1a2e]">All statuses</option>
          <option value="new" className="bg-[#1a1a2e]">New</option>
          <option value="in_progress" className="bg-[#1a1a2e]">In Progress</option>
          <option value="complete" className="bg-[#1a1a2e]">Complete</option>
        </select>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400/50"
        >
          <option value="" className="bg-[#1a1a2e]">All priorities</option>
          <option value="normal" className="bg-[#1a1a2e]">Normal</option>
          <option value="urgent" className="bg-[#1a1a2e]">Urgent</option>
        </select>
      </div>

      {/* Request list */}
      {requests.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-white/40">No change requests yet</p>
          <p className="text-white/25 text-sm mt-1">Requests will appear here when clients submit them</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(req => (
            <button
              key={req.id}
              onClick={() => openDetail(req)}
              className={`w-full text-left glass rounded-xl p-4 hover:bg-white/5 transition-all ${
                selectedRequest?.id === req.id ? 'ring-1 ring-cyan-400/30' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-white font-medium truncate">{req.client.businessName}</span>
                  <span className="text-white/30">—</span>
                  <span className="text-white/60 text-sm truncate">{req.changeType}</span>
                  <span className="text-white/20 text-sm hidden sm:inline">on {req.pageLocation}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {req.priority === 'urgent' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-400/15 text-red-400">Urgent</span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                    {STATUS_LABELS[req.status]}
                  </span>
                  <span className="text-white/25 text-xs">
                    {new Date(req.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className="text-white/30 text-sm mt-1 truncate">{req.details}</p>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedRequest(null)}>
          <div className="glass-elevated rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-5" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{selectedRequest.client.businessName}</h2>
                  {selectedRequest.priority === 'urgent' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-400/15 text-red-400">Urgent</span>
                  )}
                </div>
                {selectedRequest.client.websites[0] && (
                  <a href={selectedRequest.client.websites[0].url} target="_blank" rel="noopener noreferrer" className="text-cyan-400/60 text-sm hover:text-cyan-400 transition-colors">
                    {selectedRequest.client.websites[0].url}
                  </a>
                )}
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-white/30 hover:text-white/60 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/40">Change type</span>
                <p className="text-white mt-0.5">{selectedRequest.changeType}</p>
              </div>
              <div>
                <span className="text-white/40">Page</span>
                <p className="text-white mt-0.5">{selectedRequest.pageLocation}</p>
              </div>
              <div>
                <span className="text-white/40">Submitted</span>
                <p className="text-white mt-0.5">{new Date(selectedRequest.submittedAt).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-white/40">Status</span>
                <div className="mt-1">
                  <select
                    value={selectedRequest.status}
                    onChange={e => updateStatus(selectedRequest.id, e.target.value)}
                    disabled={saving}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-400/50"
                  >
                    <option value="new" className="bg-[#1a1a2e]">New</option>
                    <option value="in_progress" className="bg-[#1a1a2e]">In Progress</option>
                    <option value="complete" className="bg-[#1a1a2e]">Complete</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Client message */}
            <div>
              <span className="text-white/40 text-sm">Client&apos;s message</span>
              <div className="mt-1 bg-white/5 rounded-xl p-4 text-white text-sm whitespace-pre-wrap">{selectedRequest.details}</div>
            </div>

            {/* Uploaded files */}
            {selectedRequest.files && (() => {
              try {
                const fileList = JSON.parse(selectedRequest.files) as { name: string; url: string }[];
                if (!fileList.length) return null;
                return (
                  <div>
                    <span className="text-white/40 text-sm">Uploaded files</span>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {fileList.map((f, i) => (
                        <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="bg-white/5 rounded-lg p-2 hover:bg-white/10 transition-colors block">
                          {f.name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                            <img src={f.url} alt={f.name} className="w-full h-24 object-cover rounded mb-1" />
                          ) : (
                            <div className="w-full h-24 flex items-center justify-center">
                              <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                            </div>
                          )}
                          <p className="text-[10px] text-white/40 truncate">{f.name}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              } catch { return null; }
            })()}

            {/* Generated Prompt */}
            {selectedRequest.generatedPrompt && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/40 text-sm">Claude Code Prompt</span>
                  <button
                    onClick={() => copyPrompt(selectedRequest.generatedPrompt!)}
                    className={`text-xs px-3 py-1 rounded-lg transition-all ${
                      copied ? 'bg-emerald-400/15 text-emerald-400' : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy prompt'}
                  </button>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-cyan-300/80 text-sm font-mono whitespace-pre-wrap border border-cyan-400/10">
                  {selectedRequest.generatedPrompt}
                </div>
              </div>
            )}

            {/* Internal Notes */}
            <div>
              <span className="text-white/40 text-sm">Internal notes</span>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Add internal notes..."
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-cyan-400/50 transition-colors resize-none"
              />
              {notes !== (selectedRequest.internalNotes || '') && (
                <button
                  onClick={() => saveNotes(selectedRequest.id)}
                  disabled={saving}
                  className="mt-2 px-4 py-1.5 rounded-lg text-sm bg-white/10 text-white hover:bg-white/15 transition-all disabled:opacity-40"
                >
                  {saving ? 'Saving...' : 'Save notes'}
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2 border-t border-white/5">
              {selectedRequest.status !== 'complete' && (
                <button
                  onClick={() => updateStatus(selectedRequest.id, 'complete')}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-40"
                >
                  Mark Complete
                </button>
              )}
              {selectedRequest.status === 'new' && (
                <button
                  onClick={() => updateStatus(selectedRequest.id, 'in_progress')}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-all disabled:opacity-40"
                >
                  Start Working
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
