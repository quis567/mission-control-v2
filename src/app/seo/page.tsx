'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SEOScoreBadge from '@/components/SEOScoreBadge';

export default function SEOListPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState<string | null>(null);

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    const res = await fetch('/api/websites');
    const sites = await res.json();

    // Fetch SEO data for each website
    const withSeo = await Promise.all(
      sites.map(async (site: any) => {
        try {
          const seoRes = await fetch(`/api/websites/${site.id}/seo`);
          const pages = await seoRes.json();
          const scores = pages.map((p: any) => p.seoScore || 0).filter((s: number) => s > 0);
          const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
          const issues = pages.filter((p: any) => (p.seoScore || 0) < 50).length;
          const lastAudited = pages.reduce((latest: string | null, p: any) => {
            if (!p.lastAudited) return latest;
            return !latest || new Date(p.lastAudited) > new Date(latest) ? p.lastAudited : latest;
          }, null);

          return { ...site, seoPages: pages.length, avgScore, issues, lastAudited };
        } catch {
          return { ...site, seoPages: 0, avgScore: 0, issues: 0, lastAudited: null };
        }
      })
    );

    setWebsites(withSeo);
    setLoading(false);
  };

  const handleAudit = async (websiteId: string) => {
    setAuditing(websiteId);
    try {
      await fetch('/api/seo/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId }),
      });
      await fetchWebsites();
    } catch { /* */ }
    setAuditing(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-white/30 text-sm">Loading...</div></div>;

  const totalPages = websites.reduce((s, w) => s + (w.seoPages || 0), 0);
  const totalIssues = websites.reduce((s, w) => s + (w.issues || 0), 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">SEO Overview</h1>
          <p className="text-sm text-white/40 mt-1">{websites.length} websites · {totalPages} pages tracked · {totalIssues} issues</p>
        </div>
      </div>

      {websites.length === 0 ? (
        <div className="glass p-12 text-center text-white/30 text-sm">No websites yet. Add websites from client profiles.</div>
      ) : (
        <div className="space-y-3">
          {websites.map(w => (
            <div key={w.id} className="glass p-5 hover:bg-white/15 transition-all duration-200">
              <div className="flex items-center gap-4">
                <SEOScoreBadge score={w.avgScore} />

                <Link href={`/seo/${w.id}`} className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{w.url}</p>
                  <p className="text-xs text-white/30 mt-0.5">{w.client?.businessName}</p>
                </Link>

                <div className="flex items-center gap-6 text-xs">
                  <div className="text-center">
                    <p className="text-white/30">Pages</p>
                    <p className="text-white/60 mt-0.5">{w.seoPages}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/30">Issues</p>
                    <p className={`mt-0.5 ${w.issues > 0 ? 'text-amber-400' : 'text-white/60'}`}>{w.issues}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/30">Last Audit</p>
                    <p className="text-white/60 mt-0.5">{w.lastAudited ? new Date(w.lastAudited).toLocaleDateString() : 'Never'}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleAudit(w.id)}
                  disabled={auditing === w.id || w.seoPages === 0}
                  className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs hover:bg-accent/20 transition-all duration-200 disabled:opacity-30"
                >
                  {auditing === w.id ? 'Auditing...' : 'Run Audit'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
