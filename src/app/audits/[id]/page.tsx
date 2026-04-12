'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageLoader } from '@/components/Spinner';

interface AuditDetail {
  id: string;
  name: string;
  email: string;
  businessName: string;
  websiteUrl: string;
  results: {
    pageSpeedMobile: number | null;
    pageSpeedDesktop: number | null;
    mobileFriendly: boolean;
    ssl: boolean;
    hasMetaTitle: boolean;
    hasMetaDescription: boolean;
    imageAltTags: { total: number; withAlt: number };
    loadTime: number | null;
  } | null;
  emailSubject: string | null;
  emailBody: string | null;
  leadId: string | null;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/audit/${id}`)
      .then(r => r.json())
      .then(data => {
        setAudit(data);
        setSubject(data.emailSubject || '');
        setBody(data.emailBody || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const saveDraft = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await fetch(`/api/audit/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailSubject: subject, emailBody: body }),
      });
      setMessage({ type: 'success', text: 'Draft saved' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save draft' });
    }
    setSaving(false);
  };

  const sendEmail = async () => {
    if (!confirm(`Send this email to ${audit?.email}?`)) return;
    setSending(true);
    setMessage(null);
    try {
      // Save latest draft first
      await fetch(`/api/audit/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailSubject: subject, emailBody: body }),
      });
      const res = await fetch(`/api/audit/${id}/send`, { method: 'POST' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Email sent!' });
        setAudit(prev => prev ? { ...prev, status: 'emailed', sentAt: new Date().toISOString() } : prev);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to send' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send email' });
    }
    setSending(false);
  };

  if (loading) return <PageLoader />;
  if (!audit) return <div className="p-8 text-white/50">Audit not found.</div>;

  const r = audit.results;

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/audits" className="text-white/40 hover:text-white/70 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white/90">{audit.businessName}</h1>
          <p className="text-white/40 text-sm">
            {audit.name} &middot; {audit.email} &middot; <a href={audit.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{audit.websiteUrl}</a>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {audit.status === 'emailed' && audit.sentAt && (
            <span className="text-xs text-emerald-400">Sent {new Date(audit.sentAt).toLocaleDateString()}</span>
          )}
          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
            audit.status === 'emailed' ? 'bg-emerald-400/15 text-emerald-400' :
            audit.status === 'completed' ? 'bg-blue-400/15 text-blue-400' :
            'bg-amber-400/15 text-amber-400'
          }`}>
            {audit.status}
          </span>
        </div>
      </div>

      {/* Audit Scores */}
      {r && (
        <div className="glass p-6 mb-6">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Audit Results</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ScoreCard label="Mobile Speed" value={r.pageSpeedMobile} suffix="/100" />
            <ScoreCard label="Desktop Speed" value={r.pageSpeedDesktop} suffix="/100" />
            <BoolCard label="Mobile Friendly" value={r.mobileFriendly} />
            <BoolCard label="SSL Secure" value={r.ssl} />
            <BoolCard label="Meta Title" value={r.hasMetaTitle} />
            <BoolCard label="Meta Description" value={r.hasMetaDescription} />
            <div className="glass-subtle p-4">
              <p className="text-xs text-white/50 mb-1">Image Alt Tags</p>
              <p className="text-lg font-semibold text-white/90">
                {r.imageAltTags.withAlt}<span className="text-white/40">/{r.imageAltTags.total}</span>
              </p>
            </div>
            <div className="glass-subtle p-4">
              <p className="text-xs text-white/50 mb-1">Load Time</p>
              <p className={`text-lg font-semibold ${
                r.loadTime === null ? 'text-white/30' : r.loadTime <= 3 ? 'text-emerald-400' : r.loadTime <= 5 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {r.loadTime !== null ? `${r.loadTime}s` : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Email Editor */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Email Draft</h2>
          {audit.leadId && (
            <Link href={`/clients/${audit.leadId}`} className="text-xs text-cyan-400 hover:underline">
              View lead in CRM
            </Link>
          )}
        </div>

        {message && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-emerald-400/15 text-emerald-400' : 'bg-red-400/15 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs text-white/50 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/90 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs text-white/50 mb-1">Body</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={24}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white/90 leading-relaxed font-mono focus:outline-none focus:border-cyan-500/50 transition-colors resize-y"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={saveDraft}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={sendEmail}
            disabled={sending || audit.status === 'emailed'}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : audit.status === 'emailed' ? 'Already Sent' : `Send to ${audit.email}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  const color = value === null ? 'text-white/30' : value >= 80 ? 'text-emerald-400' : value >= 50 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="glass-subtle p-4">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>
        {value !== null ? `${value}${suffix || ''}` : '—'}
      </p>
    </div>
  );
}

function BoolCard({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="glass-subtle p-4">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${value ? 'text-emerald-400' : 'text-red-400'}`}>
        {value ? 'Yes' : 'No'}
      </p>
    </div>
  );
}
