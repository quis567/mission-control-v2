'use client';

import { useRouter } from 'next/navigation';

interface PipelineColumnProps {
  status: string;
  label: string;
  color: string;
  clients: any[];
  revenueLabel: string;
  onDrop: (clientId: string, status: string) => void;
  onQuickAction: (clientId: string, action: 'note' | 'task') => void;
}

const HEALTH_DOT: Record<string, string> = { green: 'bg-emerald-400', yellow: 'bg-amber-400', red: 'bg-red-400', gray: 'bg-white/20' };

function staleBorder(daysInStage: number, status: string): string {
  const isProposal = status === 'proposal';
  const isLeadLike = ['lead', 'prospect'].includes(status);
  if (!isLeadLike && !isProposal) return '';
  if (isProposal) {
    if (daysInStage >= 14) return 'border-l-2 border-l-red-400/60';
    if (daysInStage >= 7) return 'border-l-2 border-l-amber-400/60';
  } else {
    if (daysInStage >= 30) return 'border-l-2 border-l-red-400/60';
    if (daysInStage >= 14) return 'border-l-2 border-l-amber-400/60';
    if (daysInStage >= 8) return 'border-l-2 border-l-amber-400/30';
  }
  return '';
}

function staleLabel(daysInStage: number, status: string): { text: string; color: string } | null {
  const isProposal = status === 'proposal';
  const isLeadLike = ['lead', 'prospect'].includes(status);
  if (!isLeadLike && !isProposal) return null;
  if (isProposal) {
    if (daysInStage >= 14) return { text: `Stale — ${daysInStage}d`, color: 'text-red-400' };
    if (daysInStage >= 7) return { text: `Going cold — ${daysInStage}d`, color: 'text-amber-400' };
  } else {
    if (daysInStage >= 30) return { text: `Stale — ${daysInStage}d`, color: 'text-red-400' };
    if (daysInStage >= 14) return { text: `Going cold — ${daysInStage}d`, color: 'text-amber-400' };
  }
  return null;
}

export default function PipelineColumn({ status, label, color, clients, revenueLabel, onDrop, onQuickAction }: PipelineColumnProps) {
  const router = useRouter();
  const columnRevenue = clients.reduce((sum, c) => sum + (c.monthlyRevenue || 0), 0);

  // Sort: stale deals at top for lead/prospect/proposal
  const sorted = [...clients].sort((a, b) => {
    const aDays = a.daysInStage || 0;
    const bDays = b.daysInStage || 0;
    return bDays - aDays;
  });

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.currentTarget.classList.add('ring-1', 'ring-accent/30'); };
  const handleDragLeave = (e: React.DragEvent) => { e.currentTarget.classList.remove('ring-1', 'ring-accent/30'); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.currentTarget.classList.remove('ring-1', 'ring-accent/30'); const id = e.dataTransfer.getData('clientId'); if (id) onDrop(id, status); };

  const isActive = status === 'active';
  const isLost = status === 'paused' || status === 'churned';

  return (
    <div className="glass-subtle p-3 min-h-[65vh] transition-all duration-200" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {/* Column Header */}
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <h2 className="text-xs uppercase tracking-wider text-white/40 font-medium">{label}</h2>
          </div>
          <span className="text-xs text-white/25 bg-white/5 px-1.5 py-0.5 rounded">{clients.length}</span>
        </div>
        <p className="text-[10px] mt-1 text-white/20">
          ${columnRevenue.toLocaleString()}/mo {revenueLabel}
        </p>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {sorted.map(client => {
          const daysInStage = client.daysInStage || 0;
          const stale = staleLabel(daysInStage, status);
          const border = staleBorder(daysInStage, status);

          return (
            <div key={client.id} draggable onDragStart={e => e.dataTransfer.setData('clientId', client.id)}
              className={`glass p-3 cursor-grab active:cursor-grabbing hover:bg-white/[0.06] transition-all duration-200 group ${border}`}>
              <div className="cursor-pointer" onClick={() => router.push(`/clients/${client.id}`)}>
                {/* Name + health */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white/90 truncate">{client.businessName}</h3>
                  {isActive && <div className={`w-2 h-2 rounded-full shrink-0 ${HEALTH_DOT[client.health] || 'bg-white/20'}`} />}
                </div>
                {client.contactName && <p className="text-[10px] text-white/35 mt-0.5">{client.contactName}</p>}
                {client.businessType && <p className="text-[10px] text-white/25">{client.businessType}{client.city ? ` · ${client.city}` : ''}</p>}

                {/* Revenue */}
                <div className="mt-2">
                  {isLost ? (
                    <p className="text-xs text-white/30">Was: ${(client.monthlyRevenue || 0).toLocaleString()}/mo{client.package ? ` · ${client.package.name}` : ''}</p>
                  ) : (
                    <p className="text-xs text-accent">{client.monthlyRevenue ? `$${client.monthlyRevenue.toLocaleString()}/mo` : isActive ? '$0/mo' : 'No estimate'}{client.package ? ` · ${client.package.name}` : isActive ? '' : ''}</p>
                  )}
                </div>

                {/* SEO for active */}
                {isActive && client.avgSeoScore !== null && (
                  <p className="text-[10px] mt-1 text-white/30">
                    SEO: <span className={client.avgSeoScore >= 80 ? 'text-emerald-400' : client.avgSeoScore >= 50 ? 'text-amber-400' : 'text-red-400'}>{client.avgSeoScore}%</span>
                    {client.totalSeoIssues > 0 && <span> · {client.totalSeoIssues} issues</span>}
                  </p>
                )}

                {/* Time in stage */}
                <p className="text-[10px] text-white/20 mt-1">
                  {isActive ? `Active for ${daysInStage}d` : isLost ? `${status === 'churned' ? 'Churned' : 'Paused'} ${daysInStage}d ago` : `${label} for ${daysInStage}d`}
                </p>

                {/* Stale warning */}
                {stale && <p className={`text-[10px] mt-1 ${stale.color}`}>{stale.text}</p>}
              </div>

              {/* Quick actions */}
              <div className="flex gap-1 mt-2 pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => { e.stopPropagation(); onQuickAction(client.id, 'task'); }} className="text-[10px] text-white/30 hover:text-white/60 px-1.5 py-0.5 rounded hover:bg-white/5">+task</button>
                <button onClick={e => { e.stopPropagation(); onQuickAction(client.id, 'note'); }} className="text-[10px] text-white/30 hover:text-white/60 px-1.5 py-0.5 rounded hover:bg-white/5">+note</button>
                <button onClick={e => { e.stopPropagation(); router.push(`/clients/${client.id}`); }} className="text-[10px] text-white/30 hover:text-white/60 px-1.5 py-0.5 rounded hover:bg-white/5 ml-auto">view</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
