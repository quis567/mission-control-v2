import jsPDF from 'jspdf';

export async function exportSeoPdf(websiteId: string) {
  const res = await fetch(`/api/seo/export-recs?websiteId=${websiteId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate report');
  }
  const report = await res.json();

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addPage = () => { doc.addPage(); y = margin; };
  const checkPage = (needed: number) => { if (y + needed > 270) addPage(); };

  // Colors
  const teal: [number, number, number] = [0, 180, 150];
  const dark: [number, number, number] = [20, 30, 50];
  const gray: [number, number, number] = [120, 130, 140];
  const red: [number, number, number] = [239, 68, 68];
  const amber: [number, number, number] = [245, 158, 11];
  const green: [number, number, number] = [16, 185, 129];

  // Header
  doc.setFillColor(...dark);
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('SEO AUDIT REPORT', margin, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${report.clientName} — ${report.websiteUrl}`, margin, 28);
  doc.setTextColor(...teal);
  doc.text(`Generated ${new Date(report.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} by TruePath Studios`, margin, 35);
  y = 55;

  // Overall Score
  doc.setTextColor(...dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Overall Score', margin, y);
  y += 8;

  const scoreColor = report.overallScore >= 80 ? green : report.overallScore >= 50 ? amber : red;
  doc.setFontSize(36);
  doc.setTextColor(...scoreColor);
  doc.text(`${report.overallScore}%`, margin, y + 10);
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  doc.text(`${report.totalPages} pages analyzed · ${report.totalIssues} issues found`, margin + 35, y + 4);
  doc.text(`${report.criticalIssues} critical · ${report.importantIssues} important · ${report.tipIssues} tips`, margin + 35, y + 10);
  doc.text(`Platform: ${report.platform}`, margin + 35, y + 16);
  y += 30;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Issues Summary
  doc.setTextColor(...dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Priority Issues', margin, y);
  y += 8;

  for (const issue of report.allIssues.slice(0, 30)) {
    checkPage(12);
    const impColor = issue.importance === 'critical' ? red : issue.importance === 'important' ? amber : gray;
    doc.setFontSize(8);
    doc.setTextColor(...impColor);
    doc.setFont('helvetica', 'bold');
    const label = issue.importance.toUpperCase();
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...dark);
    doc.text(`${issue.page} — ${issue.issue}`, margin + 22, y);
    y += 6;
  }
  if (report.allIssues.length > 30) {
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.text(`+ ${report.allIssues.length - 30} more issues`, margin, y);
    y += 6;
  }
  y += 6;

  // Page-by-Page Breakdown
  checkPage(20);
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setTextColor(...dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Page-by-Page Breakdown', margin, y);
  y += 8;

  for (const page of report.pages) {
    checkPage(30);
    const pScoreColor = page.score >= 80 ? green : page.score >= 50 ? amber : red;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...dark);
    doc.text(page.url, margin, y);
    doc.setTextColor(...pScoreColor);
    doc.text(`${page.score}%`, pageWidth - margin - 10, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(`Title: ${page.title.substring(0, 80)}${page.title.length > 80 ? '...' : ''}`, margin + 4, y); y += 4;
    doc.text(`Meta: ${page.metaDescription.substring(0, 80)}${page.metaDescription.length > 80 ? '...' : ''}`, margin + 4, y); y += 4;
    doc.text(`H1: ${page.h1} · ${page.wordCount} words`, margin + 4, y); y += 4;

    if (page.issues.length > 0) {
      for (const issue of page.issues.slice(0, 5)) {
        checkPage(6);
        const iColor = issue.importance === 'critical' ? red : issue.importance === 'important' ? amber : gray;
        doc.setTextColor(...iColor);
        doc.text(`  • ${issue.issue}`, margin + 4, y); y += 4;
      }
    }
    y += 4;
  }

  // How to Fix — Platform Instructions
  checkPage(40);
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setTextColor(...dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`How to Fix — ${report.platform} Instructions`, margin, y);
  y += 8;

  const instrLabels: Record<string, string> = {
    title: 'Fix Page Titles',
    metaDescription: 'Fix Meta Descriptions',
    h1: 'Fix H1 Headings',
    ogTags: 'Add Open Graph Tags',
    images: 'Fix Image Alt Text',
    general: 'General Tips',
  };

  for (const [key, instruction] of Object.entries(report.instructions)) {
    checkPage(14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...teal);
    doc.text(instrLabels[key] || key, margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...dark);
    doc.setFontSize(8);

    // Word wrap the instruction
    const lines = doc.splitTextToSize(instruction as string, contentWidth - 4);
    for (const line of lines) {
      checkPage(5);
      doc.text(line, margin + 4, y);
      y += 4;
    }
    y += 3;
  }

  // Footer
  checkPage(20);
  y += 5;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(...teal);
  doc.text('Prepared by TruePath Studios — truepathstudios.com', margin, y);
  doc.setTextColor(...gray);
  doc.text('Need help implementing these changes? Contact us at info@truepathstudios.com', margin, y + 5);

  // Save
  const filename = `SEO_Report_${report.clientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}
