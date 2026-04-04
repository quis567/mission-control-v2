'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CreateTaskModal from '@/components/CreateTaskModal';
import type { Task, Agent } from '@/lib/agents';
import { STATUS_COLORS, AGENT_ICON_COLORS } from '@/lib/agents';

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const [tasksRes, agentsRes] = await Promise.all([
      fetch('/api/tasks'),
      fetch('/api/agents'),
    ]);
    setTasks(await tasksRes.json());
    setAgents(await agentsRes.json());
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const activeTasks = tasks.filter(t => ['assigned', 'in_progress', 'review'].includes(t.status));
  const recentDone = tasks.filter(t => t.status === 'done').slice(0, 5);
  const workingAgents = agents.filter(a => a.status === 'working');

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light tracking-wide text-white/90">Mission Control</h1>
          <p className="text-sm text-white/40 mt-1">TruePath Studios Operations</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200 glow-accent"
        >
          + New Task
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Tasks" value={activeTasks.length} color="text-accent" />
        <StatCard label="In Progress" value={tasks.filter(t => t.status === 'in_progress').length} color="text-cyan-400" />
        <StatCard label="Completed" value={tasks.filter(t => t.status === 'done').length} color="text-emerald-400" />
        <StatCard label="Agents Working" value={workingAgents.length} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Active Tasks */}
        <div className="col-span-2">
          <h2 className="text-sm uppercase tracking-wider text-white/40 mb-4">Active Tasks</h2>
          {activeTasks.length === 0 ? (
            <div className="glass p-8 text-center">
              <p className="text-white/30 text-sm">No active tasks</p>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-3 text-accent text-sm hover:text-accent/80 transition-colors"
              >
                Create your first task
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTasks.map(task => (
                <Link key={task.id} href={`/tasks/${task.id}`}>
                  <div className="glass p-4 hover:bg-white/15 transition-all duration-200 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {task.assigned_agent_id && (
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${task.status === 'in_progress' ? 'pulse-working' : ''}`}
                            style={{
                              backgroundColor: AGENT_ICON_COLORS[task.assigned_agent_id] || '#38bdf8',
                              color: AGENT_ICON_COLORS[task.assigned_agent_id] || '#38bdf8',
                            }}
                          />
                        )}
                        <div>
                          <h3 className="text-sm text-white/90">{task.title}</h3>
                          {task.agent_name && (
                            <p className="text-xs text-white/40 mt-0.5">{task.agent_name}</p>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs ${STATUS_COLORS[task.status]}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Agent Status */}
        <div>
          <h2 className="text-sm uppercase tracking-wider text-white/40 mb-4">Agents</h2>
          <div className="space-y-2">
            {agents.map(agent => {
              const color = AGENT_ICON_COLORS[agent.id] || '#38bdf8';
              const isWorking = agent.status === 'working';
              return (
                <Link key={agent.id} href="/agents">
                  <div className="glass-subtle p-3 hover:bg-white/10 transition-all duration-200 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <span className="text-xs font-medium" style={{ color }}>
                          {agent.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/80 truncate">{agent.name}</p>
                        <p className="text-xs text-white/30">{agent.role}</p>
                      </div>
                      <div
                        className={`w-2 h-2 rounded-full ${isWorking ? 'pulse-working' : 'opacity-30'}`}
                        style={{ backgroundColor: isWorking ? '#4ade80' : '#fff' }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {recentDone.length > 0 && (
            <>
              <h2 className="text-sm uppercase tracking-wider text-white/40 mb-4 mt-8">Recently Done</h2>
              <div className="space-y-2">
                {recentDone.map(task => (
                  <Link key={task.id} href={`/tasks/${task.id}`}>
                    <div className="glass-subtle p-3 hover:bg-white/10 transition-all duration-200 cursor-pointer">
                      <p className="text-xs text-white/60 truncate">{task.title}</p>
                      <p className="text-xs text-emerald-400/50 mt-1">Completed</p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <CreateTaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchData}
      />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass p-5">
      <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-light mt-2 ${color}`}>{value}</p>
    </div>
  );
}
