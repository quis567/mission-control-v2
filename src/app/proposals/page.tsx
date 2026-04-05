'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import jsPDF from 'jspdf';

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-white/40 bg-white/5', sent: 'text-sky-400 bg-sky-400/10',
  accepted: 'text-emerald-400 bg-emerald-400/10', declined: 'text-red-400 bg-red-400/10', expired: 'text-amber-400 bg-amber-400/10',
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // Creation form state
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [discount, setDiscount] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [previewProposal, setPreviewProposal] = useState<any>(null);

  const fetchProposals = useCallback(async () => {
    try { const res = await fetch('/api/proposals'); if (res.ok) setProposals(await res.json()); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProposals(); }, [fetchProposals]);

  const openCreate = async () => {
    const [cRes, tRes] = await Promise.all([fetch('/api/clients'), fetch('/api/service-templates')]);
    if (cRes.ok) setClients(await cRes.json());
    if (tRes.ok) setTemplates(await tRes.json());
    setSelectedClient(''); setSelectedPkg(null); setSelectedAddons(new Set()); setDiscount(''); setCustomNotes('');
    setShowCreate(true);
  };

  const packages = templates.filter(t => t.category === 'package');
  const addons = templates.filter(t => t.category === 'addon');
  const selectedAddonData = addons.filter(a => selectedAddons.has(a.id));
  const discountPct = parseFloat(discount) || 0;
  const pkgPrice = selectedPkg?.price || 0;
  const discountAmt = pkgPrice * (discountPct / 100);
  const totalOneTime = pkgPrice - discountAmt;
  const totalMonthly = selectedAddonData.reduce((s, a) => s + a.price, 0);

  const handleGenerate = async () => {
    if (!selectedClient || !selectedPkg) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/proposals/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient,
          packageName: selectedPkg.name,
          packagePrice: selectedPkg.price,
          addons: selectedAddonData.map(a => ({ name: a.name, price: a.price })),
          discount: discountPct || null,
          customNotes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewProposal(data);
        setShowCreate(false);
        fetchProposals();
      }
    } catch {} finally { setGenerating(false); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    await fetch('/api/proposals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    fetchProposals();
  };

  // Branded PDF generator
  const generatePdf = (proposal: any) => {
    let content: any;
    try { content = typeof proposal.content === 'string' ? JSON.parse(proposal.content) : proposal.content; } catch { content = {}; }

    const clientName = proposal.client?.businessName || proposal.clientName || 'Client';
    const contactName = proposal.client?.contactName || proposal.contactName || '';
    const pkgName = proposal.packageName || 'Custom';
    const pkgPriceVal = proposal.packagePrice || proposal.totalOneTime || 0;
    const proposalAddons: { name: string; price: number }[] = proposal.addons ? (typeof proposal.addons === 'string' ? JSON.parse(proposal.addons) : proposal.addons) : [];
    const monthlyTotalVal = proposal.totalMonthly || proposalAddons.reduce((s: number, a: any) => s + a.price, 0);
    const proposalNum = proposal.proposalNumber || `TP-${new Date().getFullYear()}-0001`;
    const validDate = proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const m = 25; // margin
    const cw = pw - m * 2;

    const blue: [number, number, number] = [26, 79, 138];
    const dark: [number, number, number] = [26, 32, 44];
    const gray: [number, number, number] = [148, 163, 184];
    const greenC: [number, number, number] = [16, 185, 129];
    const lightBlueBg: [number, number, number] = [232, 240, 248];

    let pageNum = 0;

    const addHeader = () => {
      pageNum++;
      if (pageNum > 1) {
        doc.setFontSize(8); doc.setTextColor(...gray);
        doc.text('TruePath Studios', m, 12);
        doc.text(`Page ${pageNum}`, pw - m, 12, { align: 'right' });
        doc.setDrawColor(226, 232, 240); doc.line(m, 15, pw - m, 15);
      }
    };

    const sectionTitle = (title: string, y: number) => {
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue);
      doc.text(title, m, y);
      doc.setDrawColor(...blue); doc.line(m, y + 2, m + 50, y + 2);
      return y + 10;
    };

    const bodyText = (text: string, y: number) => {
      doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(...dark);
      const lines = doc.splitTextToSize(text, cw);
      for (const line of lines) {
        if (y > 270) { doc.addPage(); addHeader(); y = 22; }
        doc.text(line, m, y); y += 5.5;
      }
      return y + 4;
    };

    // PAGE 1: Cover
    addHeader();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pw, 297, 'F');
    // Logo placeholder - text version
    doc.setFontSize(24); doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue);
    doc.text('TruePath Studios', pw / 2, 60, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...gray);
    doc.text('Websites & SEO for Trades & Construction', pw / 2, 70, { align: 'center' });

    doc.setFontSize(28); doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue);
    doc.text('WEBSITE & SEO', pw / 2, 110, { align: 'center' });
    doc.text('PROPOSAL', pw / 2, 125, { align: 'center' });

    doc.setFontSize(14); doc.setFont('helvetica', 'normal'); doc.setTextColor(...dark);
    doc.text('Prepared for:', pw / 2, 150, { align: 'center' });
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text(clientName, pw / 2, 162, { align: 'center' });

    doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(...gray);
    doc.text(`Prepared by: TruePath Studios`, pw / 2, 190, { align: 'center' });
    doc.text(`Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, pw / 2, 198, { align: 'center' });
    doc.text(`Proposal #: ${proposalNum}`, pw / 2, 206, { align: 'center' });

    doc.setDrawColor(...blue); doc.line(pw / 2 - 30, 230, pw / 2 + 30, 230);
    doc.setFontSize(10); doc.setTextColor(...gray);
    doc.text('info@truepathstudios.com', pw / 2, 240, { align: 'center' });
    doc.text('truepathstudios.com', pw / 2, 248, { align: 'center' });

    // PAGE 2: About + Understanding
    doc.addPage(); addHeader(); let y = 22;
    y = sectionTitle('ABOUT TRUEPATH STUDIOS', y);
    y = bodyText('TruePath Studios is a web design and SEO agency based in Central Florida that specializes in building high-converting websites for trades and construction businesses. We understand that contractors, plumbers, roofers, electricians, and other trades professionals need more than just a pretty website — they need a lead-generating machine that works as hard as they do.', y);
    y = bodyText('Our approach is conversion-first: every page, every element, and every word is designed to turn visitors into phone calls and form submissions. We combine professional design with aggressive local SEO to ensure your business dominates search results in your service area.', y);
    y += 4;
    y = sectionTitle('UNDERSTANDING YOUR BUSINESS', y);
    if (content.executiveSummary) y = bodyText(content.executiveSummary, y);

    // PAGE 3: Assessment
    if (content.currentAssessment) {
      doc.addPage(); addHeader(); y = 22;
      y = sectionTitle('CURRENT WEBSITE ASSESSMENT', y);
      y = bodyText(content.currentAssessment, y);
    }

    // PAGE 4: Solution
    doc.addPage(); addHeader(); y = 22;
    y = sectionTitle('OUR RECOMMENDED SOLUTION', y);
    if (content.solution) y = bodyText(content.solution, y);
    if (content.keyBenefits?.length) {
      y += 4;
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue);
      doc.text('KEY DELIVERABLES', m, y); y += 8;
      for (const benefit of content.keyBenefits) {
        if (y > 270) { doc.addPage(); addHeader(); y = 22; }
        doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(...greenC);
        doc.text('✓', m, y);
        doc.setTextColor(...dark);
        doc.text(benefit, m + 8, y);
        y += 7;
      }
    }

    // PAGE 5: Investment
    doc.addPage(); addHeader(); y = 22;
    y = sectionTitle('YOUR INVESTMENT', y);

    // Package box
    doc.setFillColor(...lightBlueBg); doc.setDrawColor(...blue);
    doc.roundedRect(m, y, cw, 60, 3, 3, 'FD');
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue);
    doc.text(`${pkgName.toUpperCase()} PACKAGE`, m + 8, y + 12);
    doc.setFontSize(22); doc.text(`$${pkgPriceVal.toLocaleString()}`, m + 8, y + 28);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...gray);
    doc.text('one-time investment', m + 8, y + 36);
    if (proposal.discount) {
      doc.setTextColor(239, 68, 68);
      doc.text(`${proposal.discount}% discount applied`, m + 8, y + 44);
    }
    y += 68;

    // Add-ons table
    if (proposalAddons.length > 0) {
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue);
      doc.text('ONGOING GROWTH (OPTIONAL)', m, y); y += 8;

      // Table header
      doc.setFillColor(...blue); doc.rect(m, y, cw, 8, 'F');
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text('Service', m + 4, y + 5.5); doc.text('Monthly', pw - m - 4, y + 5.5, { align: 'right' }); y += 8;

      for (let i = 0; i < proposalAddons.length; i++) {
        const bg = i % 2 === 0 ? [255, 255, 255] : [247, 248, 250];
        doc.setFillColor(bg[0], bg[1], bg[2]); doc.rect(m, y, cw, 8, 'F');
        doc.setDrawColor(226, 232, 240); doc.line(m, y + 8, pw - m, y + 8);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...dark);
        doc.text(proposalAddons[i].name, m + 4, y + 5.5);
        doc.text(`$${proposalAddons[i].price}/mo`, pw - m - 4, y + 5.5, { align: 'right' }); y += 8;
      }
      // Total row
      doc.setFillColor(...lightBlueBg); doc.rect(m, y, cw, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Monthly Total', m + 4, y + 5.5);
      doc.text(`$${monthlyTotalVal}/mo`, pw - m - 4, y + 5.5, { align: 'right' }); y += 14;
    }

    // Grand total
    doc.setDrawColor(...blue); doc.line(m, y, pw - m, y); y += 6;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark);
    doc.text(`TOTAL ONE-TIME:  $${pkgPriceVal.toLocaleString()}`, m, y); y += 7;
    if (monthlyTotalVal > 0) { doc.text(`TOTAL MONTHLY:   $${monthlyTotalVal}/mo`, m, y); y += 7; }
    doc.setDrawColor(...blue); doc.line(m, y, pw - m, y); y += 8;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...gray);
    doc.text('* No contracts. Month-to-month for all ongoing services. Cancel anytime.', m, y);

    // PAGE 6: Process
    doc.addPage(); addHeader(); y = 22;
    y = sectionTitle('OUR PROCESS', y);
    const steps = [
      { phase: 'WEEK 1-2: STRATEGY & DESIGN', desc: 'We learn your business, target market, and goals. Design concepts delivered for your review and feedback.' },
      { phase: 'WEEK 2-3: BUILD & DEVELOP', desc: 'Custom website built with conversion-first layouts, your branding, and optimized content.' },
      { phase: 'WEEK 3-4: OPTIMIZE & LAUNCH', desc: 'SEO optimization, speed tuning, mobile testing. Go live and start generating leads.' },
      { phase: 'ONGOING: GROW & IMPROVE', desc: 'Monthly reporting, SEO refinement, and continuous improvement to keep growing results.' },
    ];
    for (const step of steps) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue);
      doc.text(step.phase, m, y); y += 6;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...dark);
      const lines = doc.splitTextToSize(step.desc, cw);
      for (const line of lines) { doc.text(line, m, y); y += 5; }
      y += 6;
    }

    // PAGE 7: Next Steps
    doc.addPage(); addHeader(); y = 22;
    y = sectionTitle('READY TO GET STARTED?', y);
    y = bodyText("Here's what happens next:", y);
    const nextSteps = ['Reply to this proposal or call us', "We'll schedule a kickoff call", 'Work begins within 48 hours'];
    for (let i = 0; i < nextSteps.length; i++) {
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue);
      doc.text(`${i + 1}.`, m, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...dark);
      doc.text(nextSteps[i], m + 10, y); y += 8;
    }
    y += 8;
    if (validDate) { doc.setFontSize(10); doc.setTextColor(...gray); doc.text(`This proposal is valid until ${validDate}.`, m, y); y += 12; }
    doc.setDrawColor(...blue); doc.line(m, y, pw - m, y); y += 10;
    doc.setFontSize(11); doc.setTextColor(...dark); doc.setFont('helvetica', 'bold');
    doc.text('TruePath Studios', m, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...gray);
    doc.text('info@truepathstudios.com', m, y); y += 5;
    doc.text('truepathstudios.com', m, y); y += 12;
    doc.setFontSize(12); doc.setTextColor(...blue); doc.setFont('helvetica', 'bold');
    doc.text('Thank you for considering TruePath Studios.', pw / 2, y, { align: 'center' });

    doc.save(`Proposal_${clientName.replace(/\s+/g, '_')}_${proposalNum}.pdf`);
  };

  // Stats
  const draftCount = proposals.filter(p => p.status === 'draft').length;
  const sentCount = proposals.filter(p => p.status === 'sent').length;
  const acceptedCount = proposals.filter(p => p.status === 'accepted').length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-white/30 text-sm">Loading...</div></div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">Proposals</h1>
          <p className="text-sm text-white/40 mt-1">
            {proposals.length} total{draftCount > 0 && ` · ${draftCount} draft`}{sentCount > 0 && ` · ${sentCount} sent`}{acceptedCount > 0 && ` · ${acceptedCount} accepted`}
          </p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all">+ Create Proposal</button>
      </div>

      {/* Preview */}
      {previewProposal && (
        <div className="glass p-6 mb-6 border border-accent/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm text-accent">Proposal Generated — {previewProposal.clientName}</h2>
              <p className="text-xs text-white/30 mt-0.5">{previewProposal.proposalNumber} · {previewProposal.packageName} · ${previewProposal.totalOneTime?.toLocaleString()}{previewProposal.totalMonthly > 0 ? ` + $${previewProposal.totalMonthly}/mo` : ''}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => generatePdf(previewProposal)} className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs">Download PDF</button>
              <button onClick={() => setPreviewProposal(null)} className="text-xs text-white/30 hover:text-white/60">Dismiss</button>
            </div>
          </div>
          <p className="text-xs text-white/50">{previewProposal.content?.executiveSummary?.substring(0, 300)}...</p>
        </div>
      )}

      {/* Proposals List */}
      {proposals.length === 0 && !showCreate ? (
        <div className="glass p-12 text-center">
          <p className="text-white/30 text-sm">No proposals yet</p>
          <button onClick={openCreate} className="mt-3 text-accent text-sm hover:text-accent/80">Create your first proposal</button>
        </div>
      ) : !showCreate && (
        <div className="space-y-3">
          {proposals.map(p => (
            <div key={p.id} className="glass p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {p.proposalNumber && <span className="text-xs text-white/25">{p.proposalNumber}</span>}
                    <Link href={`/clients/${p.clientId}`} className="text-sm text-white/80 hover:text-white">{p.client?.businessName}</Link>
                  </div>
                  <p className="text-xs text-white/30 mt-0.5">
                    {p.packageName || 'Custom'}{p.totalOneTime ? ` · $${p.totalOneTime.toLocaleString()}` : ''}{p.totalMonthly ? ` + $${p.totalMonthly}/mo` : ''} · {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-lg ${STATUS_COLORS[p.status] || ''}`}>{p.status}</span>
                  <div className="flex gap-1">
                    <button onClick={() => generatePdf(p)} className="text-xs text-accent hover:text-accent/80 px-2 py-1 rounded hover:bg-accent/5">PDF</button>
                    {p.status === 'draft' && <button onClick={() => handleStatusUpdate(p.id, 'sent')} className="text-xs text-sky-400 hover:text-sky-300 px-2 py-1 rounded hover:bg-sky-400/5">Mark Sent</button>}
                    {p.status === 'sent' && (
                      <>
                        <button onClick={() => handleStatusUpdate(p.id, 'accepted')} className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded hover:bg-emerald-400/5">Accepted</button>
                        <button onClick={() => handleStatusUpdate(p.id, 'declined')} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-400/5">Declined</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Proposal */}
      {showCreate && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-light text-white/80">Create Proposal</h2>
            <button onClick={() => setShowCreate(false)} className="text-xs text-white/30 hover:text-white/60">Cancel</button>
          </div>

          {/* Client Select */}
          <div className="glass p-5">
            <label className="text-xs text-white/50 uppercase tracking-wider">Client *</label>
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="mt-1 text-sm">
              <option value="">Select client...</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.businessName} — {c.businessType || 'Unknown'}{c.city ? `, ${c.city}` : ''}</option>)}
            </select>
          </div>

          {/* Package Selection */}
          <div>
            <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Select Package</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {packages.map(pkg => {
                const isSelected = selectedPkg?.id === pkg.id;
                let features: string[] = [];
                try { features = JSON.parse(pkg.features); } catch {}
                return (
                  <button key={pkg.id} onClick={() => setSelectedPkg(isSelected ? null : pkg)}
                    className={`glass p-4 text-left transition-all ${isSelected ? 'border border-accent/40 bg-accent/5' : 'border border-transparent hover:border-white/10'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white/80">{pkg.name}</span>
                      {pkg.isPopular && <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent/20 text-accent">Most Popular</span>}
                    </div>
                    <p className="text-xl font-light text-accent mb-1">${pkg.price.toLocaleString()}</p>
                    <p className="text-[10px] text-white/25 mb-3">one-time</p>
                    <div className="space-y-1">
                      {features.slice(0, 5).map((f, i) => (
                        <p key={i} className="text-[10px] text-white/40 flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-accent/50 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                          {f}
                        </p>
                      ))}
                      {features.length > 5 && <p className="text-[10px] text-white/25">+{features.length - 5} more</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monthly Add-ons */}
          <div>
            <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Monthly Add-ons (optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {addons.map(addon => {
                const isSelected = selectedAddons.has(addon.id);
                return (
                  <button key={addon.id} onClick={() => {
                    setSelectedAddons(prev => { const n = new Set(prev); if (n.has(addon.id)) n.delete(addon.id); else n.add(addon.id); return n; });
                  }} className={`glass p-4 text-left transition-all ${isSelected ? 'border border-accent/40 bg-accent/5' : 'border border-transparent hover:border-white/10'}`}>
                    <span className="text-sm font-medium text-white/80">{addon.name}</span>
                    <p className="text-lg font-light text-accent mt-1">${addon.price}<span className="text-xs text-white/25">/mo</span></p>
                    <p className="text-[10px] text-white/30 mt-1">{addon.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div className="glass p-5 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">Discount (%)</label>
              <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/50 uppercase tracking-wider">Custom Notes</label>
              <input value={customNotes} onChange={e => setCustomNotes(e.target.value)} placeholder="Special details..." className="mt-1 text-sm" />
            </div>
          </div>

          {/* Summary */}
          <div className="glass p-5 border border-white/10">
            <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Proposal Summary</h3>
            {!selectedPkg ? <p className="text-xs text-white/25">Select a package above</p> : (
              <div className="space-y-2">
                <div className="flex justify-between text-xs"><span className="text-white/60">{selectedPkg.name} Package</span><span className="text-accent">${selectedPkg.price.toLocaleString()} (one-time)</span></div>
                {discountPct > 0 && <div className="flex justify-between text-xs"><span className="text-red-400/70">Discount ({discountPct}%)</span><span className="text-red-400">-${discountAmt.toLocaleString()}</span></div>}
                {selectedAddonData.map(a => <div key={a.id} className="flex justify-between text-xs"><span className="text-white/60">{a.name}</span><span className="text-accent">${a.price}/mo</span></div>)}
                <div className="pt-2 mt-2 border-t border-white/10 space-y-1">
                  <div className="flex justify-between text-xs font-medium"><span className="text-white/50">One-time investment</span><span className="text-white/80">${totalOneTime.toLocaleString()}</span></div>
                  {totalMonthly > 0 && <div className="flex justify-between text-xs font-medium"><span className="text-white/50">Monthly investment</span><span className="text-white/80">${totalMonthly}/mo</span></div>}
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-white/15 text-white/40 text-xs">Cancel</button>
              <button onClick={handleGenerate} disabled={!selectedClient || !selectedPkg || generating}
                className="px-4 py-2 rounded-lg bg-accent/20 text-accent text-xs disabled:opacity-40">
                {generating ? 'Generating...' : 'Generate Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
