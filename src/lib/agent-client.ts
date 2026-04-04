import { routeTask, type AgentMode } from './agent-router';

export interface AgentRequest {
  task: string;
  agentSoulMd: string;
  requiresTools?: boolean;
  requiresFileAccess?: boolean;
  requiresWebSearch?: boolean;
  requiresMultiAgent?: boolean;
  forceMode?: AgentMode;
}

export interface AgentResponse {
  mode: 'api' | 'openclaw';
  result: string;
  sessionId?: string;
  status: 'complete' | 'in_progress' | 'failed';
  error?: string;
}

export async function executeAgent(request: AgentRequest): Promise<AgentResponse> {
  const route = routeTask(request);

  if (route.mode === 'api') {
    return executeViaAPI(request, route.model);
  } else {
    return executeViaOpenClaw(request, route.model);
  }
}

async function executeViaAPI(request: AgentRequest, model: string): Promise<AgentResponse> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: request.agentSoulMd,
        messages: [{ role: 'user', content: request.task }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { mode: 'api', result: '', status: 'failed', error: `API error (${response.status}): ${errText}` };
    }

    const data = await response.json();
    const result = data.content
      .map((item: { type: string; text?: string }) => (item.type === 'text' ? item.text : ''))
      .filter(Boolean)
      .join('\n');

    return { mode: 'api', result, status: 'complete' };
  } catch (err) {
    return { mode: 'api', result: '', status: 'failed', error: String(err) };
  }
}

async function executeViaOpenClaw(request: AgentRequest, model: string): Promise<AgentResponse> {
  try {
    const openclawUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';

    const response = await fetch(`${openclawUrl}/api/sessions/spawn`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENCLAW_GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        runtime: 'subagent',
        mode: 'run',
        task: `${request.agentSoulMd}\n\n---\n\nTASK:\n${request.task}`,
        model,
        cwd: process.env.OPENCLAW_WORKSPACE || 'C:\\Users\\atlas\\.openclaw\\workspace',
        runTimeoutSeconds: 1800,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { mode: 'openclaw', result: '', status: 'failed', error: `OpenClaw error (${response.status}): ${errText}` };
    }

    const data = await response.json();

    return {
      mode: 'openclaw',
      result: '',
      sessionId: data.sessionId || data.id,
      status: 'in_progress',
    };
  } catch (err) {
    return { mode: 'openclaw', result: '', status: 'failed', error: String(err) };
  }
}
