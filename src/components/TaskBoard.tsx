'use client';

import { useState, useEffect, useCallback } from 'react';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import AgentCard from './AgentCard';
import type { Task, Agent } from '@/lib/agents';
import { AGENT_ICON_COLORS } from '@/lib/agents';
import { PageLoader } from '@/components/Spinner';

const COLUMNS = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAgents, setShowAgents] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, agentsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/agents'),
      ]);
      setTasks(await tasksRes.json());
      setAgents(await agentsRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleExecute = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}/execute`, { method: 'POST' });
    fetchData();
  };

  if (loading) {
    return <PageLoader />;
  }

  const workingAgents = agents.filter(a => a.status === 'working');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light tracking-wide text-white/90">Tasks & Agents</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200"
        >
          + New Task
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-4">
        {COLUMNS.map(col => {
          const columnTasks = tasks.filter(t => t.status === col.key);
          return (
            <div key={col.key} className="glass-subtle p-3 min-h-[60vh]">
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-xs uppercase tracking-wider text-white/40 font-medium">
                  {col.label}
                </h2>
                <span className="text-xs text-white/25 bg-white/5 px-1.5 py-0.5 rounded">
                  {columnTasks.length}
                </span>
              </div>
              <div className="space-y-3">
                {columnTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onExecute={handleExecute}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent Roster */}
      <div className="mt-8">
        <button
          onClick={() => setShowAgents(!showAgents)}
          className="flex items-center gap-2 mb-4 group"
        >
          <svg className={`w-4 h-4 text-white/30 transition-transform ${showAgents ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <h2 className="text-sm uppercase tracking-wider text-white/40">Agent Roster</h2>
          <span className="text-xs text-white/25">
            {workingAgents.length} of {agents.length} active
          </span>
        </button>
        {showAgents && (
          <div className="grid grid-cols-2 gap-4">
            {agents.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>

      <CreateTaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchData}
      />
    </div>
  );
}
