'use client';

import { useState, useEffect, useCallback } from 'react';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import type { Task } from '@/lib/agents';

const COLUMNS = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleExecute = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}/execute`, { method: 'POST' });
    fetchTasks();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/30 text-sm">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light tracking-wide text-white/90">Task Board</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-accent/20 border border-accent/30 text-accent text-sm hover:bg-accent/30 transition-all duration-200"
        >
          + New Task
        </button>
      </div>

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

      <CreateTaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchTasks}
      />
    </div>
  );
}
