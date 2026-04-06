'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { exportSeoPdf } from '@/lib/exportSeoPdf';
import { PageLoader } from '@/components/Spinner';

// ── Score color helpers ──

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}
function scoreDot(score: number) {
  if (score >= 80) return 'bg-emerald-400';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-red-400';
}
function scoreRing(score: number) {
  if (score >= 80) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}
function importanceBadge(imp: string) {
  switch (imp) {
    case 'critical': return 'bg-red-400/15 text-red-400';
    case 'important': return 'bg-amber-400/15 text-amber-400';
    case 'tip': return 'bg-white/10 text-white/50';
    default: return 'bg-white/5 text-white/30';
  }
}
function importanceLabel(imp: string) {
  switch (imp) {
    case 'critical': return 'Critical';
    case 'important': return 'Important';
    case 'tip': return 'Tip';
    default: return imp;
  }
}

// ── Circular Gauge Component ──

function ScoreGauge({ score, size = 160 }: { score: number; size?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const r = (size - 16) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const duration = 1000;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setAnimatedScore(Math.round(progress * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={scoreRing(score)} strokeWidth="8" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-light ${scoreColor(score)}`}>{animatedScore}%</span>
      </div>
    </div>
  );
}

// ── Check Card Component ──

function CheckCard({ title, importance, checks, value, borderColor }: {
  title: string;
  importance: string;
  checks: { label: string; pass: boolean; warn?: boolean }[];
  value?: string;
  borderColor: string;
}) {
  const [open, setOpen] = useState(false);
  const passCount = checks.filter(c => c.pass).length;

  return (
    <div className={`glass overflow-hidden border-l-2 ${borderColor}`}>
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/80">{title}</span>
          <span className="text-xs text-white/30">{passCount}/{checks.length}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${importanceBadge(importance)}`}>{importanceLabel(importance)}</span>
        </div>
        <svg className={`w-4 h-4 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-1.5">
          {value && <p className="text-xs text-white/50 mb-2 italic break-all">&quot;{value}&quot;</p>}
          {checks.map((c, i) => (
            <div key={i} className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded ${c.pass ? 'bg-emerald-400/5' : c.warn ? 'bg-amber-400/5' : 'bg-red-400/5'}`}>
              <span>{c.pass ? '✅' : c.warn ? '⚠️' : '❌'}</span>
              <span className={c.pass ? 'text-white/50' : c.warn ? 'text-amber-400/80' : 'text-red-400/80'}>{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──

export default function SeoDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const websiteId = params.websiteId as string;

  const [website, setWebsite] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPageId, setSelectedPageId] = useState<string | null>('overview');
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('meta');
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResult, setApplyResult] = useState<any>(null);
  const [competitorModal, setCompetitorModal] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [competitorResult, setCompetitorResult] = useState<any>(null);
  const [bulkOptimizing, setBulkOptimizing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; page: string } | null>(null);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [keywordSaving, setKeywordSaving] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [wRes, sRes] = await Promise.all([
      fetch(`/api/websites/${websiteId}`),
      fetch(`/api/websites/${websiteId}/seo`),
    ]);
    if (!wRes.ok) { router.push('/websites'); return; }
    setWebsite(await wRes.json());
    const pagesData = await sRes.json();
    setPages(pagesData);
    if (pagesData.length > 0) {
      setSelectedPageId(prev => {
        if (prev === 'overview') return 'overview';
        if (prev && pagesData.some((p: any) => p.id === prev)) return prev;
        return 'overview';
      });
    }
    setLoading(false);
  }, [websiteId, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isOverview = selectedPageId === 'overview';
  const selectedPage = useMemo(() => isOverview ? null : pages.find(p => p.id === selectedPageId), [pages, selectedPageId, isOverview]);
  const issues = useMemo(() => {
    if (isOverview) {
      // Aggregate all issues from all pages
      const all: any[] = [];
      for (const pg of pages) {
        try {
          const pgIssues = JSON.parse(pg.issues || '[]');
          for (const issue of pgIssues) {
            let pathLabel: string;
            try { pathLabel = new URL(pg.pageUrl).pathname; } catch { pathLabel = pg.pageUrl; }
            all.push({ ...issue, page: pathLabel });
          }
        } catch { /* skip */ }
      }
      return all;
    }
    if (!selectedPage?.issues) return [];
    try { return JSON.parse(selectedPage.issues); } catch { return []; }
  }, [selectedPage, isOverview, pages]);
  const crawlData = useMemo(() => {
    if (!selectedPage?.crawlData) return {};
    try { return JSON.parse(selectedPage.crawlData); } catch { return {}; }
  }, [selectedPage]);
  const headingStructure = useMemo(() => {
    if (!selectedPage?.headingStructure) return {};
    try { return JSON.parse(selectedPage.headingStructure); } catch { return {}; }
  }, [selectedPage]);
  const lastCrawled = useMemo(() => {
    const dates = pages.map(p => p.lastAudited).filter(Boolean);
    if (dates.length === 0) return null;
    const latest = new Date(Math.max(...dates.map((d: string) => new Date(d).getTime())));
    return latest.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }, [pages]);

  // Overview aggregate scores
  const overviewScores = useMemo(() => {
    if (pages.length === 0) return { seoScore: 0, metaScore: 0, qualityScore: 0, structureScore: 0, linkScore: 0, serverScore: 0 };
    const avg = (key: string) => Math.round(pages.reduce((s, p) => s + (p[key] || 0), 0) / pages.length);
    return { seoScore: avg('seoScore'), metaScore: avg('metaScore'), qualityScore: avg('qualityScore'), structureScore: avg('structureScore'), linkScore: avg('linkScore'), serverScore: avg('serverScore') };
  }, [pages]);

  // ── Handlers ──

  const handleCrawl = async () => {
    setCrawling(true); setCrawlResult(null);
    try {
      const res = await fetch('/api/seo/crawl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ websiteId }) });
      const data = await res.json();
      setCrawlResult(res.ok ? data : { error: data.error || 'Crawl failed' });
      if (res.ok) fetchData();
    } catch (e) { setCrawlResult({ error: String(e) }); }
    finally { setCrawling(false); }
  };

  const handleGenerateMeta = async () => {
    if (!selectedPage) return;
    setAiLoading('meta'); setAiResult(null);
    try {
      const res = await fetch('/api/seo/generate-meta', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetKeyword: selectedPage.targetKeyword, currentTitle: selectedPage.pageTitle, currentDescription: selectedPage.metaDescription, pageContent: `Page: ${selectedPage.pageUrl}. Title: ${selectedPage.pageTitle}. H1: ${selectedPage.h1Tag}. Words: ${selectedPage.wordCount}.` }),
      });
      setAiResult({ type: 'meta', data: await res.json() });
    } catch { setAiResult({ type: 'error', data: 'Failed to generate' }); }
    setAiLoading(null);
  };

  const handleSuggestKeywords = async () => {
    if (!selectedPage) return;
    setAiLoading('keywords'); setAiResult(null);
    try {
      const res = await fetch('/api/seo/suggest-keywords', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageUrl: selectedPage.pageUrl, pageContent: `Page: ${selectedPage.pageUrl}. Title: ${selectedPage.pageTitle}. H1: ${selectedPage.h1Tag}.`, businessType: website?.client?.businessName }),
      });
      setAiResult({ type: 'keywords', data: await res.json() });
    } catch { setAiResult({ type: 'error', data: 'Failed' }); }
    setAiLoading(null);
  };

  const handleRewriteContent = async () => {
    if (!selectedPage) return;
    setAiLoading('rewrite'); setAiResult(null);
    try {
      const res = await fetch('/api/seo/rewrite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageUrl: selectedPage.pageUrl, currentContent: `Title: ${selectedPage.pageTitle}\nMeta Description: ${selectedPage.metaDescription}\nH1: ${selectedPage.h1Tag}\nWord Count: ${selectedPage.wordCount}\nPage URL: ${selectedPage.pageUrl}`, targetKeyword: selectedPage.targetKeyword || '' }),
      });
      setAiResult({ type: 'rewrite', data: await res.json() });
    } catch { setAiResult({ type: 'error', data: 'Failed' }); }
    setAiLoading(null);
  };

  const handleApplyChanges = async (changes: Record<string, string>) => {
    if (!selectedPage) return;
    setApplyLoading(true); setApplyResult(null);
    try {
      const res = await fetch('/api/seo/apply-changes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId, pageUrl: selectedPage.pageUrl, changes }),
      });
      const data = await res.json();
      setApplyResult(data);
      if (data.success) { setAiResult(null); fetchData(); }
    } catch (e) { setApplyResult({ error: String(e) }); }
    setApplyLoading(false);
  };

  const handleBulkOptimize = async () => {
    setBulkOptimizing(true); setBulkResult(null);
    try {
      const res = await fetch('/api/seo/bulk-optimize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId }),
      });
      const data = await res.json();
      setBulkResult(res.ok ? data : { error: data.error || 'Bulk optimization failed' });
      if (res.ok) fetchData();
    } catch (e) { setBulkResult({ error: String(e) }); }
    finally { setBulkOptimizing(false); }
  };

  if (loading) return <PageLoader />;

  const p = selectedPage;
  const hasPages = pages.length > 0;

  // ── Build check cards for tabs ──

  function buildMetaChecks() {
    if (!p) return [];
    return [
      { title: 'Title', importance: 'critical', value: p.pageTitle || '', checks: [
        { label: p.pageTitle ? 'Page has a title tag' : 'No title tag found', pass: !!p.pageTitle },
        { label: `Title length: ${p.titleLength || 0} chars (target: 30-60)`, pass: !!p.titleLength && p.titleLength >= 30 && p.titleLength <= 60, warn: !!p.titleLength && (p.titleLength < 30 || p.titleLength > 60) },
      ]},
      { title: 'Meta Description', importance: 'critical', value: p.metaDescription || '', checks: [
        { label: p.metaDescription ? 'Has meta description' : 'No meta description', pass: !!p.metaDescription },
        { label: `Length: ${p.metaDescLength || 0} chars (target: 120-160)`, pass: !!p.metaDescLength && p.metaDescLength >= 120 && p.metaDescLength <= 160, warn: !!p.metaDescLength && (p.metaDescLength < 120 || p.metaDescLength > 160) },
      ]},
      { title: 'Canonical Link', importance: 'important', checks: [
        { label: p.canonicalUrl ? `Canonical: ${p.canonicalUrl}` : 'No canonical link tag', pass: !!p.canonicalUrl },
      ]},
      { title: 'Language', importance: 'important', checks: [
        { label: p.language ? `lang="${p.language}"` : 'No lang attribute on HTML', pass: !!p.language },
      ]},
      { title: 'Open Graph Tags', importance: 'important', checks: [
        { label: crawlData.ogTitle ? `og:title = "${crawlData.ogTitle}"` : 'Missing og:title', pass: !!crawlData.ogTitle },
        { label: crawlData.ogDesc ? `og:description present` : 'Missing og:description', pass: !!crawlData.ogDesc },
        { label: crawlData.ogImage ? 'og:image present' : 'Missing og:image', pass: !!crawlData.ogImage, warn: !crawlData.ogImage },
      ]},
      { title: 'Twitter Card Tags', importance: 'tip', checks: [
        { label: p.hasTwitterTags ? 'Twitter card tags present' : 'No Twitter card tags', pass: p.hasTwitterTags },
      ]},
      { title: 'Favicon', importance: 'tip', checks: [
        { label: p.hasFavicon ? 'Favicon found' : 'No favicon linked in HTML', pass: p.hasFavicon, warn: !p.hasFavicon },
      ]},
      { title: 'Charset Encoding', importance: 'important', checks: [
        { label: p.hasCharset ? 'UTF-8 charset declared' : 'No charset encoding', pass: p.hasCharset },
      ]},
      { title: 'HTML5 Doctype', importance: 'important', checks: [
        { label: p.hasDoctype ? 'HTML5 doctype present' : 'No doctype declaration', pass: p.hasDoctype },
      ]},
    ];
  }

  function buildQualityChecks() {
    if (!p) return [];
    return [
      { title: 'Content', importance: 'critical', checks: [
        { label: `Word count: ${p.wordCount || 0} (target: 300+)`, pass: (p.wordCount || 0) >= 300, warn: (p.wordCount || 0) > 0 && (p.wordCount || 0) < 300 },
        { label: `${p.paragraphCount || 0} paragraphs found (target: 3+)`, pass: (p.paragraphCount || 0) >= 3 },
        { label: crawlData.hasStrongTags ? 'Uses bold/strong emphasis' : 'No bold/strong tags found', pass: !!crawlData.hasStrongTags, warn: !crawlData.hasStrongTags },
      ]},
      { title: 'Mobile Optimization', importance: 'critical', checks: [
        { label: p.hasViewport ? 'Viewport meta tag present' : 'No viewport tag (mobile unfriendly)', pass: p.hasViewport },
      ]},
      { title: 'Image SEO', importance: 'important', checks: [
        { label: `${p.imagesWithAlt || 0} of ${p.imagesTotal || 0} images have alt text`, pass: (p.imagesTotal || 0) === 0 || (p.imagesWithAlt || 0) === (p.imagesTotal || 0), warn: (p.imagesTotal || 0) > 0 && (p.imagesWithAlt || 0) < (p.imagesTotal || 0) },
      ]},
      { title: 'Frames', importance: 'tip', checks: [
        { label: crawlData.hasIframes ? 'Page uses iframes' : 'No iframes detected', pass: !crawlData.hasIframes, warn: !!crawlData.hasIframes },
      ]},
    ];
  }

  function buildStructureChecks() {
    if (!p) return [];
    const headingsArr: { tag: string; text: string }[] = crawlData.headings || [];
    return [
      { title: 'H1 Heading', importance: 'critical', value: p.h1Tag || '', checks: [
        { label: p.h1Count === 1 ? 'Exactly one H1 tag' : p.h1Count === 0 ? 'No H1 tag found' : `${p.h1Count} H1 tags found (should be 1)`, pass: p.h1Count === 1 },
      ]},
      { title: 'Heading Hierarchy', importance: 'important', checks: [
        { label: (headingStructure['h2'] || 0) > 0 ? `Uses H2 subheadings (${headingStructure['h2']})` : 'No H2 subheadings', pass: (headingStructure['h2'] || 0) > 0 },
        { label: crawlData.headingHierarchyOk ? 'Logical heading hierarchy' : 'Heading levels skip (e.g., H1 → H3)', pass: !!crawlData.headingHierarchyOk },
        ...headingsArr.slice(0, 15).map(h => ({ label: `<${h.tag}> ${h.text}`, pass: true })),
      ]},
    ];
  }

  function buildLinkChecks() {
    if (!p) return [];
    return [
      { title: 'Internal Links', importance: 'important', checks: [
        { label: `${p.internalLinks || 0} internal links found`, pass: (p.internalLinks || 0) >= 2, warn: (p.internalLinks || 0) > 0 && (p.internalLinks || 0) < 2 },
      ]},
      { title: 'External Links', importance: 'tip', checks: [
        { label: (p.externalLinks || 0) > 0 ? `${p.externalLinks} external links` : 'No external links (Google values outbound links)', pass: (p.externalLinks || 0) > 0, warn: (p.externalLinks || 0) === 0 },
      ]},
    ];
  }

  function buildServerChecks() {
    if (!p) return [];
    return [
      { title: 'HTTPS', importance: 'critical', checks: [
        { label: p.isHttps ? 'Page served over HTTPS' : 'Not using HTTPS', pass: p.isHttps },
      ]},
      { title: 'Performance', importance: 'important', checks: [
        { label: `Response time: ${p.responseTime || 0}ms (target: <400ms)`, pass: (p.responseTime || 0) < 400, warn: (p.responseTime || 0) >= 400 },
        { label: `HTML size: ${Math.round((p.htmlSize || 0) / 1024)}KB (target: <100KB)`, pass: (p.htmlSize || 0) < 100000 },
      ]},
    ];
  }

  const tabChecks: Record<string, { title: string; importance: string; value?: string; checks: { label: string; pass: boolean; warn?: boolean }[] }[]> = {
    meta: buildMetaChecks(),
    quality: buildQualityChecks(),
    structure: buildStructureChecks(),
    links: buildLinkChecks(),
    server: buildServerChecks(),
  };

  const tabScores: Record<string, number> = {
    meta: isOverview ? overviewScores.metaScore : (p?.metaScore || 0),
    quality: isOverview ? overviewScores.qualityScore : (p?.qualityScore || 0),
    structure: isOverview ? overviewScores.structureScore : (p?.structureScore || 0),
    links: isOverview ? overviewScores.linkScore : (p?.linkScore || 0),
    server: isOverview ? overviewScores.serverScore : (p?.serverScore || 0),
  };

  const tabs = [
    { id: 'meta', label: 'Meta Data' },
    { id: 'quality', label: 'Page Quality' },
    { id: 'structure', label: 'Page Structure' },
    { id: 'links', label: 'Link Structure' },
    { id: 'server', label: 'Server Config' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back */}
      <button onClick={() => router.back()} className="text-white/40 text-sm hover:text-white/60 transition-colors mb-6 flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        Back
      </button>

      {/* A. Header Bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">SEO Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">{website?.url} · {website?.client?.businessName}</p>
          {lastCrawled && <p className="text-xs text-white/25 mt-0.5">Last crawled: {lastCrawled}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={handleCrawl} disabled={crawling}
            className="px-5 py-2 rounded-xl bg-accent/30 border border-accent/40 text-accent text-sm font-medium hover:bg-accent/40 transition-all duration-200 disabled:opacity-40 shadow-lg shadow-accent/10">
            {crawling ? <span className="flex items-center gap-2"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Crawling...</span> : hasPages ? 'Re-Crawl Site ↻' : 'Full Site Audit'}
          </button>
          <button onClick={async () => { try { await exportSeoPdf(websiteId); } catch (err: any) { alert(err.message); } }} className="px-4 py-2 rounded-xl bg-blue-400/10 border border-blue-400/20 text-blue-400 text-sm hover:bg-blue-400/20 transition-all duration-200">
            Export Report
          </button>
          <button onClick={() => setCompetitorModal(true)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-all duration-200">
            Competitor Analysis
          </button>
        </div>
      </div>

      {/* Crawl Status */}
      {crawling && (
        <div className="glass p-6 mb-6 text-center">
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-accent/40 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
          <p className="text-sm text-white/60">Crawling site — fetching pages, parsing HTML, extracting SEO data...</p>
          <p className="text-xs text-white/30 mt-1">This may take 30-60 seconds</p>
        </div>
      )}
      {crawlResult && !crawlResult.error && <div className="glass p-4 mb-6 border border-emerald-400/20"><p className="text-sm text-emerald-400">{crawlResult.message}</p></div>}
      {crawlResult?.error && <div className="glass p-4 mb-6 border border-red-400/20"><p className="text-sm text-red-400">{crawlResult.error}</p></div>}

      {/* Empty state */}
      {!hasPages && !crawling && (
        <div className="glass p-12 text-center">
          <div className="text-white/20 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>
          </div>
          <p className="text-white/40 text-sm mb-2">No pages crawled yet</p>
          <p className="text-white/25 text-xs mb-6">Click &quot;Full Site Audit&quot; to crawl {website?.url} and discover all pages</p>
          <button onClick={handleCrawl} disabled={crawling} className="px-6 py-2.5 rounded-xl bg-accent/30 border border-accent/40 text-accent text-sm font-medium hover:bg-accent/40 transition-all duration-200 shadow-lg shadow-accent/10">Full Site Audit</button>
        </div>
      )}

      {/* Dashboard content when pages exist */}
      {hasPages && (p || isOverview) && (
        <>
          {/* B. Page Selector Pills */}
          <div className="glass p-3 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-white/30 shrink-0">Pages:</span>
              <button onClick={() => { setSelectedPageId('overview'); setAiResult(null); setApplyResult(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs shrink-0 transition-all ${isOverview ? 'bg-accent/20 border border-accent/30 text-accent' : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'}`}>
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                <span>All Pages</span>
                <span className={`text-[10px] ${scoreColor(overviewScores.seoScore)}`}>{overviewScores.seoScore}</span>
              </button>
              {pages.map(page => {
                const isActive = page.id === selectedPageId;
                let pathOnly: string;
                try { pathOnly = new URL(page.pageUrl).pathname; } catch { pathOnly = page.pageUrl; }
                return (
                  <button key={page.id} onClick={() => { setSelectedPageId(page.id); setAiResult(null); setApplyResult(null); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs shrink-0 transition-all ${isActive ? 'bg-accent/20 border border-accent/30 text-accent' : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'}`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${scoreDot(page.seoScore || 0)}`} />
                    <span className="truncate max-w-[180px]">{pathOnly || '/'}</span>
                    <span className={`text-[10px] ${scoreColor(page.seoScore || 0)}`}>{page.seoScore || 0}</span>
                  </button>
                );
              })}
              <span className="text-xs text-white/20 shrink-0">({pages.length} pages)</span>
            </div>
          </div>

          {/* C. Overall Score Gauge + Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="glass p-6 flex flex-col items-center justify-center md:col-span-1">
              <ScoreGauge score={isOverview ? overviewScores.seoScore : (p?.seoScore || 0)} />
              <p className="text-xs text-white/40 mt-2">{isOverview ? 'Site-Wide SEO Score' : 'Page SEO Score'}</p>
              <p className="text-xs text-white/25 mt-0.5 truncate max-w-full">{isOverview ? `${pages.length} pages analyzed` : (() => { try { return new URL(p!.pageUrl).pathname; } catch { return p!.pageUrl || '/'; } })()}</p>
            </div>
            <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="glass p-4"><p className="text-xs text-white/40">Pages</p><p className="text-xl font-light mt-1 text-accent">{pages.length}</p></div>
              <div className="glass p-4"><p className="text-xs text-white/40">Avg Score</p><p className={`text-xl font-light mt-1 ${scoreColor(Math.round(pages.reduce((s, pg) => s + (pg.seoScore || 0), 0) / pages.length))}`}>{Math.round(pages.reduce((s, pg) => s + (pg.seoScore || 0), 0) / pages.length)}</p></div>
              <div className="glass p-4"><p className="text-xs text-white/40">Issues</p><p className="text-xl font-light mt-1 text-amber-400">{issues.length}</p></div>
              <div className="glass p-4"><p className="text-xs text-white/40">Optimized</p><p className="text-xl font-light mt-1 text-emerald-400">{pages.filter(pg => (pg.seoScore || 0) >= 80).length}</p></div>
            </div>
          </div>

          {/* Current Keywords Overview */}
          {isOverview && pages.some(pg => pg.targetKeyword) && (
            <div className="glass p-5 mb-6">
              <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">Current Target Keywords</h2>
              <div className="space-y-1.5">
                {pages.map(pg => {
                  let pathOnly: string;
                  try { pathOnly = new URL(pg.pageUrl).pathname; } catch { pathOnly = pg.pageUrl; }
                  return (
                    <div key={pg.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]">
                      <span className="text-xs text-white/40 truncate max-w-[200px]">{pathOnly || '/'}</span>
                      {pg.targetKeyword ? (
                        <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded">{pg.targetKeyword}</span>
                      ) : (
                        <span className="text-xs text-white/20 italic">No keyword set</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Per-page current keyword */}
          {!isOverview && p && (
            <div className="glass p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40 uppercase tracking-wider">Target Keyword</span>
                {p.targetKeyword ? (
                  <span className="text-sm bg-accent/10 text-accent px-3 py-1 rounded-lg border border-accent/20">{p.targetKeyword}</span>
                ) : (
                  <span className="text-sm text-white/25 italic">None set — use Suggest Keywords below</span>
                )}
              </div>
              {p.targetKeyword && (
                <div className="flex items-center gap-3 text-xs text-white/30">
                  {p.keywordDensity != null && <span>Density: {p.keywordDensity.toFixed(1)}%</span>}
                  <button onClick={() => {
                    fetch(`/api/websites/${websiteId}/seo`, {
                      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ seoPageId: p.id, targetKeyword: '' }),
                    }).then(() => fetchData());
                  }} className="text-red-400/50 hover:text-red-400 transition-colors">Clear</button>
                </div>
              )}
            </div>
          )}

          {/* D. TO-DO List */}
          {issues.length > 0 && (() => {
            // In overview, sort by importance and limit to 25
            const sortOrder: Record<string, number> = { critical: 0, important: 1, tip: 2 };
            const sorted = [...issues].sort((a: any, b: any) => (sortOrder[a.importance] ?? 3) - (sortOrder[b.importance] ?? 3));
            const displayed = isOverview ? sorted.slice(0, 25) : sorted;
            const remaining = isOverview ? Math.max(0, sorted.length - 25) : 0;
            return (
              <div className="glass p-5 mb-6">
                <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">
                  TO-DO List {isOverview && <span className="text-white/25 normal-case font-normal">({issues.length} total across all pages)</span>}
                </h2>
                <div className="space-y-1">
                  {displayed.map((issue: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      <span className="text-xs text-white/60">{isOverview && issue.page ? <span className="text-white/30 mr-1.5">{issue.page}</span> : null}{issue.issue}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded ${importanceBadge(issue.importance)}`}>{importanceLabel(issue.importance)}</span>
                        {!isOverview && issue.fixable === 'meta' && (
                          <button onClick={handleGenerateMeta} disabled={!!aiLoading} className="text-[10px] px-2 py-0.5 rounded bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-30">Fix with AI</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {remaining > 0 && <p className="text-xs text-white/25 text-center pt-2">+ {remaining} more issues (select a page to see all)</p>}
                </div>
              </div>
            );
          })()}
          {issues.length === 0 && <div className="glass p-4 mb-6 border border-emerald-400/20 text-center"><p className="text-sm text-emerald-400">{isOverview ? 'No issues found across all pages!' : 'No issues found for this page!'}</p></div>}

          {/* Overview: Pages Table */}
          {isOverview && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">All Pages</h2>
              <div className="space-y-2">
                {[...pages].sort((a, b) => (a.seoScore || 0) - (b.seoScore || 0)).map(page => {
                  let pathOnly: string;
                  try { pathOnly = new URL(page.pageUrl).pathname; } catch { pathOnly = page.pageUrl; }
                  const pageIssueCount = (() => { try { return JSON.parse(page.issues || '[]').length; } catch { return 0; } })();
                  return (
                    <button key={page.id} onClick={() => { setSelectedPageId(page.id); setAiResult(null); }}
                      className="glass w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.03] transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${(page.seoScore || 0) >= 80 ? 'bg-emerald-400/15 text-emerald-400' : (page.seoScore || 0) >= 50 ? 'bg-amber-400/15 text-amber-400' : 'bg-red-400/15 text-red-400'}`}>
                        {page.seoScore || 0}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/70 truncate">{pathOnly || '/'}</p>
                        <p className="text-xs text-white/30 truncate">{page.pageTitle || 'No title'}</p>
                      </div>
                      <div className="grid grid-cols-5 gap-3 text-[10px] text-center shrink-0">
                        <div><p className="text-white/25">Meta</p><p className={scoreColor(page.metaScore || 0)}>{page.metaScore || 0}%</p></div>
                        <div><p className="text-white/25">Quality</p><p className={scoreColor(page.qualityScore || 0)}>{page.qualityScore || 0}%</p></div>
                        <div><p className="text-white/25">Structure</p><p className={scoreColor(page.structureScore || 0)}>{page.structureScore || 0}%</p></div>
                        <div><p className="text-white/25">Links</p><p className={scoreColor(page.linkScore || 0)}>{page.linkScore || 0}%</p></div>
                        <div><p className="text-white/25">Server</p><p className={scoreColor(page.serverScore || 0)}>{page.serverScore || 0}%</p></div>
                      </div>
                      <div className="text-right shrink-0 w-16">
                        {pageIssueCount > 0 ? (
                          <span className="text-xs text-amber-400">{pageIssueCount} issues</span>
                        ) : (
                          <span className="text-xs text-emerald-400">Clean</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Overview: Category Score Breakdown */}
          {isOverview && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">Category Averages</h2>
              <div className="grid grid-cols-5 gap-3">
                {[{ label: 'Meta Data', score: overviewScores.metaScore }, { label: 'Page Quality', score: overviewScores.qualityScore }, { label: 'Page Structure', score: overviewScores.structureScore }, { label: 'Link Structure', score: overviewScores.linkScore }, { label: 'Server Config', score: overviewScores.serverScore }].map(cat => (
                  <div key={cat.label} className="glass p-4 text-center">
                    <p className={`text-2xl font-light ${scoreColor(cat.score)}`}>{cat.score}%</p>
                    <p className="text-xs text-white/30 mt-1">{cat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bulk AI Optimization (overview only) */}
          {isOverview && (
            <div className="glass p-6 mb-6 border border-accent/10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">AI Site-Wide Optimization</h2>
                  <p className="text-xs text-white/30 mt-1">Generate optimized titles, descriptions, and keywords for all {pages.length} pages at once</p>
                </div>
                <button onClick={handleBulkOptimize} disabled={bulkOptimizing}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent/30 to-blue-400/20 border border-accent/30 text-accent text-sm font-medium hover:from-accent/40 hover:to-blue-400/30 transition-all duration-200 disabled:opacity-40 shadow-lg shadow-accent/10 flex items-center gap-2">
                  {bulkOptimizing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Optimizing All Pages...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>
                      Optimize All Pages with AI
                    </>
                  )}
                </button>
              </div>

              {bulkOptimizing && (
                <div className="mt-4">
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-accent/40 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                  <p className="text-xs text-white/30 mt-2">AI is analyzing all pages and generating optimized meta tags and keywords...</p>
                </div>
              )}

              {bulkResult && !bulkResult.error && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-emerald-400">✓ {bulkResult.message}</span>
                    <button onClick={() => setBulkResult(null)} className="text-xs text-white/30 hover:text-white/60 ml-auto">Dismiss</button>
                  </div>
                  {bulkResult.siteWideChanges?.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded bg-accent/5 border border-accent/10">
                      <span className="text-xs text-accent/70">Site-wide:</span>
                      {bulkResult.siteWideChanges.map((c: string) => (
                        <span key={c} className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {bulkResult.results?.map((r: any) => {
                      let pathOnly: string;
                      try { pathOnly = new URL(r.url).pathname; } catch { pathOnly = r.url; }
                      const noChanges = r.changes[0] === 'No changes needed';
                      return (
                        <div key={r.pageId} className="flex items-center justify-between py-1.5 px-3 rounded bg-white/[0.02]">
                          <span className="text-xs text-white/40 truncate max-w-[200px]">{pathOnly || '/'}</span>
                          {noChanges ? (
                            <span className="text-xs text-white/20">No changes needed</span>
                          ) : (
                            <div className="flex gap-1.5 items-center">
                              {r.changes.map((c: string) => (
                                <span key={c} className="text-[10px] bg-emerald-400/10 text-emerald-400 px-1.5 py-0.5 rounded">
                                  {c} updated
                                </span>
                              ))}
                              {r.pushed ? (
                                <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">pushed to GitHub</span>
                              ) : (
                                <span className="text-[10px] bg-white/5 text-white/25 px-1.5 py-0.5 rounded">DB only</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {bulkResult?.error && (
                <div className="mt-4 p-3 rounded bg-red-400/5 border border-red-400/20">
                  <p className="text-xs text-red-400">{bulkResult.error}</p>
                </div>
              )}
            </div>
          )}

          {/* Per-page: Category Tabs + Check Cards */}
          {!isOverview && (
            <>
              <div className="sticky top-0 z-10 glass mb-4 flex overflow-x-auto">
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs shrink-0 border-b-2 transition-all ${activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-white/40 hover:text-white/60'}`}>
                    {tab.label}
                    <span className={`${scoreColor(tabScores[tab.id])} text-[10px]`}>{tabScores[tab.id]}%</span>
                  </button>
                ))}
              </div>

              <div className="space-y-3 mb-8">
                {tabChecks[activeTab]?.map((card, i) => {
                  const allPass = card.checks.every(c => c.pass);
                  const hasWarn = card.checks.some(c => c.warn);
                  const borderColor = allPass ? 'border-l-emerald-400' : hasWarn ? 'border-l-amber-400' : 'border-l-red-400';
                  return <CheckCard key={i} title={card.title} importance={card.importance} checks={card.checks} value={card.value} borderColor={borderColor} />;
                })}
              </div>
            </>
          )}

          {/* F. AI SEO Tools (per-page only) */}
          {!isOverview && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">AI SEO Tools</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button onClick={handleGenerateMeta} disabled={!!aiLoading} className="glass p-4 text-left hover:bg-white/[0.04] transition-colors disabled:opacity-30">
                <p className="text-sm text-accent mb-1 flex items-center gap-2">
                  {aiLoading === 'meta' && <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                  {aiLoading === 'meta' ? 'Generating...' : 'Generate Meta Tags'}
                </p>
                <p className="text-xs text-white/30">AI-optimized title & description</p>
              </button>
              <button onClick={handleSuggestKeywords} disabled={!!aiLoading} className="glass p-4 text-left hover:bg-white/[0.04] transition-colors disabled:opacity-30">
                <p className="text-sm text-accent mb-1 flex items-center gap-2">
                  {aiLoading === 'keywords' && <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                  {aiLoading === 'keywords' ? 'Analyzing...' : 'Suggest Keywords'}
                </p>
                <p className="text-xs text-white/30">Find target keywords</p>
              </button>
              <button onClick={handleRewriteContent} disabled={!!aiLoading} className="glass p-4 text-left hover:bg-white/[0.04] transition-colors disabled:opacity-30">
                <p className="text-sm text-accent mb-1 flex items-center gap-2">
                  {aiLoading === 'rewrite' && <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                  {aiLoading === 'rewrite' ? 'Rewriting...' : 'Rewrite Content'}
                </p>
                <p className="text-xs text-white/30">{aiLoading === 'rewrite' ? 'Generating optimized content — this may take a moment' : 'SEO-optimized copy'}</p>
              </button>
              <button onClick={() => setCompetitorModal(true)} className="glass p-4 text-left hover:bg-white/[0.04] transition-colors">
                <p className="text-sm text-accent mb-1">Keyword Analysis</p>
                <p className="text-xs text-white/30">Compare with competitors</p>
              </button>
            </div>
          </div>
          )}

          {/* AI Result Panel */}
          {aiResult && aiResult.type === 'meta' && aiResult.data && (
            <div className="glass p-6 mb-6 border border-accent/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-accent">AI-Generated Meta Tags</h3>
                <button onClick={() => setAiResult(null)} className="text-xs text-white/30 hover:text-white/60">Dismiss</button>
              </div>
              <div className="space-y-3 mb-4">
                <div><p className="text-xs text-white/40">Title ({aiResult.data.titleLength || aiResult.data.title?.length} chars)</p><p className="text-sm text-white/80">{aiResult.data.title}</p></div>
                <div><p className="text-xs text-white/40">Description ({aiResult.data.descriptionLength || aiResult.data.description?.length} chars)</p><p className="text-sm text-white/80">{aiResult.data.description}</p></div>
                {aiResult.data.reasoning && <p className="text-xs text-white/30">{aiResult.data.reasoning}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleApplyChanges({ title: aiResult.data.title, metaDescription: aiResult.data.description })} disabled={applyLoading}
                  className="px-4 py-1.5 rounded-lg bg-accent/20 text-accent text-xs hover:bg-accent/30 disabled:opacity-30">
                  {applyLoading ? 'Applying...' : 'Apply to Live Site'}
                </button>
                <button onClick={() => {
                  // Save to DB only
                  fetch(`/api/websites/${websiteId}/seo`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ seoPageId: p.id, pageTitle: aiResult.data.title, metaDescription: aiResult.data.description, changedBy: 'ai' }),
                  }).then(() => { setAiResult(null); fetchData(); });
                }} className="px-4 py-1.5 rounded-lg bg-white/10 text-white/50 text-xs hover:bg-white/15">Save to DB Only</button>
              </div>
            </div>
          )}

          {aiResult && aiResult.type === 'keywords' && aiResult.data?.keywords && (
            <div className="glass p-6 mb-6 border border-accent/20">
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
                    <button onClick={async () => {
                      setKeywordSaving(kw.keyword);
                      await fetch(`/api/websites/${websiteId}/seo`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ seoPageId: p.id, targetKeyword: kw.keyword }),
                      });
                      await fetchData();
                      setKeywordSaving(null);
                      setAiResult(null);
                    }} disabled={!!keywordSaving}
                      className="text-xs px-2 py-1 rounded bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-40 transition-all">
                      {keywordSaving === kw.keyword ? 'Saving...' : 'Use'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiResult && aiResult.type === 'rewrite' && aiResult.data && (
            <div className="glass p-6 mb-6 border border-accent/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm text-accent">AI Content Rewrite — Review Changes</h3>
                <button onClick={() => setAiResult(null)} className="text-xs text-white/30 hover:text-white/60">Dismiss</button>
              </div>

              {/* Changes summary */}
              {aiResult.data.changes?.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-accent/5 border border-accent/10">
                  <p className="text-xs text-accent/80 font-medium mb-1.5">What will change:</p>
                  {aiResult.data.changes.map((c: string, i: number) => <p key={i} className="text-xs text-white/50">• {c}</p>)}
                  {aiResult.data.wordCount && <p className="text-xs text-white/30 mt-1.5">New word count: {aiResult.data.wordCount} · Keywords used: {aiResult.data.keywordCount || 'N/A'}</p>}
                </div>
              )}

              {/* Title before/after */}
              {aiResult.data.title && (
                <div className="mb-3">
                  <p className="text-xs text-white/40 mb-1">Title Tag</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-red-400/5 border border-red-400/10">
                      <p className="text-[10px] text-red-400/60 mb-0.5">Current</p>
                      <p className="text-xs text-white/50">{p?.pageTitle || 'No title'}</p>
                    </div>
                    <div className="p-2 rounded bg-emerald-400/5 border border-emerald-400/10">
                      <p className="text-[10px] text-emerald-400/60 mb-0.5">Proposed ({aiResult.data.title.length} chars)</p>
                      <p className="text-xs text-white/70">{aiResult.data.title}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Meta description before/after */}
              {aiResult.data.metaDescription && (
                <div className="mb-3">
                  <p className="text-xs text-white/40 mb-1">Meta Description</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-red-400/5 border border-red-400/10">
                      <p className="text-[10px] text-red-400/60 mb-0.5">Current</p>
                      <p className="text-xs text-white/50">{p?.metaDescription || 'No description'}</p>
                    </div>
                    <div className="p-2 rounded bg-emerald-400/5 border border-emerald-400/10">
                      <p className="text-[10px] text-emerald-400/60 mb-0.5">Proposed ({aiResult.data.metaDescription.length} chars)</p>
                      <p className="text-xs text-white/70">{aiResult.data.metaDescription}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Body content preview */}
              {aiResult.data.rewrittenContent && (
                <div className="mb-4">
                  <p className="text-xs text-white/40 mb-1">Rewritten Page Content</p>
                  <div className="p-3 rounded bg-white/[0.02] border border-white/5 max-h-48 overflow-y-auto">
                    <div className="text-xs text-white/60 whitespace-pre-wrap">{aiResult.data.rewrittenContent}</div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-3 border-t border-white/5">
                <button onClick={() => {
                  const changes: Record<string, string> = {};
                  if (aiResult.data.title) changes.title = aiResult.data.title;
                  if (aiResult.data.metaDescription) changes.metaDescription = aiResult.data.metaDescription;
                  handleApplyChanges(changes);
                }} disabled={applyLoading || (!aiResult.data.title && !aiResult.data.metaDescription)}
                  className="px-4 py-1.5 rounded-lg bg-accent/20 text-accent text-xs hover:bg-accent/30 disabled:opacity-30 flex items-center gap-1.5">
                  {applyLoading ? (
                    <><svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Pushing to GitHub...</>
                  ) : 'Apply to Live Site'}
                </button>
                <button onClick={() => {
                  const dbFields: any = { seoPageId: p!.id, changedBy: 'ai' };
                  if (aiResult.data.title) dbFields.pageTitle = aiResult.data.title;
                  if (aiResult.data.metaDescription) dbFields.metaDescription = aiResult.data.metaDescription;
                  fetch(`/api/websites/${websiteId}/seo`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dbFields),
                  }).then(() => { setAiResult(null); fetchData(); });
                }} className="px-4 py-1.5 rounded-lg bg-white/10 text-white/50 text-xs hover:bg-white/15">
                  Save to DB Only
                </button>
                {aiResult.data.rewrittenContent && (
                  <button onClick={() => { navigator.clipboard.writeText(aiResult.data.rewrittenContent); }}
                    className="px-4 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:bg-white/10 ml-auto">
                    Copy Content
                  </button>
                )}
              </div>
              <p className="text-[10px] text-white/20 mt-2">&quot;Apply to Live Site&quot; pushes title &amp; description to GitHub → auto-deploys via Netlify in ~60s. Use &quot;Copy Content&quot; to manually update page body text.</p>
            </div>
          )}

          {/* Apply Result */}
          {applyResult && (
            <div className={`glass p-4 mb-6 border ${applyResult.success ? 'border-emerald-400/20' : 'border-red-400/20'}`}>
              {applyResult.success ? (
                <div>
                  <p className="text-sm text-emerald-400">{applyResult.message}</p>
                  {applyResult.commitUrl && <a href={applyResult.commitUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline mt-1 inline-block">View on GitHub →</a>}
                </div>
              ) : (
                <p className="text-sm text-red-400">{applyResult.error}</p>
              )}
            </div>
          )}
        </>
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
                  <input value={competitorUrl} onChange={e => setCompetitorUrl(e.target.value)} placeholder="https://competitor.com" className="mt-1 text-sm" autoFocus />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setCompetitorModal(false)} className="px-4 py-2 rounded-xl border border-white/15 text-white/40 text-sm">Cancel</button>
                  <button onClick={async () => {
                    if (!competitorUrl.trim()) return;
                    setCompetitorLoading(true);
                    try { const res = await fetch('/api/seo/competitor-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientWebsiteId: websiteId, competitorUrl: competitorUrl.trim() }) }); setCompetitorResult(await res.json()); }
                    catch { setCompetitorResult({ summary: 'Analysis failed' }); }
                    setCompetitorLoading(false);
                  }} disabled={competitorLoading || !competitorUrl.trim()} className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200 disabled:opacity-40">
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
                {competitorResult.summary && <div className="glass-subtle p-4"><p className="text-xs text-white/40 mb-1">Summary</p><p className="text-sm text-white/70">{competitorResult.summary}</p></div>}
                {competitorResult.competitorStrengths?.length > 0 && <div><p className="text-xs text-white/40 uppercase tracking-wider mb-2">Competitor Strengths</p>{competitorResult.competitorStrengths.map((s: string, i: number) => <p key={i} className="text-xs text-red-400/80">- {s}</p>)}</div>}
                {competitorResult.clientStrengths?.length > 0 && <div><p className="text-xs text-white/40 uppercase tracking-wider mb-2">Your Strengths</p>{competitorResult.clientStrengths.map((s: string, i: number) => <p key={i} className="text-xs text-emerald-400/80">- {s}</p>)}</div>}
                {competitorResult.gaps?.length > 0 && <div><p className="text-xs text-white/40 uppercase tracking-wider mb-2">Gaps</p>{competitorResult.gaps.map((s: string, i: number) => <p key={i} className="text-xs text-amber-400/80">- {s}</p>)}</div>}
                {competitorResult.opportunities?.length > 0 && <div><p className="text-xs text-white/40 uppercase tracking-wider mb-2">Opportunities</p>{competitorResult.opportunities.map((s: string, i: number) => <p key={i} className="text-xs text-accent/80">- {s}</p>)}</div>}
                {competitorResult.keywordSuggestions?.length > 0 && <div><p className="text-xs text-white/40 uppercase tracking-wider mb-2">Keywords</p><div className="flex flex-wrap gap-1.5">{competitorResult.keywordSuggestions.map((kw: string, i: number) => <span key={i} className="text-xs bg-accent/10 text-accent/70 px-2 py-0.5 rounded">{kw}</span>)}</div></div>}
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
