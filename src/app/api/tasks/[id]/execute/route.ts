import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { executeAgent } from '@/lib/agent-client';
import { pollSessionUntilComplete } from '@/lib/openclaw';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.assignedAgentId) {
      return NextResponse.json({ error: 'No agent assigned to this task' }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({ where: { id: task.assignedAgentId } });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Update statuses
    await prisma.task.update({ where: { id }, data: { status: 'in_progress' } });
    await prisma.agent.update({ where: { id: agent.id }, data: { status: 'working' } });

    await prisma.activity.create({
      data: {
        taskId: id,
        agentId: agent.id,
        activityType: 'status_change',
        content: `${agent.name} started working on this task`,
      },
    });

    // Execute via unified agent client
    const result = await executeAgent({
      task: `${task.title}\n\n${task.description || ''}`,
      agentSoulMd: agent.soulMd || '',
      forceMode: body.mode || undefined,
      requiresTools: body.requiresTools || false,
      requiresFileAccess: body.requiresFileAccess || false,
      requiresWebSearch: body.requiresWebSearch || false,
      requiresMultiAgent: body.requiresMultiAgent || false,
    });

    await prisma.activity.create({
      data: {
        taskId: id,
        agentId: agent.id,
        activityType: 'note',
        content: `Execution mode: ${result.mode}${result.sessionId ? ` | Session: ${result.sessionId}` : ''}`,
      },
    });

    if (result.status === 'complete') {
      // API mode — result is immediate
      await prisma.task.update({
        where: { id },
        data: {
          status: 'done',
          deliverables: JSON.stringify([result.result]),
        },
      });
      await prisma.agent.update({ where: { id: agent.id }, data: { status: 'standby' } });

      await prisma.activity.create({
        data: {
          taskId: id,
          agentId: agent.id,
          activityType: 'status_change',
          content: 'Task completed successfully',
        },
      });
      await prisma.activity.create({
        data: {
          taskId: id,
          agentId: agent.id,
          activityType: 'deliverable',
          content: result.result,
        },
      });

      return NextResponse.json({
        message: 'Task completed',
        mode: result.mode,
        taskId: id,
        agentId: agent.id,
      });
    } else if (result.status === 'in_progress' && result.sessionId) {
      // OpenClaw mode — poll in background
      await prisma.task.update({ where: { id }, data: { sessionKey: result.sessionId } });

      pollSessionUntilComplete(result.sessionId, async (status) => {
        if (status.status === 'completed') {
          await prisma.task.update({
            where: { id },
            data: {
              status: 'done',
              deliverables: JSON.stringify(status.output ? [status.output] : []),
            },
          });
          await prisma.agent.update({ where: { id: agent.id }, data: { status: 'standby' } });
          await prisma.activity.create({
            data: { taskId: id, agentId: agent.id, activityType: 'status_change', content: 'Task completed successfully' },
          });
          if (status.output) {
            await prisma.activity.create({
              data: { taskId: id, agentId: agent.id, activityType: 'deliverable', content: status.output },
            });
          }
        } else if (status.status === 'failed' || status.status === 'timeout') {
          await prisma.task.update({ where: { id }, data: { status: 'failed' } });
          await prisma.agent.update({ where: { id: agent.id }, data: { status: 'standby' } });
          await prisma.activity.create({
            data: { taskId: id, agentId: agent.id, activityType: 'error', content: `Agent session ${status.status}: ${status.error || 'Unknown error'}` },
          });
        }
      }).catch(async (err) => {
        await prisma.task.update({ where: { id }, data: { status: 'failed' } });
        await prisma.agent.update({ where: { id: agent.id }, data: { status: 'standby' } });
        await prisma.activity.create({
          data: { taskId: id, agentId: agent.id, activityType: 'error', content: `Polling error: ${String(err)}` },
        });
      });

      return NextResponse.json({
        message: 'Agent execution started',
        mode: result.mode,
        sessionId: result.sessionId,
        taskId: id,
        agentId: agent.id,
      });
    } else {
      // Failed
      await prisma.task.update({ where: { id }, data: { status: 'failed' } });
      await prisma.agent.update({ where: { id: agent.id }, data: { status: 'standby' } });
      await prisma.activity.create({
        data: { taskId: id, agentId: agent.id, activityType: 'error', content: result.error || 'Execution failed' },
      });

      return NextResponse.json({ error: result.error || 'Execution failed', mode: result.mode }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
