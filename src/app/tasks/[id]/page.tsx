'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Task, Activity } from '@/lib/agents';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, AGENT_ICON_COLORS } from '@/lib/agents';
import DeliverableViewer from '@/components/DeliverableViewer';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`);
      if (!res.ok) return;
      const data = await res.json();
      setTask(data.task);
      setActivities(data.activities);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleExecute = async () => {
    setExecuting(true);
    try {
      await fetch(`/api/tasks/${taskId}/execute`, { method: 'POST' });
      fetchStatus();
    } finally {
      setExecuting(false);
    }
  };

  if (loading || !task) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/30 text-sm">Loading...</div>
      </div>
    );
  }

  const agentColor = task.assigned_agent_id ? AGENT_ICON_COLORS[task.assigned_agent_id] || '#06b6d4' : '#06b6d4';
  const statusColor = STATUS_COLORS[task.status] || 'text-white/50';
  const canExecute = (task.status === 'assigned' || task.status === 'inbox') && task.assigned_agent_id;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => router.back()}
        className="text-white/40 text-sm hover:text-white/60 transition-colors mb-6 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      {/* Task Header */}
      <div className="glass p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-light tracking-wide text-white/90 mb-2">{task.title}</h1>
            <div className="flex items-center gap-4">
              <span className={`text-xs px-2 py-1 rounded-lg bg-white/5 ${statusColor}`}>
                {STATUS_LABELS[task.status]}
              </span>
              <span className="text-xs text-white/30">
                Priority: {PRIORITY_LABELS[task.priority]}
              </span>
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
          </div>

          {canExecute && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200 disabled:opacity-40"
            >
              {executing ? 'Starting...' : 'Execute Agent'}
            </button>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-white/60 leading-relaxed mt-4 border-t border-white/10 pt-4">
            {task.description}
          </p>
        )}

        {task.session_key && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-xs text-white/30">
              Session: <span className="font-mono text-white/50">{task.session_key}</span>
            </p>
          </div>
        )}
      </div>

      {/* Deliverables */}
      <div className="glass p-6 mb-6">
        <h2 className="text-sm uppercase tracking-wider text-white/40 mb-4">Deliverable</h2>
        <DeliverableViewer content={task.deliverables} />
      </div>

      {/* Activity Log */}
      <div className="glass p-6">
        <h2 className="text-sm uppercase tracking-wider text-white/40 mb-4">Activity Log</h2>
        {activities.length === 0 ? (
          <p className="text-xs text-white/25">No activity yet</p>
        ) : (
          <div className="space-y-3">
            {activities.map(activity => (
              <div key={activity.id} className="glass-subtle p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs ${
                    activity.activity_type === 'error' ? 'text-red-400' :
                    activity.activity_type === 'deliverable' ? 'text-emerald-400' :
                    activity.activity_type === 'status_change' ? 'text-sky-400' :
                    'text-white/40'
                  }`}>
                    {activity.activity_type.replace('_', ' ')}
                  </span>
                  {activity.agent_name && (
                    <span className="text-xs text-white/30">by {activity.agent_name}</span>
                  )}
                  <span className="text-xs text-white/20 ml-auto">
                    {new Date(activity.created_at).toLocaleString()}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${
                  activity.activity_type === 'deliverable' ? 'font-mono text-white/70 whitespace-pre-wrap' : 'text-white/50'
                }`}>
                  {activity.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
