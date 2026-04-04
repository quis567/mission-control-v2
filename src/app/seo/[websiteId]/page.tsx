'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SEOScoreBadge, { SCORE_COLOR } from '@/components/SEOScoreBadge';

export default function SeoDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const websiteId = params.websiteId as string;
  const [website, setWebsite] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingPage, setAddingPage] = useState(false);
  const [newPage, setNewPage] = useState({ pageUrl: '', pageTitle: '', metaDescription: '', h1Tag: '', h1Count: 1, wordCount: 0, targetKeyword: '', imagesTotal: 0, imagesWithAlt: 0, internalLinks: 0, externalLinks: 0 });
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [competitorModal, setCompetitorModal] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [competitorResult, setCompetitorResult] = useState<any>(null);

  const fetchData = useCallback(async () => {
    const [wRes, sRes] = await Promise.all([
      fetch(`/api/websites/${websiteId}`),
      fetch(`/api/websites/${websiteId}/seo`),
    ]);
    if (!wRes.ok) { router.push('/websites'); return; }
    setWebsite(await wRes.json());
    setPages(await sRes.json());
    setLoading(false);
  }, [websiteId, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddPage = async () => {
    if (!newPage.pageUrl.trim()) return;
    await fetch(`/api/websites/${websiteId}/seo`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPage),
    });
    setNewPage({ pageUrl: '', pageTitle: '', metaDescription: '', h1Tag: '', h1Count: 1, wordCount: 0, targetKeyword: '', imagesTotal: 0, imagesWithAlt: 0, internalLinks: 0, externalLinks: 0 });
    setAddingPage(false); fetchData();
  };

  const handleUpdateField = async (seoPageId: string, field: string, value: string) => {
    await fetch(`/api/websites/${websiteId}/seo`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seoPageId, [field]: value }),
    });
    fetchData();
  };

  const handleGenerateMeta = async (page: any) => {
    setAiLoading(page.id); setAiResult(null);
    try {
      const res = await fetch('/api/seo/generate-meta', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetKeyword: page.targetKeyword, currentTitle: page.pageTitle, currentDescription: page.metaDescription, pageContent: `Page: ${page.pageUrl}. Title: ${page.pageTitle}. H1: ${page.h1Tag}.` }),
      });
      setAiResult({ type: 'meta', pageId: page.id, data: await res.json() });
    } catch { setAiResult({ type: 'error', data: 'Failed to generate' }); }
    setAiLoading(null);
  };

  const handleSuggestKeywords = async (page: any) => {
    setAiLoading(page.id); setAiResult(null);
    try {
      const res = await fetch('/api/seo/suggest-keywords', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageUrl: page.pageUrl, pageContent: `Page: ${page.pageUrl}. Title: ${page.pageTitle}. H1: ${page.h1Tag}.`, businessType: website?.client?.businessName }),
      });
      setAiResult({ type: 'keywords', pageId: page.id, data: await res.json() });
    } catch { setAiResult({ type: 'error', data: 'Failed to suggest keywords' }); }
    setAiLoading(null);
  };

  const handleFullAudit = async () => {
    setAuditLoading(true); setAuditResult(null);
    try {
      const res = await fetch('/api/seo/audit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId }),
      });
      setAuditResult(await res.json());
    } catch { setAuditResult({ error: 'Audit failed' }); }
    setAuditLoading(false);
  };

  const applyMeta = async (pageId: string, title: string, description: string) => {
    await fetch(`/api/websites/${websiteId}/seo`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seoPageId: pageId, pageTitle: title, metaDescription: description, changedBy: 'ai' }),
    });
    setAiResult(null); fetchData();
  };

  const applyKeyword = async (pageId: string, keyword: string) => {
    await handleUpdateField(pageId, 'targetKeyword', keyword);
    setAiResult(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-white/30 text-sm">Loading...</div></div>;

  const avgScore = pages.length > 0 ? Math.round(pages.reduce((s, p) => s + (p.seoScore || 0), 0) / pages.length) : 0;

  return (
    <div className="max-w-6xl mx-auto">
      <button onClick={() => router.back()} className="text-white/40 text-sm hover:text-white/60 transition-colors mb-6 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Back
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">SEO Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">{website?.url} · {website?.client?.businessName}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAddingPage(true)} className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200">+ Add Page</button>
          <button onClick={() => setCompetitorModal(true)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-all duration-200">
            Competitor Analysis
          </button>
          <button onClick={handleFullAudit} disabled={auditLoading || pages.length === 0} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-all duration-200 disabled:opacity-30">
            {auditLoading ? 'Auditing...' : 'Full Site Audit'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="glass p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Pages</p>
          <p className="text-2xl font-light mt-2 text-accent">{pages.length}</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Avg Score</p>
          <p className={`text-2xl font-light mt-2 ${SCORE_COLOR(avgScore)}`}>{avgScore}</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Issues</p>
          <p className="text-2xl font-light mt-2 text-amber-400">{pages.filter(p => (p.seoScore || 0) < 50).length}</p>
        </div>
        <div className="glass p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider">Optimized</p>
          <p className="text-2xl font-light mt-2 text-emerald-400">{pages.filter(p => (p.seoScore || 0) >= 80).length}</p>
        </div>
      </div>

      {/* Audit Result */}
      {auditResult && !auditResult.error && (
        <div className="glass p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm uppercase tracking-wider text-white/40">Site Audit Results</h2>
            <button onClick={() => setAuditResult(null)} className="text-xs text-white/30 hover:text-white/60">Dismiss</button>
          </div>
          <p className="text-sm text-white/70 mb-4">{auditResult.summary}</p>
          {auditResult.priorityActions?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-white/40 mb-2">Priority Actions:</p>
              <div className="space-y-1">
                {auditResult.priorityActions.map((a: string, i: number) => (
                  <p key={i} className="text-xs text-accent">• {a}</p>
                ))}
              </div>
            </div>
          )}
          {auditResult.issues?.length > 0 && (
            <div className="space-y-2">
              {auditResult.issues.map((issue: any, i: number) => (
                <div key={i} className={`glass-subtle p-3 border-l-2 ${issue.severity === 'critical' ? 'border-l-red-400' : issue.severity === 'important' ? 'border-l-amber-400' : 'border-l-white/20'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs ${issue.severity === 'critical' ? 'text-red-400' : issue.severity === 'important' ? 'text-amber-400' : 'text-white/40'}`}>{issue.severity}</span>
                    <span className="text-xs text-white/30">{issue.page}</span>
                  </div>
                  <p className="text-xs text-white/60">{issue.issue}</p>
                  <p className="text-xs text-white/40 mt-1">{issue.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Page Form */}
      {addingPage && (
        <div className="glass p-6 mb-6">
          <h3 className="text-sm text-white/60 mb-4">Add Page</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="text-xs text-white/40">Page URL *</label><input value={newPage.pageUrl} onChange={e => setNewPage(p => ({ ...p, pageUrl: e.target.value }))} placeholder="/about" className="mt-1 text-sm" /></div>
            <div><label className="text-xs text-white/40">Target Keyword</label><input value={newPage.targetKeyword} onChange={e => setNewPage(p => ({ ...p, targetKeyword: e.target.value }))} className="mt-1 text-sm" /></div>
            <div><label className="text-xs text-white/40">Page Title</label><input value={newPage.pageTitle} onChange={e => setNewPage(p => ({ ...p, pageTitle: e.target.value }))} className="mt-1 text-sm" /></div>
            <div><label className="text-xs text-white/40">H1 Tag</label><input value={newPage.h1Tag} onChange={e => setNewPage(p => ({ ...p, h1Tag: e.target.value }))} className="mt-1 text-sm" /></div>
            <div className="col-span-2"><label className="text-xs text-white/40">Meta Description</label><input value={newPage.metaDescription} onChange={e => setNewPage(p => ({ ...p, metaDescription: e.target.value }))} className="mt-1 text-sm" /></div>
            <div><label className="text-xs text-white/40">Word Count</label><input type="number" value={newPage.wordCount} onChange={e => setNewPage(p => ({ ...p, wordCount: parseInt(e.target.value) || 0 }))} className="mt-1 text-sm" /></div>
            <div><label className="text-xs text-white/40">Images (total / with alt)</label>
              <div className="flex gap-2 mt-1">
                <input type="number" value={newPage.imagesTotal} onChange={e => setNewPage(p => ({ ...p, imagesTotal: parseInt(e.target.value) || 0 }))} className="text-sm w-20" />
                <input type="number" value={newPage.imagesWithAlt} onChange={e => setNewPage(p => ({ ...p, imagesWithAlt: parseInt(e.target.value) || 0 }))} className="text-sm w-20" />
              </div>
            </div>
            <div><label className="text-xs text-white/40">Internal Links</label><input type="number" value={newPage.internalLinks} onChange={e => setNewPage(p => ({ ...p, internalLinks: parseInt(e.target.value) || 0 }))} className="mt-1 text-sm" /></div>
            <div><label className="text-xs text-white/40">External Links</label><input type="number" value={newPage.externalLinks} onChange={e => setNewPage(p => ({ ...p, externalLinks: parseInt(e.target.value) || 0 }))} className="mt-1 text-sm" /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAddingPage(false)} className="px-4 py-1.5 rounded-lg border border-white/15 text-white/40 text-xs">Cancel</button>
            <button onClick={handleAddPage} className="px-4 py-1.5 rounded-lg bg-accent/20 text-accent text-xs">Add Page</button>
          </div>
        </div>
      )}

      {/* AI Result Panel */}
      {aiResult && aiResult.type === 'meta' && aiResult.data && (
        <div className="glass p-6 mb-6 glow-accent">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm text-accent">AI-Generated Meta Tags</h3>
            <button onClick={() => setAiResult(null)} className="text-xs text-white/30 hover:text-white/60">Dismiss</button>
          </div>
          <div className="space-y-3">
            <div><p className="text-xs text-white/40">Title ({aiResult.data.titleLength} chars)</p><p className="text-sm text-white/80">{aiResult.data.title}</p></div>
            <div><p className="text-xs text-white/40">Description ({aiResult.data.descriptionLength} chars)</p><p className="text-sm text-white/80">{aiResult.data.description}</p></div>
            {aiResult.data.reasoning && <p className="text-xs text-white/30">{aiResult.data.reasoning}</p>}
          </div>
          <button onClick={() => applyMeta(aiResult.pageId, aiResult.data.title, aiResult.data.description)} className="mt-4 px-4 py-1.5 rounded-lg bg-accent/20 text-accent text-xs">Apply Changes</button>
        </div>
      )}

      {aiResult && aiResult.type === 'keywords' && aiResult.data?.keywords && (
        <div className="glass p-6 mb-6 glow-accent">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm text-accent">Suggested Keywords</h3>
            <button onClick={() => setAiResult(null)} className="text-xs text-white/30 hover:text-white/60">Dismiss</button>
          </div>
          <div className="space-y-2">
            {aiResult.data.keywords.map((kw: any, i: number) => (
              <div key={i} className="glass-subtle p-3 flex items-center justify-between">
                <div>
                  <span className="text-sm text-white/80">{kw.keyword}</span>
                  <span className={`text-xs ml-2 ${kw.relevance === 'high' ? 'text-emerald-400' : kw.relevance === 'medium' ? 'text-amber-400' : 'text-white/30'}`}>{kw.relevance}</span>
                  {kw.reasoning && <p className="text-xs text-white/30 mt-0.5">{kw.reasoning}</p>}
                </div>
                <button onClick={() => applyKeyword(aiResult.pageId, kw.keyword)} className="text-xs text-accent hover:text-accent/80">Use</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pages Table */}
      {pages.length === 0 ? (
        <div className="glass p-12 text-center text-white/30 text-sm">No pages tracked yet. Add pages to start auditing SEO.</div>
      ) : (
        <div className="space-y-3">
          {pages.map(page => (
            <div key={page.id} className="glass p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <SEOScoreBadge score={page.seoScore || 0} />
                  <div>
                    <p className="text-sm text-white/80">{page.pageUrl}</p>
                    {page.targetKeyword && <p className="text-xs text-white/30">Keyword: {page.targetKeyword}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditingPage(editingPage === page.id ? null : page.id)} className="px-2 py-1 rounded text-xs text-white/30 hover:text-white/60 hover:bg-white/5">Edit</button>
                  <button onClick={() => handleGenerateMeta(page)} disabled={aiLoading === page.id} className="px-2 py-1 rounded text-xs text-accent/60 hover:text-accent hover:bg-accent/5 disabled:opacity-30">
                    {aiLoading === page.id ? '...' : 'Gen Meta'}
                  </button>
                  <button onClick={() => handleSuggestKeywords(page)} disabled={aiLoading === page.id} className="px-2 py-1 rounded text-xs text-accent/60 hover:text-accent hover:bg-accent/5 disabled:opacity-30">Keywords</button>
                </div>
              </div>

              {/* SEO Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-white/30">Title</p>
                  <p className={`text-white/60 truncate ${!page.pageTitle ? 'text-red-400' : (page.titleLength || 0) < 50 || (page.titleLength || 0) > 60 ? 'text-amber-400' : ''}`}>
                    {page.pageTitle || 'MISSING'} <span className="text-white/20">{page.titleLength ? `(${page.titleLength})` : ''}</span>
                  </p>
                </div>
                <div>
                  <p className="text-white/30">Meta Desc</p>
                  <p className={`text-white/60 truncate ${!page.metaDescription ? 'text-red-400' : (page.metaDescLength || 0) < 150 || (page.metaDescLength || 0) > 160 ? 'text-amber-400' : ''}`}>
                    {page.metaDescription ? `${page.metaDescription.substring(0, 50)}...` : 'MISSING'} <span className="text-white/20">{page.metaDescLength ? `(${page.metaDescLength})` : ''}</span>
                  </p>
                </div>
                <div>
                  <p className="text-white/30">H1</p>
                  <p className={`text-white/60 truncate ${!page.h1Tag ? 'text-red-400' : page.h1Count !== 1 ? 'text-amber-400' : ''}`}>{page.h1Tag || 'MISSING'} {page.h1Count != null && page.h1Count !== 1 ? `(${page.h1Count} found)` : ''}</p>
                </div>
                <div>
                  <p className="text-white/30">Content</p>
                  <p className="text-white/60">{page.wordCount || 0} words · {page.imagesTotal || 0} imgs ({page.imagesWithAlt || 0} alt) · {page.internalLinks || 0}int {page.externalLinks || 0}ext</p>
                </div>
              </div>

              {/* Inline Edit */}
              {editingPage === page.id && (
                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-white/30">Title</label><input defaultValue={page.pageTitle || ''} onBlur={e => handleUpdateField(page.id, 'pageTitle', e.target.value)} className="mt-1 text-sm" /></div>
                  <div><label className="text-xs text-white/30">Target Keyword</label><input defaultValue={page.targetKeyword || ''} onBlur={e => handleUpdateField(page.id, 'targetKeyword', e.target.value)} className="mt-1 text-sm" /></div>
                  <div className="col-span-2"><label className="text-xs text-white/30">Meta Description</label><input defaultValue={page.metaDescription || ''} onBlur={e => handleUpdateField(page.id, 'metaDescription', e.target.value)} className="mt-1 text-sm" /></div>
                  <div><label className="text-xs text-white/30">H1 Tag</label><input defaultValue={page.h1Tag || ''} onBlur={e => handleUpdateField(page.id, 'h1Tag', e.target.value)} className="mt-1 text-sm" /></div>
                  <div><label className="text-xs text-white/30">Word Count</label><input type="number" defaultValue={page.wordCount || 0} onBlur={e => handleUpdateField(page.id, 'wordCount', e.target.value)} className="mt-1 text-sm" /></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Competitor Analysis Modal */}
      {competitorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setCompetitorModal(false); setCompetitorResult(null); }} />
          <div className="glass-elevated p-8 w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-light tracking-wide text-white mb-4">Competitor Analysis</h2>
            <p className="text-xs text-white/40 mb-4">Comparing against: {website?.url}</p>

            {!competitorResult && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-wider">Competitor URL</label>
                  <input
                    value={competitorUrl}
                    onChange={e => setCompetitorUrl(e.target.value)}
                    placeholder="https://competitor.com"
                    className="mt-1 text-sm"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setCompetitorModal(false)} className="px-4 py-2 rounded-xl border border-white/15 text-white/40 text-sm">Cancel</button>
                  <button
                    onClick={async () => {
                      if (!competitorUrl.trim()) return;
                      setCompetitorLoading(true);
                      try {
                        const res = await fetch('/api/seo/competitor-analysis', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ clientWebsiteId: websiteId, competitorUrl: competitorUrl.trim() }),
                        });
                        setCompetitorResult(await res.json());
                      } catch { setCompetitorResult({ summary: 'Analysis failed' }); }
                      setCompetitorLoading(false);
                    }}
                    disabled={competitorLoading || !competitorUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200 disabled:opacity-40"
                  >
                    {competitorLoading ? 'Analyzing...' : 'Analyze'}
                  </button>
                </div>
                {competitorLoading && (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin mx-auto mb-3" />
                    <p className="text-sm text-white/40">AI is analyzing the competitor...</p>
                  </div>
                )}
              </div>
            )}

            {competitorResult && (
              <div className="space-y-4">
                {competitorResult.summary && (
                  <div className="glass-subtle p-4">
                    <p className="text-xs text-white/40 mb-1">Summary</p>
                    <p className="text-sm text-white/70">{competitorResult.summary}</p>
                  </div>
                )}

                {competitorResult.competitorStrengths?.length > 0 && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Competitor Strengths</p>
                    <div className="space-y-1">{competitorResult.competitorStrengths.map((s: string, i: number) => <p key={i} className="text-xs text-red-400/80">- {s}</p>)}</div>
                  </div>
                )}

                {competitorResult.clientStrengths?.length > 0 && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Your Strengths</p>
                    <div className="space-y-1">{competitorResult.clientStrengths.map((s: string, i: number) => <p key={i} className="text-xs text-emerald-400/80">- {s}</p>)}</div>
                  </div>
                )}

                {competitorResult.gaps?.length > 0 && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Gaps to Address</p>
                    <div className="space-y-1">{competitorResult.gaps.map((s: string, i: number) => <p key={i} className="text-xs text-amber-400/80">- {s}</p>)}</div>
                  </div>
                )}

                {competitorResult.opportunities?.length > 0 && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Opportunities</p>
                    <div className="space-y-1">{competitorResult.opportunities.map((s: string, i: number) => <p key={i} className="text-xs text-accent/80">- {s}</p>)}</div>
                  </div>
                )}

                {competitorResult.keywordSuggestions?.length > 0 && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Keyword Suggestions</p>
                    <div className="flex flex-wrap gap-1.5">{competitorResult.keywordSuggestions.map((kw: string, i: number) => <span key={i} className="text-xs bg-accent/10 text-accent/70 px-2 py-0.5 rounded">{kw}</span>)}</div>
                  </div>
                )}

                {competitorResult.contentIdeas?.length > 0 && (
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Content Ideas</p>
                    <div className="space-y-1">{competitorResult.contentIdeas.map((s: string, i: number) => <p key={i} className="text-xs text-white/50">- {s}</p>)}</div>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => { setCompetitorResult(null); setCompetitorUrl(''); }} className="px-3 py-1.5 rounded-lg border border-white/15 text-white/40 text-xs">New Analysis</button>
                  <button onClick={() => { setCompetitorModal(false); setCompetitorResult(null); setCompetitorUrl(''); }} className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
