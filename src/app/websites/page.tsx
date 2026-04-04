'use client';

import { useState, useEffect } from 'react';
import WebsiteCard from '@/components/WebsiteCard';

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [netlifySites, setNetlifySites] = useState<any[] | null>(null);
  const [linkingWebsiteId, setLinkingWebsiteId] = useState<string | null>(null);
  const [githubRepos, setGithubRepos] = useState<any[] | null>(null);
  const [linkingGithubId, setLinkingGithubId] = useState<string | null>(null);

  const fetchWebsites = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/websites?${params}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setWebsites(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchWebsites(); }, [statusFilter]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/integrations/netlify/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      fetchWebsites();
    } catch { /* */ } finally { setSyncing(false); }
  };

  const handleLinkStart = async (websiteId: string) => {
    setLinkingWebsiteId(websiteId);
    if (!netlifySites) {
      try {
        const res = await fetch('/api/integrations/netlify/sites');
        if (res.ok) setNetlifySites(await res.json());
        else setNetlifySites([]);
      } catch { setNetlifySites([]); }
    }
  };

  const handleLink = async (websiteId: string, netlifySiteId: string) => {
    await fetch('/api/integrations/netlify/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ websiteId, netlifySiteId }),
    });
    setLinkingWebsiteId(null);
    fetchWebsites();
  };

  const handleGithubLinkStart = async (websiteId: string) => {
    setLinkingGithubId(websiteId);
    if (!githubRepos) {
      try {
        const res = await fetch('/api/integrations/github/repos');
        if (res.ok) setGithubRepos(await res.json());
        else setGithubRepos([]);
      } catch { setGithubRepos([]); }
    }
  };

  const handleGithubLink = async (websiteId: string, repoUrl: string) => {
    await fetch('/api/integrations/github/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ websiteId, githubRepoUrl: repoUrl }),
    });
    setLinkingGithubId(null);
    fetchWebsites();
  };

  const domainExpiringCount = websites.filter(w => {
    if (!w.domainExpiration) return false;
    const days = (new Date(w.domainExpiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days < 30 && days > 0;
  }).length;

  const linkedCount = websites.filter(w => w.netlifySiteId).length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">Websites</h1>
          <p className="text-sm text-white/40 mt-1">
            {websites.length} total{linkedCount > 0 ? ` · ${linkedCount} linked to Netlify` : ''}
            {domainExpiringCount > 0 ? ` · ${domainExpiringCount} domain(s) expiring soon` : ''}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200 disabled:opacity-40"
        >
          {syncing ? 'Syncing...' : 'Sync with Netlify'}
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="glass-subtle px-4 py-2 rounded-xl text-sm border-none">
          <option value="">All statuses</option>
          <option value="development">Development</option>
          <option value="staging">Staging</option>
          <option value="live">Live</option>
          <option value="maintenance">Maintenance</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <div className="text-white/30 text-sm text-center py-16">Loading...</div>
      ) : websites.length === 0 ? (
        <div className="glass p-12 text-center text-white/30 text-sm">No websites yet. Add websites from client profiles.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map(w => (
            <div key={w.id}>
              <WebsiteCard website={w} />
              <div className="flex items-center justify-between px-2 mt-1">
                <div className="flex gap-3">
                  {w.netlifySiteId ? (
                    <span className="text-xs text-emerald-400/50">Netlify linked</span>
                  ) : (
                    <button onClick={() => handleLinkStart(w.id)} className="text-xs text-white/25 hover:text-accent/60">Link Netlify</button>
                  )}
                  {w.githubRepoUrl ? (
                    <a href={w.githubRepoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 hover:text-white/50">GitHub</a>
                  ) : (
                    <button onClick={() => handleGithubLinkStart(w.id)} className="text-xs text-white/25 hover:text-accent/60">Link GitHub</button>
                  )}
                </div>
                {w.lastUpdated && (
                  <span className="text-xs text-white/20">Last deploy: {new Date(w.lastUpdated).toLocaleDateString()}</span>
                )}
              </div>

              {linkingWebsiteId === w.id && netlifySites && (
                <div className="glass-subtle p-3 mt-2 space-y-1">
                  <p className="text-xs text-white/40 mb-2">Select Netlify site:</p>
                  {netlifySites.length === 0 ? (
                    <p className="text-xs text-white/30">No Netlify sites found. Check your NETLIFY_ACCESS_TOKEN.</p>
                  ) : (
                    netlifySites.map(ns => (
                      <button
                        key={ns.id}
                        onClick={() => handleLink(w.id, ns.id)}
                        className="w-full text-left px-2 py-1.5 rounded text-xs text-white/60 hover:bg-white/5 transition-all"
                      >
                        {ns.name} — {ns.url}
                      </button>
                    ))
                  )}
                  <button onClick={() => setLinkingWebsiteId(null)} className="text-xs text-white/25 mt-1">Cancel</button>
                </div>
              )}

              {linkingGithubId === w.id && githubRepos && (
                <div className="glass-subtle p-3 mt-2 space-y-1">
                  <p className="text-xs text-white/40 mb-2">Select GitHub repo:</p>
                  {githubRepos.length === 0 ? (
                    <p className="text-xs text-white/30">No repos found. Check your GITHUB_ACCESS_TOKEN.</p>
                  ) : (
                    githubRepos.map(repo => (
                      <button
                        key={repo.id}
                        onClick={() => handleGithubLink(w.id, repo.url)}
                        className="w-full text-left px-2 py-1.5 rounded text-xs text-white/60 hover:bg-white/5 transition-all"
                      >
                        {repo.name} {repo.language ? `· ${repo.language}` : ''} {repo.isPrivate ? '(private)' : ''}
                      </button>
                    ))
                  )}
                  <button onClick={() => setLinkingGithubId(null)} className="text-xs text-white/25 mt-1">Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
