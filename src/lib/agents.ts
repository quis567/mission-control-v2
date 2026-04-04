// Agent type definitions
export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  soul_md: string;
  model: string;
  status: 'standby' | 'working';
  workspace_id?: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'inbox' | 'assigned' | 'in_progress' | 'review' | 'done' | 'failed';
  priority: 'low' | 'normal' | 'high';
  assigned_agent_id?: string;
  agent_name?: string;
  workflow_template_id?: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  workspace_id?: string;
  deliverables: string;
  session_key?: string;
  parent_task_id?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  stages: string; // JSON array
}

export interface Activity {
  id: string;
  task_id: string;
  agent_id?: string;
  agent_name?: string;
  activity_type: 'status_change' | 'note' | 'deliverable' | 'error';
  content: string;
  created_at: string;
}

// Status display helpers
export const STATUS_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
  failed: 'Failed',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

export const STATUS_COLORS: Record<string, string> = {
  inbox: 'text-white/50',
  assigned: 'text-sky-400',
  in_progress: 'text-cyan-400',
  review: 'text-amber-400',
  done: 'text-emerald-400',
  failed: 'text-red-400',
};

export const AGENT_ICON_COLORS: Record<string, string> = {
  'ops-manager': '#06b6d4',
  'builder': '#4ade80',
  'marketing-architect': '#fbbf24',
  'quality-reviewer': '#3b82f6',
  'sop-engineer': '#f87171',
  'systems-architect': '#06b6d4',
  'onboarding-specialist': '#fb923c',
};
