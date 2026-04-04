'use client';

import { useRouter } from 'next/navigation';

interface PipelineClient {
  id: string;
  businessName: string;
  contactName?: string | null;
  businessType?: string | null;
  monthlyRevenue?: number | null;
  tags?: string | null;
  status: string;
  updatedAt: string;
  createdAt: string;
  package?: { id: string; name: string; price: number } | null;
}

interface PipelineColumnProps {
  status: string;
  label: string;
  color: string;
  clients: PipelineClient[];
  onDrop: (clientId: string, status: string) => void;
  onQuickAction: (clientId: string, action: 'note' | 'task') => void;
}

export default function PipelineColumn({ status, label, color, clients, onDrop, onQuickAction }: PipelineColumnProps) {
  const router = useRouter();
  const totalRevenue = clients.reduce((sum, c) => sum + (c.monthlyRevenue || 0), 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('ring-1', 'ring-accent/30');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-1', 'ring-accent/30');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-1', 'ring-accent/30');
    const clientId = e.dataTransfer.getData('clientId');
    if (clientId) onDrop(clientId, status);
  };

  return (
    <div
      className="glass-subtle p-3 min-h-[65vh] transition-all duration-200"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${color}`} />
          <h2 className="text-xs uppercase tracking-wider text-white/40 font-medium">{label}</h2>
        </div>
        <span className="text-xs text-white/25 bg-white/5 px-1.5 py-0.5 rounded">{clients.length}</span>
      </div>

      {totalRevenue > 0 && (
        <div className="text-xs text-emerald-400/50 px-1 mb-3">${totalRevenue.toLocaleString()}/mo</div>
      )}

      <div className="space-y-3">
        {clients.map(client => {
          const daysInStage = Math.floor((Date.now() - new Date(client.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
          let parsedTags: string[] = [];
          try { parsedTags = client.tags ? JSON.parse(client.tags) : []; } catch { /* */ }

          return (
            <div
              key={client.id}
              draggable
              onDragStart={e => e.dataTransfer.setData('clientId', client.id)}
              className="glass p-4 cursor-grab active:cursor-grabbing hover:bg-white/15 transition-all duration-200 group"
            >
              <div
                className="cursor-pointer"
                onClick={() => router.push(`/clients/${client.id}`)}
              >
                <h3 className="text-sm font-medium text-white/90">{client.businessName}</h3>
                {client.contactName && <p className="text-xs text-white/40 mt-0.5">{client.contactName}</p>}
                {client.businessType && <p className="text-xs text-white/30 mt-0.5">{client.businessType}</p>}

                {client.package && (
                  <p className="text-xs text-accent/60 mt-1">{client.package.name}</p>
                )}

                <div className="flex items-center gap-2 mt-2">
                  {client.monthlyRevenue != null && client.monthlyRevenue > 0 && (
                    <span className="text-xs text-emerald-400/70">${client.monthlyRevenue.toLocaleString()}/mo</span>
                  )}
                  <span className="text-xs text-white/20">{daysInStage}d</span>
                </div>

                {parsedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {parsedTags.map((tag: string, i: number) => (
                      <span key={i} className="text-xs bg-accent/10 text-accent/60 px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-1 mt-2 pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); onQuickAction(client.id, 'note'); }}
                  className="text-xs text-white/30 hover:text-white/60 px-1.5 py-0.5 rounded hover:bg-white/5"
                >
                  + Note
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onQuickAction(client.id, 'task'); }}
                  className="text-xs text-white/30 hover:text-white/60 px-1.5 py-0.5 rounded hover:bg-white/5"
                >
                  + Task
                </button>
                <button
                  onClick={e => { e.stopPropagation(); router.push(`/clients/${client.id}`); }}
                  className="text-xs text-white/30 hover:text-white/60 px-1.5 py-0.5 rounded hover:bg-white/5 ml-auto"
                >
                  View
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
