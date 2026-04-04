'use client';

interface DeliverableViewerProps {
  content: string;
}

export default function DeliverableViewer({ content }: DeliverableViewerProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deliverable.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!content || content === '[]') {
    return (
      <div className="glass-subtle p-6 text-center text-white/30 text-sm">
        No deliverable attached
      </div>
    );
  }

  let parsed: string[];
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = [content];
  }

  const fullText = parsed.join('\n\n');

  return (
    <div>
      <div className="glass-subtle p-4 font-mono text-xs text-white/70 whitespace-pre-wrap max-h-96 overflow-y-auto">
        {parsed.map((d: string, i: number) => (
          <div key={i} className="mb-2">{d}</div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs hover:bg-accent/20 transition-all duration-200"
        >
          Copy
        </button>
        <button
          onClick={handleDownload}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs hover:bg-white/10 transition-all duration-200"
        >
          Download .md
        </button>
      </div>
    </div>
  );
}
