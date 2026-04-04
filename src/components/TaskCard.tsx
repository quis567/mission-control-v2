'use client';

import Link from 'next/link';
import type { Task } from '@/lib/agents';
import { STATUS_COLORS, PRIORITY_LABELS, AGENT_ICON_COLORS } from '@/lib/agents';

interface TaskCardProps {
  task: Task;
  onExecute?: (taskId: string) => void;
}

export default function TaskCard({ task, onExecute }: TaskCardProps) {
  const statusColor = STATUS_COLORS[task.status] || 'text-white/50';
  const agentColor = task.assigned_agent_id ? AGENT_ICON_COLORS[task.assigned_agent_id] || '#06b6d4' : undefined;

  const borderColor = {
    inbox: 'border-t-white/20',
    assigned: 'border-t-sky-400/50',
    in_progress: 'border-t-cyan-400/50',
    review: 'border-t-amber-400/50',
    done: 'border-t-emerald-400/50',
    failed: 'border-t-red-400/50',
  }[task.status] || 'border-t-white/20';

  return (
    <div className={`glass p-4 hover:bg-white/15 transition-all duration-200 border-t-2 ${borderColor} group`}>
      <Link href={`/tasks/${task.id}`} className="block">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-medium text-white/90 leading-tight flex-1 mr-2">
            {task.title}
          </h3>
          {task.priority === 'high' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-400/20 text-red-300 shrink-0">
              {PRIORITY_LABELS[task.priority]}
            </span>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-white/40 line-clamp-2 mb-3">{task.description}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.agent_name && (
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${task.status === 'in_progress' ? 'pulse-working' : ''}`}
                  style={{ backgroundColor: agentColor, color: agentColor }}
                />
                <span className="text-xs text-white/50">{task.agent_name}</span>
              </div>
            )}
          </div>
          <span className={`text-xs ${statusColor}`}>
            {task.status.replace('_', ' ')}
          </span>
        </div>
      </Link>

      {(task.status === 'assigned' || task.status === 'inbox') && task.assigned_agent_id && onExecute && (
        <button
          onClick={(e) => { e.preventDefault(); onExecute(task.id); }}
          className="mt-3 w-full py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs hover:bg-accent/20 transition-all duration-200 opacity-0 group-hover:opacity-100"
        >
          Execute
        </button>
      )}
    </div>
  );
}
