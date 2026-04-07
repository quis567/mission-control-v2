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

export default function PortalRequests() {
  const { client, loading: authLoading } = usePortalAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    const params = filter ? `?status=${filter}` : '';
    const res = await portalFetch(`/api/portal/requests${params}`);
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (authLoading) return;
    if (!client) { router.push('/portal/login'); return; }
    fetchRequests();
  }, [client, authLoading, router, fetchRequests]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <h1 className="text-xl font-bold text-white mb-1">Request History</h1>
      <p className="text-white/40 text-sm mb-6">All your website change requests</p>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {[
          { value: '', label: 'All' },
          { value: 'open', label: 'Open' },
          { value: 'complete', label: 'Completed' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setLoading(true); }}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              filter === f.value ? 'bg-accent/20 text-accent' : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-white/30 text-sm">No requests found</div>
      ) : (
        <div className="space-y-2">
          {requests.map(req => (
            <button
              key={req.id}
              onClick={() => setExpanded(expanded === req.id ? null : req.id)}
              className="w-full text-left glass rounded-xl p-4 hover:bg-white/5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium">{req.changeType}</p>
                  <p className="text-xs text-white/30">{req.pageLocation} · {new Date(req.submittedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                    {STATUS_LABELS[req.status]}
                  </span>
                  <svg className={`w-4 h-4 text-white/20 transition-transform ${expanded === req.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
              {expanded === req.id && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                  <div>
                    <span className="text-xs text-white/30">Details</span>
                    <p className="text-sm text-white/60 whitespace-pre-wrap mt-0.5">{req.details}</p>
                  </div>
                  {req.priority === 'urgent' && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-red-400/15 text-red-400">Urgent</span>
                  )}
                  {req.completedAt && (
                    <p className="text-xs text-white/25">Completed {new Date(req.completedAt).toLocaleDateString()}</p>
                  )}
                  {req.files && (() => {
                    try {
                      const fileList = JSON.parse(req.files) as { name: string; url: string }[];
                      if (!fileList.length) return null;
                      return (
                        <div className="flex gap-2 flex-wrap">
                          {fileList.map((f, i) => (
                            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="block">
                              {f.name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                                <img src={f.url} alt={f.name} className="w-16 h-16 object-cover rounded-lg" />
                              ) : (
                                <span className="text-xs text-cyan-400 underline">{f.name}</span>
                              )}
                            </a>
                          ))}
                        </div>
                      );
                    } catch { return null; }
                  })()}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
