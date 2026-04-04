const OPENCLAW_BASE_URL = process.env.OPENCLAW_URL || 'http://localhost:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || 'C:\\Users\\atlas\\.openclaw\\workspace';

interface SpawnOptions {
  task: string;
  model?: string;
  cwd?: string;
  timeoutSeconds?: number;
}

interface SpawnResponse {
  sessionId: string;
  status: string;
}

interface SessionStatus {
  sessionId: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  output?: string;
  error?: string;
}

export async function spawnAgent(options: SpawnOptions): Promise<SpawnResponse> {
  const { task, model = 'anthropic/claude-haiku-4-5', cwd = WORKSPACE_DIR, timeoutSeconds = 1800 } = options;

  const response = await fetch(`${OPENCLAW_BASE_URL}/api/sessions/spawn`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      runtime: 'subagent',
      mode: 'run',
      task,
      model,
      cwd,
      runTimeoutSeconds: timeoutSeconds,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenClaw spawn failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function getSessionStatus(sessionId: string): Promise<SessionStatus> {
  const response = await fetch(`${OPENCLAW_BASE_URL}/api/sessions/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get session status (${response.status})`);
  }

  return response.json();
}

export async function pollSessionUntilComplete(
  sessionId: string,
  onUpdate?: (status: SessionStatus) => void,
  pollIntervalMs = 5000,
  maxPollTime = 1800000
): Promise<SessionStatus> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxPollTime) {
    const status = await getSessionStatus(sessionId);

    if (onUpdate) {
      onUpdate(status);
    }

    if (status.status === 'completed' || status.status === 'failed' || status.status === 'timeout') {
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  return {
    sessionId,
    status: 'timeout',
    error: 'Polling timed out',
  };
}

export function buildAgentPrompt(agentSoulMd: string, taskDescription: string, context?: string): string {
  let prompt = `${agentSoulMd}\n\n---\n\nTASK:\n${taskDescription}`;

  if (context) {
    prompt += `\n\nCONTEXT:\n${context}`;
  }

  prompt += `\n\nIMPORTANT: When you complete the task, provide a clear summary of what you accomplished and list any deliverables or files created.`;

  return prompt;
}
