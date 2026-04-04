'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [previewReport, setPreviewReport] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const [rRes, cRes] = await Promise.all([fetch('/api/reports'), fetch('/api/clients')]);
      if (rRes.ok) setReports(await rRes.json());
      if (cRes.ok) {
        const allClients = await cRes.json();
        setClients(Array.isArray(allClients) ? allClients.filter((c: any) => c.status === 'active') : []);
      }
    } catch { /* */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerate = async (clientId: string) => {
    setGenerating(clientId);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, month: selectedMonth, year: selectedYear }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewReport(data);
        fetchData();
      }
    } catch { /* */ } finally { setGenerating(null); }
  };

  const handleBatchGenerate = async () => {
    setBatchGenerating(true);
    for (const client of clients) {
      const existing = reports.find(r => r.clientId === client.id && r.month === selectedMonth && r.year === selectedYear);
      if (!existing) {
        await handleGenerate(client.id);
      }
    }
    setBatchGenerating(false);
    fetchData();
  };

  const handleDownloadPdf = async (report: any) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let content;
    try { content = JSON.parse(report.content); } catch { content = {}; }

    const clientName = report.client?.businessName || 'Client';
    const pkgName = report.client?.package?.name || '';
    const monthName = MONTHS[report.month - 1] || '';

    // Cover
    doc.setFillColor(10, 15, 26);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(6, 182, 212);
    doc.setFontSize(28);
    doc.text('TruePath Studios', 105, 80, { align: 'center' });
    doc.setFontSize(16);
    doc.setTextColor(241, 245, 249);
    doc.text('Monthly Performance Report', 105, 100, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(148, 163, 184);
    doc.text(clientName, 105, 130, { align: 'center' });
    doc.text(`${monthName} ${report.year}`, 105, 145, { align: 'center' });
    if (pkgName) doc.text(`${pkgName} Plan`, 105, 160, { align: 'center' });

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
      return y + 10;
    };

    // Content
    doc.addPage();
    doc.setFillColor(10, 15, 26);
    doc.rect(0, 0, 210, 297, 'F');
    let y = 25;
    if (content.summary) y = addSection('Executive Summary', content.summary, y);
    if (content.seoProgress) y = addSection('SEO Performance', content.seoProgress, y);
    if (content.websiteUpdates) y = addSection('Website Updates', content.websiteUpdates, y);

    doc.addPage();
    doc.setFillColor(10, 15, 26);
    doc.rect(0, 0, 210, 297, 'F');
    y = 25;
    if (content.tasksCompleted) y = addSection('Work Completed', content.tasksCompleted, y);
    if (content.nextMonth) y = addSection('Looking Ahead', content.nextMonth, y);
    if (content.recommendations) addSection('Recommendations', content.recommendations, y);

    doc.save(`Report_${clientName.replace(/\s+/g, '_')}_${monthName}_${report.year}.pdf`);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-white/30 text-sm">Loading...</div></div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">Reports</h1>
          <p className="text-sm text-white/40 mt-1">{clients.length} active clients · {reports.length} reports generated</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="glass-subtle px-3 py-1.5 rounded-xl text-sm border-none">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="glass-subtle px-3 py-1.5 rounded-xl text-sm border-none">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleBatchGenerate}
            disabled={batchGenerating || clients.length === 0}
            className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200 disabled:opacity-40"
          >
            {batchGenerating ? 'Generating...' : 'Generate All Reports'}
          </button>
        </div>
      </div>

      {/* Preview */}
      {previewReport && (
        <div className="glass p-6 mb-6 border border-accent/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm text-accent">Report Generated — {previewReport.clientName} ({previewReport.month} {previewReport.year})</h2>
            <div className="flex gap-2">
              <button onClick={() => handleDownloadPdf({ ...previewReport, content: JSON.stringify(previewReport.content), client: { businessName: previewReport.clientName, package: { name: previewReport.packageName } }, month: selectedMonth, year: selectedYear })} className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs">Download PDF</button>
              <button onClick={() => setPreviewReport(null)} className="text-xs text-white/30 hover:text-white/60">Dismiss</button>
            </div>
          </div>
          <p className="text-sm text-white/60">{previewReport.content?.summary}</p>
          <div className="flex gap-4 mt-2 text-xs text-white/30">
            <span>{previewReport.seoChangesCount} SEO changes</span>
            <span>{previewReport.tasksCompletedCount} tasks completed</span>
          </div>
        </div>
      )}

      {/* Active Clients for Report Generation */}
      <h2 className="text-sm uppercase tracking-wider text-white/40 mb-4">Active Clients</h2>
      {clients.length === 0 ? (
        <div className="glass p-8 text-center text-white/30 text-sm">No active clients. Move clients to &quot;active&quot; status in the pipeline.</div>
      ) : (
        <div className="space-y-3 mb-8">
          {clients.map((c: any) => {
            const existingReport = reports.find(r => r.clientId === c.id && r.month === selectedMonth && r.year === selectedYear);
            return (
              <div key={c.id} className="glass p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <Link href={`/clients/${c.id}`} className="text-sm text-white/80 hover:text-white">{c.businessName}</Link>
                    <p className="text-xs text-white/30">{c.package?.name || 'No package'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {existingReport ? (
                    <>
                      <span className="text-xs text-emerald-400">Report ready</span>
                      <button onClick={() => handleDownloadPdf(existingReport)} className="text-xs text-accent hover:text-accent/80">PDF</button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleGenerate(c.id)}
                      disabled={generating === c.id}
                      className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs hover:bg-accent/20 transition-all disabled:opacity-40"
                    >
                      {generating === c.id ? 'Generating...' : 'Generate Report'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Past Reports */}
      {reports.length > 0 && (
        <>
          <h2 className="text-sm uppercase tracking-wider text-white/40 mb-4">All Reports</h2>
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="glass-subtle p-4 flex items-center justify-between">
                <div>
                  <Link href={`/clients/${r.clientId}`} className="text-sm text-white/70 hover:text-white">{r.client?.businessName}</Link>
                  <p className="text-xs text-white/30 mt-0.5">{MONTHS[r.month - 1]} {r.year} · {r.client?.package?.name || ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/20">{new Date(r.createdAt).toLocaleDateString()}</span>
                  <button onClick={() => handleDownloadPdf(r)} className="text-xs text-accent hover:text-accent/80">PDF</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
