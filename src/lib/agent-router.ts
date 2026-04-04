export type AgentMode = 'api' | 'openclaw';

export interface TaskRouteConfig {
  mode: AgentMode;
  model: string;
  reason: string;
}

export function routeTask(task: {
  requiresTools?: boolean;
  requiresFileAccess?: boolean;
  requiresWebSearch?: boolean;
  requiresMultiAgent?: boolean;
  forceMode?: AgentMode;
}): TaskRouteConfig {
  // Honor explicit override
  if (task.forceMode === 'api') {
    return {
      mode: 'api',
      model: 'claude-sonnet-4-20250514',
      reason: 'Forced API mode by user',
    };
  }
  if (task.forceMode === 'openclaw') {
    return {
      mode: 'openclaw',
      model: 'anthropic/claude-sonnet-4-20250514',
      reason: 'Forced OpenClaw mode by user',
    };
  }

  // Auto-route based on task requirements
  const needsOpenClaw =
    task.requiresTools ||
    task.requiresFileAccess ||
    task.requiresWebSearch ||
    task.requiresMultiAgent;

  if (needsOpenClaw) {
    return {
      mode: 'openclaw',
      model: 'anthropic/claude-sonnet-4-20250514',
      reason: 'Task requires tool access or multi-agent coordination',
    };
  }

  return {
    mode: 'api',
    model: 'claude-sonnet-4-20250514',
    reason: 'Text generation task — no tools needed',
  };
}
