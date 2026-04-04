import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const agent = task.assignedAgentId
      ? await prisma.agent.findUnique({ where: { id: task.assignedAgentId } })
      : null;

    const activities = await prisma.activity.findMany({
      where: { taskId: id },
      orderBy: { createdAt: 'desc' },
      include: { agent: { select: { name: true } } },
    });

    return NextResponse.json({
      task: {
        ...task,
        agent_name: agent?.name || null,
        assigned_agent_id: task.assignedAgentId,
        workflow_template_id: task.workflowTemplateId,
        created_at: task.createdAt.toISOString(),
        updated_at: task.updatedAt.toISOString(),
        due_date: task.dueDate?.toISOString() || null,
        workspace_id: task.workspaceId,
        session_key: task.sessionKey,
        parent_task_id: task.parentTaskId,
      },
      activities: activities.map(a => ({
        ...a,
        agent_name: a.agent?.name || null,
        task_id: a.taskId,
        agent_id: a.agentId,
        activity_type: a.activityType,
        created_at: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
