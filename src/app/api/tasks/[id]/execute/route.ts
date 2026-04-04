import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { executeAgent } from '@/lib/agent-client';
import { pollSessionUntilComplete } from '@/lib/openclaw';

async function autoProgressWorkflow(taskId: string, agentId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || !task.workflowTemplateId) return;

  const workflow = await prisma.workflowTemplate.findUnique({ where: { id: task.workflowTemplateId } });
  if (!workflow) return;

  const stages: string[] = JSON.parse(workflow.stages);
  // Find current stage index based on task status mapping
  const statusToStage: Record<string, string[]> = {
    'in_progress': ['Research', 'Planning', 'Design', 'Document', 'Pitch Creation'],
    'review': ['Review'],
    'done': ['Done', 'Delivered', 'Published', 'Added to CRM'],
  };

  // Determine the next stage after the agent's work
  const currentIndex = stages.findIndex(s =>
    statusToStage['in_progress']?.some(m => s.toLowerCase().includes(m.toLowerCase()))
  );

  if (currentIndex === -1) return;

  const nextStage = stages[currentIndex + 1];
  if (!nextStage) return;

  // Check if next stage is a review stage
  const isReviewStage = nextStage.toLowerCase().includes('review');

  if (isReviewStage) {
    // Auto-assign to quality reviewer and move to review status
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'review', assignedAgentId: 'quality-reviewer' },
    });
    await prisma.activity.create({
      data: {
        taskId,
        agentId,
        activityType: 'status_change',
        content: `Auto-progressed to Review stage — assigned to Quality Reviewer`,
      },
    });
  } else {
    // Final stage — mark as done
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'done' },
    });
    await prisma.activity.create({
      data: {
        taskId,
        agentId,
        activityType: 'status_change',
        content: `Workflow complete — marked as done`,
      },
    });
  }
}

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

      // Auto-progress through workflow stages
      await autoProgressWorkflow(id, agent.id);

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
          // Auto-progress through workflow stages
          await autoProgressWorkflow(id, agent.id);
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
