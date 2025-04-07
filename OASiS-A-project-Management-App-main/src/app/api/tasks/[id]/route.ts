import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { createActivityLogHelper as createActivityLog } from '@/lib/activityLogger';
import { Prisma } from '@prisma/client';

// GET /api/tasks/[id] - Get a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: {
        id: params.id,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

// PATCH /api/tasks/[id] - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: {
        id: params.id,
      },
      include: {
        project: true
      }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Calculate progress based on status
    let taskProgress = data.progress;
    if (data.status) {
      switch (data.status) {
        case 'todo':
          taskProgress = 0;
          break;
        case 'in_progress':
          // If no progress specified, set to 50% for in_progress
          taskProgress = data.progress || 50;
          break;
        case 'completed':
          taskProgress = 100;
          break;
        case 'review':
          // If no progress specified, set to 75% for review
          taskProgress = data.progress || 75;
          break;
      }
    }

    // Update the task
    const updatedTask = await prisma.task.update({
      where: {
        id: params.id,
      },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
        ...(data.status && { status: data.status }),
        ...(data.priority && { priority: data.priority }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.projectId !== undefined && { projectId: data.projectId }),
        ...(data.status === 'completed' && { completedAt: new Date() }),
        ...(data.status === 'todo' && { completedAt: null })
      },
      include: {
        project: true
      }
    });

    // Update task progress using raw SQL
    if (taskProgress !== undefined) {
      await prisma.$executeRaw`UPDATE tasks SET progress = ${taskProgress} WHERE id = ${params.id}`;
    }

    // Update project progress after task update
    if (updatedTask.projectId) {
      const projectTasks = await prisma.task.findMany({
        where: {
          projectId: updatedTask.projectId
        }
      });

      const getTaskWeight = (priority: string) => {
        switch (priority) {
          case 'high': return 3;
          case 'medium': return 2;
          case 'low': return 1;
          default: return 1;
        }
      };

      const totalWeight = projectTasks.reduce((sum, task) => sum + getTaskWeight(task.priority), 0);
      const completedWeight = projectTasks
        .filter(task => task.status === 'completed')
        .reduce((sum, task) => sum + getTaskWeight(task.priority), 0);

      const projectProgress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

      // Update project progress using raw SQL
      await prisma.$executeRaw`
        UPDATE projects 
        SET progress = ${projectProgress},
            status = CASE 
              WHEN ${projectProgress} = 100 THEN 'completed'
              WHEN ${projectProgress} > 0 THEN 'active'
              ELSE 'planning'
            END
        WHERE id = ${updatedTask.projectId}
      `;
    }

    // Create activity log for task update
    const actionType = data.status === 'completed' ? 'task_complete' : 'task_update';
    await createActivityLog(
      session.user.id,
      actionType,
      'task',
      { 
        title: updatedTask.title, 
        projectName: updatedTask.project?.name,
        status: data.status,
        progress: taskProgress 
      }
    );

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: {
        id: params.id,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Delete the task
    await prisma.task.delete({
      where: {
        id: params.id,
      },
    });

    // Update project progress after task deletion
    if (existingTask.projectId) {
      const projectTasks = await prisma.task.findMany({
        where: {
          projectId: existingTask.projectId
        }
      });

      // Calculate weighted project progress
      const getTaskWeight = (priority: string) => {
        switch (priority) {
          case 'high': return 3;
          case 'medium': return 2;
          case 'low': return 1;
          default: return 1;
        }
      };

      const totalWeight = projectTasks.reduce((sum, task) => sum + getTaskWeight(task.priority), 0);
      const completedWeight = projectTasks
        .filter(task => task.status === 'completed')
        .reduce((sum, task) => sum + getTaskWeight(task.priority), 0);

      const projectProgress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

      // Update project progress
      await prisma.project.update({
        where: {
          id: existingTask.projectId
        },
        data: {
          progress: projectProgress,
          status: projectProgress === 100 ? 'completed' : 
                 projectProgress > 0 ? 'active' : 'planning'
        } as any
      });
    }

    // Create activity log for task deletion
    await createActivityLog(
      session.user.id,
      'task_delete',
      'task',
      { 
        title: existingTask.title,
        projectName: existingTask.project?.name
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
} 