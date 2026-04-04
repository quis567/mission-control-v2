import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        activities: false,
      },
    });

    // Join agent name manually for backward compat with frontend
    const agents = await prisma.agent.findMany();
    const agentMap = Object.fromEntries(agents.map(a => [a.id, a.name]));

    const tasksWithAgent = tasks.map(t => ({
      ...t,
      agent_name: t.assignedAgentId ? agentMap[t.assignedAgentId] || null : null,
      // Map camelCase to snake_case for frontend compatibility
      assigned_agent_id: t.assignedAgentId,
      workflow_template_id: t.workflowTemplateId,
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt.toISOString(),
      due_date: t.dueDate?.toISOString() || null,
      workspace_id: t.workspaceId,
      session_key: t.sessionKey,
      parent_task_id: t.parentTaskId,
    }));

    return NextResponse.json(tasksWithAgent);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description || null,
        priority: body.priority || 'normal',
        assignedAgentId: body.assigned_agent_id || null,
        workflowTemplateId: body.workflow_template_id || null,
        status: body.assigned_agent_id ? 'assigned' : 'inbox',
      },
    });

    return NextResponse.json({ id: task.id, ...body }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
