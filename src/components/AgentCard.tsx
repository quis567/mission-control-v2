'use client';

import type { Agent } from '@/lib/agents';
import { AGENT_ICON_COLORS } from '@/lib/agents';

interface AgentCardProps {
  agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
  const color = AGENT_ICON_COLORS[agent.id] || '#06b6d4';
  const isWorking = agent.status === 'working';

  return (
    <div className="glass p-5 hover:bg-white/15 transition-all duration-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <span className="text-lg font-light" style={{ color }}>{agent.name.charAt(0)}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-white/90">{agent.name}</h3>
          <p className="text-xs text-white/40">{agent.role}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${isWorking ? 'pulse-working' : 'opacity-40'}`}
            style={{ backgroundColor: isWorking ? '#4ade80' : '#ffffff' }}
          />
          <span className={`text-xs ${isWorking ? 'text-emerald-400' : 'text-white/30'}`}>
            {isWorking ? 'Working' : 'Standby'}
          </span>
        </div>
      </div>
      <p className="text-xs text-white/50 leading-relaxed">{agent.description}</p>
      <div className="mt-3 text-xs text-white/30">
        Model: {agent.model.split('/').pop()}
      </div>
    </div>
  );
}
