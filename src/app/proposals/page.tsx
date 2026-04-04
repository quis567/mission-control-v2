'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-white/40 bg-white/5',
  sent: 'text-sky-400 bg-sky-400/10',
  accepted: 'text-emerald-400 bg-emerald-400/10',
  declined: 'text-red-400 bg-red-400/10',
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [genForm, setGenForm] = useState({ clientId: '', packageId: '', customPrice: '', notes: '' });
  const [previewProposal, setPreviewProposal] = useState<any>(null);

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch('/api/proposals');
      if (res.ok) setProposals(await res.json());
    } catch { /* */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProposals(); }, [fetchProposals]);

  const openGenModal = async () => {
    const [cRes, pRes] = await Promise.all([fetch('/api/clients'), fetch('/api/packages')]);
    if (cRes.ok) setClients(await cRes.json());
    if (pRes.ok) setPackages(await pRes.json());
    setShowGenModal(true);
  };

  const handleGenerate = async () => {
    if (!genForm.clientId) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(genForm),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewProposal(data);
        setShowGenModal(false);
        fetchProposals();
      }
    } catch { /* */ } finally { setGenerating(false); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    await fetch('/api/proposals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    fetchProposals();
  };

  const handleDownloadPdf = async (proposal: any) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let content;
    try { content = JSON.parse(proposal.content); } catch { content = {}; }

    const clientName = proposal.client?.businessName || 'Client';
    const contactName = proposal.client?.contactName || '';
    const price = proposal.customPrice || 0;

    // Cover page
    doc.setFillColor(10, 15, 26);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(6, 182, 212);
    doc.setFontSize(28);
    doc.text('TruePath Studios', 105, 80, { align: 'center' });
    doc.setFontSize(16);
    doc.setTextColor(241, 245, 249);
    doc.text('Website & Digital Marketing Proposal', 105, 100, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(148, 163, 184);
    doc.text(`Prepared for: ${clientName}`, 105, 130, { align: 'center' });
    if (contactName) doc.text(contactName, 105, 142, { align: 'center' });
    doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 105, 160, { align: 'center' });

    // Content pages
    const addSection = (title: string, text: string, yStart: number): number => {
      doc.setFontSize(14);
      doc.setTextColor(6, 182, 212);
      doc.text(title, 20, yStart);
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 210);
      const lines = doc.splitTextToSize(text, 170);
      let y = yStart + 8;
      for (const line of lines) {
        if (y > 275) { doc.addPage(); doc.setFillColor(10, 15, 26); doc.rect(0, 0, 210, 297, 'F'); y = 20; }
        doc.text(line, 20, y);
        y += 5;
      }
      return y + 8;
    };

    // Page 2 - Executive Summary + Audit
    doc.addPage();
    doc.setFillColor(10, 15, 26);
    doc.rect(0, 0, 210, 297, 'F');
    let y = 25;
    if (content.executiveSummary) y = addSection('Executive Summary', content.executiveSummary, y);
    if (content.websiteAudit) y = addSection('Website Assessment', content.websiteAudit, y);

    // Page 3 - Deliverables + Timeline
    doc.addPage();
    doc.setFillColor(10, 15, 26);
    doc.rect(0, 0, 210, 297, 'F');
    y = 25;
    if (content.deliverables?.length) {
      y = addSection('What We\'ll Deliver', content.deliverables.map((d: string) => `• ${d}`).join('\n'), y);
    }
    if (content.timeline?.length) {
      const timelineText = content.timeline.map((t: any) => `${t.phase} (${t.duration}): ${t.description}`).join('\n');
      y = addSection('Project Timeline', timelineText, y);
    }

    // Page 4 - Investment
    doc.addPage();
    doc.setFillColor(10, 15, 26);
    doc.rect(0, 0, 210, 297, 'F');
    y = 25;
    y = addSection('Your Investment', `Package: ${price > 0 ? `$${price.toLocaleString()}/month` : 'Custom pricing'}\n\nThis includes all deliverables listed above with ongoing monthly support, maintenance, and optimization.`, y);

    // Page 5 - Why TruePath + Next Steps
    if (content.whyTruePath?.length) {
      y = addSection('Why TruePath Studios', content.whyTruePath.map((r: string) => `• ${r}`).join('\n'), y);
    }
    if (content.nextSteps) {
      if (y > 200) { doc.addPage(); doc.setFillColor(10, 15, 26); doc.rect(0, 0, 210, 297, 'F'); y = 25; }
      addSection('Next Steps', content.nextSteps, y);
    }

    doc.save(`Proposal_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-white/30 text-sm">Loading...</div></div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">Proposals</h1>
          <p className="text-sm text-white/40 mt-1">{proposals.length} total</p>
        </div>
        <button onClick={openGenModal} className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200">
          + Generate Proposal
        </button>
      </div>

      {/* Preview */}
      {previewProposal && (
        <div className="glass p-6 mb-6 border border-accent/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm text-accent">Proposal Generated — {previewProposal.clientName}</h2>
            <div className="flex gap-2">
              <button onClick={() => handleDownloadPdf({ ...previewProposal, content: JSON.stringify(previewProposal.content), customPrice: previewProposal.packagePrice, client: { businessName: previewProposal.clientName, contactName: previewProposal.contactName } })} className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs">Download PDF</button>
              <button onClick={() => setPreviewProposal(null)} className="text-xs text-white/30 hover:text-white/60">Dismiss</button>
            </div>
          </div>
          <div className="space-y-3 text-sm text-white/60">
            {previewProposal.content.executiveSummary && <p>{previewProposal.content.executiveSummary.substring(0, 200)}...</p>}
            <p className="text-xs text-white/30">Package: {previewProposal.packageName} · ${previewProposal.packagePrice}/mo</p>
          </div>
        </div>
      )}

      {/* Proposals List */}
      {proposals.length === 0 ? (
        <div className="glass p-12 text-center">
          <p className="text-white/30 text-sm">No proposals yet</p>
          <button onClick={openGenModal} className="mt-3 text-accent text-sm hover:text-accent/80 transition-colors">Generate your first proposal</button>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map(p => (
            <div key={p.id} className="glass p-5 hover:bg-white/15 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <Link href={`/clients/${p.clientId}`} className="text-sm text-white/80 hover:text-white">{p.client?.businessName}</Link>
                    <p className="text-xs text-white/30 mt-0.5">{p.client?.businessType} · {new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-lg ${STATUS_COLORS[p.status] || ''}`}>{p.status}</span>
                  {p.customPrice && <span className="text-xs text-emerald-400">${p.customPrice.toLocaleString()}/mo</span>}
                  <div className="flex gap-1">
                    <button onClick={() => handleDownloadPdf(p)} className="text-xs text-accent hover:text-accent/80">PDF</button>
                    {p.status === 'draft' && <button onClick={() => handleStatusUpdate(p.id, 'sent')} className="text-xs text-sky-400 hover:text-sky-300">Mark Sent</button>}
                    {p.status === 'sent' && (
                      <>
                        <button onClick={() => handleStatusUpdate(p.id, 'accepted')} className="text-xs text-emerald-400 hover:text-emerald-300">Accepted</button>
                        <button onClick={() => handleStatusUpdate(p.id, 'declined')} className="text-xs text-red-400 hover:text-red-300">Declined</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowGenModal(false)} />
          <div className="glass-elevated p-8 w-full max-w-lg relative z-10">
            <h2 className="text-xl font-light tracking-wide text-white mb-6">Generate Proposal</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider">Client *</label>
                <select value={genForm.clientId} onChange={e => setGenForm(f => ({ ...f, clientId: e.target.value }))} className="mt-1 text-sm">
                  <option value="">Select client...</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider">Package</label>
                <select value={genForm.packageId} onChange={e => setGenForm(f => ({ ...f, packageId: e.target.value }))} className="mt-1 text-sm">
                  <option value="">Use client&apos;s current package</option>
                  {packages.map((p: any) => <option key={p.id} value={p.id}>{p.name} — ${p.price}/mo</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider">Custom Price Override ($/mo)</label>
                <input type="number" value={genForm.customPrice} onChange={e => setGenForm(f => ({ ...f, customPrice: e.target.value }))} placeholder="Leave blank to use package price" className="mt-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider">Additional Notes</label>
                <textarea value={genForm.notes} onChange={e => setGenForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any specific details to include..." rows={3} className="mt-1 text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowGenModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60 hover:bg-white/10 transition-all duration-200">Cancel</button>
                <button onClick={handleGenerate} disabled={generating || !genForm.clientId} className="flex-1 py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 transition-all duration-200 disabled:opacity-40">
                  {generating ? 'Generating...' : 'Generate Proposal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
