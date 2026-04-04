'use client';

import { useState, useEffect } from 'react';
import AgentCard from '@/components/AgentCard';
import type { Agent } from '@/lib/agents';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [openclawAvailable, setOpenclawAvailable] = useState(false);

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => { setAgents(data); setLoading(false); });

    fetch('/api/agents/openclaw-status')
      .then(r => r.json())
      .then(d => setOpenclawAvailable(d.available))
      .catch(() => setOpenclawAvailable(false));

    const interval = setInterval(() => {
      fetch('/api/agents').then(r => r.json()).then(setAgents);
      fetch('/api/agents/openclaw-status').then(r => r.json()).then(d => setOpenclawAvailable(d.available)).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/30 text-sm">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light tracking-wide text-white/90">Agent Roster</h1>
          <p className="text-sm text-white/40 mt-1">
            {agents.filter(a => a.status === 'working').length} of {agents.length} agents active
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="glass-subtle px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-white/40">API Mode</span>
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-emerald-400">Available</span>
          </div>
          <div className="glass-subtle px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-white/40">OpenClaw</span>
            <div className={`w-2 h-2 rounded-full ${openclawAvailable ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className={`text-xs ${openclawAvailable ? 'text-emerald-400' : 'text-red-400'}`}>
              {openclawAvailable ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
