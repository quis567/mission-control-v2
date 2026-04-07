'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { exportSeoPdf } from '@/lib/exportSeoPdf';
import { PageLoader } from '@/components/Spinner';

function getSiteType(w: any): 'truepath_managed' | 'external' | 'audit_only' {
  if (w.githubRepoUrl && w.netlifySiteId) return 'truepath_managed';
  if (w.clientId || w.client) return 'external';
  return 'audit_only';
}

function getSiteTypeLabel(w: any): string {
  const type = getSiteType(w);
  if (type === 'truepath_managed') return 'TruePath Managed';
  if (type === 'external') return `External — ${w.cmsPlatform || 'Unknown'}`;
  return 'Audit Only';
}

function getSiteTypeBadge(type: string) {
  switch (type) {
    case 'truepath_managed': return 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20';
    case 'external': return 'bg-blue-400/15 text-blue-400 border-blue-400/20';
    default: return 'bg-white/10 text-white/40 border-white/10';
  }
}

function getSiteTypeBorder(type: string) {
  switch (type) {
    case 'truepath_managed': return 'border-l-emerald-400/40';
    case 'external': return 'border-l-blue-400/40';
    default: return 'border-l-white/10';
  }
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-400/15';
  if (score >= 50) return 'bg-amber-400/15';
  return 'bg-red-400/15';
}

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [netlifySites, setNetlifySites] = useState<any[] | null>(null);
  const [linkingWebsiteId, setLinkingWebsiteId] = useState<string | null>(null);
  const [githubRepos, setGithubRepos] = useState<any[] | null>(null);
  const [linkingGithubId, setLinkingGithubId] = useState<string | null>(null);
  const [refreshingScreenshot, setRefreshingScreenshot] = useState<string | null>(null);

  const fetchWebsites = () => {
    fetch('/api/websites').then(r => r.json()).then(d => { if (Array.isArray(d)) setWebsites(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchWebsites(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try { await fetch('/api/integrations/netlify/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }); fetchWebsites(); }
    catch { /* */ } finally { setSyncing(false); }
  };

  const handleLinkNetlify = async (websiteId: string) => {
    setLinkingWebsiteId(websiteId);
    if (!netlifySites) {
      try { const res = await fetch('/api/integrations/netlify/sites'); setNetlifySites(res.ok ? await res.json() : []); }
      catch { setNetlifySites([]); }
    }
  };

  const handleLink = async (websiteId: string, netlifySiteId: string) => {
    await fetch('/api/integrations/netlify/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ websiteId, netlifySiteId }) });
    setLinkingWebsiteId(null); fetchWebsites();
  };

  const handleLinkGithub = async (websiteId: string) => {
    setLinkingGithubId(websiteId);
    if (!githubRepos) {
      try { const res = await fetch('/api/integrations/github/repos'); setGithubRepos(res.ok ? await res.json() : []); }
      catch { setGithubRepos([]); }
    }
  };

  const handleGithubLink = async (websiteId: string, repoUrl: string) => {
    await fetch('/api/integrations/github/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ websiteId, githubRepoUrl: repoUrl }) });
    setLinkingGithubId(null); fetchWebsites();
  };

  const handleRefreshScreenshot = async (websiteId: string) => {
    setRefreshingScreenshot(websiteId);
    try {
      await fetch(`/api/websites/${websiteId}/screenshot`, { method: 'POST' });
      fetchWebsites();
    } catch { /* */ }
    finally { setRefreshingScreenshot(null); }
  };

  // Compute types
  const withTypes = websites.map(w => ({ ...w, siteType: getSiteType(w) }));
  const filtered = typeFilter ? withTypes.filter(w => w.siteType === typeFilter) : withTypes;

  const managedCount = withTypes.filter(w => w.siteType === 'truepath_managed').length;
  const externalCount = withTypes.filter(w => w.siteType === 'external').length;
  const auditCount = withTypes.filter(w => w.siteType === 'audit_only').length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">Websites</h1>
          <p className="text-sm text-white/40 mt-1">
            {websites.length} total
            {managedCount > 0 && <> · <span className="text-emerald-400/70">{managedCount} TruePath Managed</span></>}
            {externalCount > 0 && <> · <span className="text-blue-400/70">{externalCount} External</span></>}
            {auditCount > 0 && <> · <span className="text-white/30">{auditCount} Audit Only</span></>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncing}
            className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200 disabled:opacity-40">
            {syncing ? 'Syncing...' : 'Sync with Netlify'}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {[
          { value: '', label: 'All sites' },
          { value: 'truepath_managed', label: `TruePath Managed (${managedCount})` },
          { value: 'external', label: `External (${externalCount})` },
          { value: 'audit_only', label: `Audit Only (${auditCount})` },
        ].map(f => (
          <button key={f.value} onClick={() => setTypeFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${typeFilter === f.value ? 'bg-accent/20 border border-accent/30 text-accent' : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="glass p-12 text-center text-white/30 text-sm">No websites found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(w => {
            const type = w.siteType;
            const seoPages = w.seoPages || [];
            const avgScore = seoPages.length > 0 ? Math.round(seoPages.reduce((s: number, p: any) => s + (p.seoScore || 0), 0) / seoPages.length) : null;
            const repoName = w.githubRepoUrl ? w.githubRepoUrl.split('/').pop() : null;

            return (
              <div key={w.id} className={`glass border-l-2 ${getSiteTypeBorder(type)} overflow-hidden`}>
                {/* Screenshot Thumbnail */}
                <div className="relative w-full aspect-video bg-white/[0.02] overflow-hidden group">
                  {w.screenshotUrl ? (
                    <img
                      src={w.screenshotUrl}
                      alt={`Screenshot of ${w.url}`}
                      loading="lazy"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                    />
                  ) : null}
                  <div className={`${w.screenshotUrl ? 'hidden' : ''} absolute inset-0 flex flex-col items-center justify-center gap-2`}>
                    <svg className="w-8 h-8 text-white/10" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" /></svg>
                    <span className="text-[10px] text-white/15">No preview</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRefreshScreenshot(w.id); }}
                    disabled={refreshingScreenshot === w.id}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white/40 hover:text-white/80 opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm"
                    title="Refresh screenshot"
                  >
                    <svg className={`w-3.5 h-3.5 ${refreshingScreenshot === w.id ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
                  </button>
                </div>

                {/* Type Badge */}
                <div className="p-4 pb-0">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border ${getSiteTypeBadge(type)}`}>
                    {type === 'truepath_managed' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>}
                    {type === 'external' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" /></svg>}
                    {type === 'audit_only' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" /></svg>}
                    {getSiteTypeLabel(w)}
                  </span>
                </div>

                {/* Site Info */}
                <div className="p-4 pt-3">
                  <a href={w.url.startsWith('http') ? w.url : `https://${w.url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:text-accent/80 truncate block">{w.url}</a>
                  <p className="text-xs text-white/40 mt-0.5">{w.client?.businessName || 'No client linked'}</p>
                  <div className="flex gap-4 mt-2 text-[10px] text-white/25">
                    {w.hostingProvider && <span>Hosted: {w.hostingProvider}</span>}
                    {w.cmsPlatform && <span>CMS: {w.cmsPlatform}</span>}
                  </div>
                </div>

                {/* Connection Indicators */}
                <div className="px-4 pb-3 grid grid-cols-3 gap-2">
                  {/* GitHub */}
                  <div className={`rounded-lg p-2 text-center ${w.githubRepoUrl ? 'bg-emerald-400/5 border border-emerald-400/10' : 'bg-white/[0.02] border border-white/5'}`}>
                    {w.githubRepoUrl ? (
                      <>
                        <p className="text-[10px] text-emerald-400">GitHub</p>
                        <p className="text-[9px] text-emerald-400/60 truncate">{repoName}</p>
                      </>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); handleLinkGithub(w.id); }} className="w-full">
                        <p className="text-[10px] text-white/25">GitHub</p>
                        <p className="text-[9px] text-white/15">Link repo</p>
                      </button>
                    )}
                  </div>
                  {/* Netlify */}
                  <div className={`rounded-lg p-2 text-center ${w.netlifySiteId ? 'bg-emerald-400/5 border border-emerald-400/10' : 'bg-white/[0.02] border border-white/5'}`}>
                    {w.netlifySiteId ? (
                      <>
                        <p className="text-[10px] text-emerald-400">Netlify</p>
                        <p className="text-[9px] text-emerald-400/60">Linked</p>
                      </>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); handleLinkNetlify(w.id); }} className="w-full">
                        <p className="text-[10px] text-white/25">Netlify</p>
                        <p className="text-[9px] text-white/15">Link site</p>
                      </button>
                    )}
                  </div>
                  {/* SEO */}
                  <div className={`rounded-lg p-2 text-center ${avgScore !== null ? scoreBg(avgScore) : 'bg-white/[0.02]'} border ${avgScore !== null ? 'border-white/5' : 'border-white/5'}`}>
                    {avgScore !== null ? (
                      <>
                        <p className={`text-[10px] font-medium ${scoreColor(avgScore)}`}>SEO: {avgScore}%</p>
                        <p className="text-[9px] text-white/30">{seoPages.length} pages</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] text-white/25">SEO</p>
                        <p className="text-[9px] text-white/15">No crawl</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Last deploy */}
                {type === 'truepath_managed' && w.lastUpdated && (
                  <div className="px-4 pb-2">
                    <p className="text-[10px] text-white/20">Last deploy: {new Date(w.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="px-4 pb-4 pt-1 flex gap-2">
                  <Link href={`/seo/${w.id}`} className="px-3 py-1.5 rounded-lg bg-accent/15 text-accent text-[11px] hover:bg-accent/25 transition-all">View SEO</Link>
                  {type === 'external' && (
                    <button onClick={async (e) => { e.preventDefault(); try { await exportSeoPdf(w.id); } catch (err: any) { alert(err.message); } }} className="px-3 py-1.5 rounded-lg bg-blue-400/10 text-blue-400 text-[11px] hover:bg-blue-400/20 transition-all">Export Recs</button>
                  )}
                  {type === 'audit_only' && (
                    <Link href={`/proposals`} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-[11px] hover:bg-white/10 transition-all">Create Proposal</Link>
                  )}
                  <a href={w.url.startsWith('http') ? w.url : `https://${w.url}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-white/5 text-white/30 text-[11px] hover:bg-white/10 transition-all ml-auto">Open ↗</a>
                </div>

                {/* Netlify linking modal */}
                {linkingWebsiteId === w.id && netlifySites && (
                  <div className="px-4 pb-4">
                    <div className="glass-subtle p-3 space-y-1">
                      <p className="text-xs text-white/40 mb-2">Select Netlify site:</p>
                      {netlifySites.length === 0 ? <p className="text-xs text-white/30">No sites found.</p> : netlifySites.map(ns => (
                        <button key={ns.id} onClick={() => handleLink(w.id, ns.id)} className="w-full text-left px-2 py-1.5 rounded text-xs text-white/60 hover:bg-white/5">{ns.name} — {ns.url}</button>
                      ))}
                      <button onClick={() => setLinkingWebsiteId(null)} className="text-xs text-white/25 mt-1">Cancel</button>
                    </div>
                  </div>
                )}

                {/* GitHub linking modal */}
                {linkingGithubId === w.id && githubRepos && (
                  <div className="px-4 pb-4">
                    <div className="glass-subtle p-3 space-y-1">
                      <p className="text-xs text-white/40 mb-2">Select GitHub repo:</p>
                      {githubRepos.length === 0 ? <p className="text-xs text-white/30">No repos found.</p> : githubRepos.map(repo => (
                        <button key={repo.id} onClick={() => handleGithubLink(w.id, repo.url)} className="w-full text-left px-2 py-1.5 rounded text-xs text-white/60 hover:bg-white/5">{repo.name} {repo.language ? `· ${repo.language}` : ''}</button>
                      ))}
                      <button onClick={() => setLinkingGithubId(null)} className="text-xs text-white/25 mt-1">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
