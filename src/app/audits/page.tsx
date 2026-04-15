'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageLoader } from '@/components/Spinner';

interface AuditRow {
  id: string;
  businessName: string;
  email: string;
  websiteUrl: string;
  status: string;
  createdAt: string;
  results: any;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-400/15 text-amber-400',
  completed: 'bg-blue-400/15 text-blue-400',
  emailed: 'bg-emerald-400/15 text-emerald-400',
};

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

export default function AuditsPage() {
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit')
      .then(r => r.json())
      .then(setAudits)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white/90">Website Audits</h1>
          <p className="text-white/40 text-sm mt-1">Free audit submissions from truepathstudios.com</p>
        </div>
      </div>

      {audits.length === 0 ? (
        <div className="glass p-12 text-center text-white/40">
          No audit submissions yet.
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-xs font-medium text-white/50 uppercase tracking-wider">Business</th>
                <th className="text-left p-4 text-xs font-medium text-white/50 uppercase tracking-wider">Email</th>
                <th className="text-left p-4 text-xs font-medium text-white/50 uppercase tracking-wider">Score</th>
                <th className="text-left p-4 text-xs font-medium text-white/50 uppercase tracking-wider">Mobile</th>
                <th className="text-left p-4 text-xs font-medium text-white/50 uppercase tracking-wider">Desktop</th>
                <th className="text-left p-4 text-xs font-medium text-white/50 uppercase tracking-wider">Status</th>
                <th className="text-left p-4 text-xs font-medium text-white/50 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {audits.map(a => {
                const overall = a.results?.categoryScores?.overall;
                return (
                  <Link key={a.id} href={`/audits/${a.id}`} className="contents">
                    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                      <td className="p-4">
                        <p className="text-sm font-medium text-white/90">{a.businessName}</p>
                        <p className="text-xs text-white/40 mt-0.5">{a.websiteUrl}</p>
                      </td>
                      <td className="p-4 text-sm text-white/60">{a.email}</td>
                      <td className="p-4">
                        {overall != null ? (
                          <span className={`text-sm font-bold ${scoreColor(overall)}`}>{overall}</span>
                        ) : (
                          <span className="text-xs text-white/30">&mdash;</span>
                        )}
                      </td>
                      <td className="p-4">
                        <ScoreBadge score={a.results?.pageSpeedMobile} />
                      </td>
                      <td className="p-4">
                        <ScoreBadge score={a.results?.pageSpeedDesktop} />
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[a.status] || 'bg-white/10 text-white/50'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-white/40">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  </Link>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-xs text-white/30">&mdash;</span>;
  const color = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  return <span className={`text-sm font-semibold ${color}`}>{score}</span>;
}
