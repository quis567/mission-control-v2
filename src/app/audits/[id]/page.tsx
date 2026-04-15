'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageLoader } from '@/components/Spinner';

interface CategoryScore {
  score: number;
  checks: { name: string; score: number; maxScore: number }[];
}

interface CategoryScores {
  designElements: CategoryScore;
  messagingHeadlines: CategoryScore;
  seoFoundation: CategoryScore;
  conversionElements: CategoryScore;
  mobileExperience: CategoryScore;
  contentStructure: CategoryScore;
  overall: number;
}

interface AuditResults {
  pageSpeedMobile: number | null;
  pageSpeedDesktop: number | null;
  mobileFriendly: boolean;
  ssl: boolean;
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  imageAltTags: { total: number; withAlt: number };
  loadTime: number | null;
  categoryScores?: CategoryScores;
}

interface AuditDetail {
  id: string;
  name: string;
  email: string;
  businessName: string;
  websiteUrl: string;
  results: AuditResults | null;
  emailSubject: string | null;
  emailBody: string | null;
  leadId: string | null;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

const CATEGORY_META: { key: keyof Omit<CategoryScores, 'overall'>; label: string; icon: string }[] = [
  { key: 'designElements', label: 'Design Elements', icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42' },
  { key: 'messagingHeadlines', label: 'Messaging & Headlines', icon: 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z' },
  { key: 'seoFoundation', label: 'SEO Foundation', icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z' },
  { key: 'conversionElements', label: 'Conversion Elements', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
  { key: 'mobileExperience', label: 'Mobile Experience', icon: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3' },
  { key: 'contentStructure', label: 'Content Structure', icon: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12' },
];

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function scoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-400';
  if (score >= 60) return 'bg-amber-400';
  if (score >= 40) return 'bg-orange-400';
  return 'bg-red-400';
}

function scoreRingColor(score: number): string {
  if (score >= 80) return 'stroke-emerald-400';
  if (score >= 60) return 'stroke-amber-400';
  if (score >= 40) return 'stroke-orange-400';
  return 'stroke-red-400';
}

function gradeLabel(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Needs Work';
  return 'Critical';
}

function OverallGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" className="text-white/10" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            className={scoreRingColor(score)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</span>
          <span className="text-xs text-white/40">/ 100</span>
        </div>
      </div>
      <p className="text-sm text-white/50 mt-2">Overall Score</p>
      <p className={`text-xs font-medium ${scoreColor(score)}`}>{gradeLabel(score)}</p>
    </div>
  );
}

function CategoryCard({ category, meta }: { category: CategoryScore; meta: typeof CATEGORY_META[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass-subtle p-4 rounded-xl">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${scoreBgColor(category.score)}/15`}>
            <svg className={`w-5 h-5 ${scoreColor(category.score)}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white/80">{meta.label}</p>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${scoreColor(category.score)}`}>{category.score}</span>
                <svg className={`w-4 h-4 text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
            <div className="mt-1.5 w-full bg-white/10 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${scoreBgColor(category.score)}`}
                style={{ width: `${category.score}%`, transition: 'width 0.8s ease-out' }}
              />
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          {category.checks.map((check) => (
            <div key={check.name} className="flex items-center justify-between text-xs">
              <span className="text-white/50">{check.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-white/10 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full ${scoreBgColor(check.score)}`}
                    style={{ width: `${check.score}%` }}
                  />
                </div>
                <span className={`font-medium w-6 text-right ${scoreColor(check.score)}`}>{check.score}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [designOverride, setDesignOverride] = useState<string>('');

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

  const applyDesignOverride = async () => {
    const val = parseInt(designOverride);
    if (isNaN(val) || val < 0 || val > 100) {
      setMessage({ type: 'error', text: 'Enter a score between 0 and 100' });
      return;
    }
    setMessage(null);
    try {
      const res = await fetch(`/api/audit/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designOverride: val }),
      });
      if (res.ok) {
        const updated = await fetch(`/api/audit/${id}`).then(r => r.json());
        setAudit(updated);
        setDesignOverride('');
        setMessage({ type: 'success', text: 'Design score updated' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update score' });
    }
  };

  const sendEmail = async () => {
    if (!confirm(`Send this email to ${audit?.email}?`)) return;
    setSending(true);
    setMessage(null);
    try {
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
  const cs = r?.categoryScores;

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

      {/* Scores Section */}
      {cs ? (
        <div className="glass p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-8 mb-6">
            <OverallGauge score={cs.overall} />
            <div className="flex-1 grid grid-cols-3 gap-3 text-center">
              {CATEGORY_META.map(meta => {
                const cat = cs[meta.key];
                return (
                  <div key={meta.key} className="glass-subtle p-3 rounded-lg">
                    <p className={`text-xl font-bold ${scoreColor(cat.score)}`}>{cat.score}</p>
                    <p className="text-[10px] text-white/40 mt-0.5 leading-tight">{meta.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Category Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORY_META.map(meta => (
              <CategoryCard key={meta.key} category={cs[meta.key]} meta={meta} />
            ))}
          </div>

          {/* Design Override */}
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
            <label className="text-xs text-white/50 whitespace-nowrap">Design Override:</label>
            <input
              type="number"
              min={0}
              max={100}
              value={designOverride}
              onChange={e => setDesignOverride(e.target.value)}
              placeholder={String(cs.designElements.score)}
              className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/90 focus:outline-none focus:border-cyan-500/50"
            />
            <button
              onClick={applyDesignOverride}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 text-xs font-medium transition-colors"
            >
              Apply
            </button>
            <span className="text-[10px] text-white/30">Override the automated design score with your assessment</span>
          </div>
        </div>
      ) : r ? (
        /* Fallback for legacy audits without category scores */
        <div className="glass p-6 mb-6">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Audit Results (Legacy)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <LegacyScoreCard label="Mobile Speed" value={r.pageSpeedMobile} suffix="/100" />
            <LegacyScoreCard label="Desktop Speed" value={r.pageSpeedDesktop} suffix="/100" />
            <LegacyBoolCard label="Mobile Friendly" value={r.mobileFriendly} />
            <LegacyBoolCard label="SSL Secure" value={r.ssl} />
            <LegacyBoolCard label="Meta Title" value={r.hasMetaTitle} />
            <LegacyBoolCard label="Meta Description" value={r.hasMetaDescription} />
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
      ) : null}

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

function LegacyScoreCard({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
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

function LegacyBoolCard({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="glass-subtle p-4">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${value ? 'text-emerald-400' : 'text-red-400'}`}>
        {value ? 'Yes' : 'No'}
      </p>
    </div>
  );
}
