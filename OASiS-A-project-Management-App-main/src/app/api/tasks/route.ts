import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { createActivityLogHelper as createActivityLog } from '@/lib/activityLogger';
import { Prisma } from '@prisma/client';

// GET /api/tasks - Get all tasks
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const assigneeId = searchParams.get('assigneeId');
    const status = searchParams.get('status');

    // Build the where clause based on query parameters
    const where: any = {};
    
    if (projectId) {
      where.projectId = projectId;
    }
    
    if (assigneeId) {
      where.assigneeId = assigneeId;
    }
    
    if (status) {
      where.status = status;
    }

    // Get all tasks without filtering by user permissions
    // This allows all users to view all tasks
    const tasks = await prisma.task.findMany({
      where,
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
          take: 5,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    console.log('Received task data:', data);
    
    // Validate request body
    const taskSchema = z.object({
      title: z.string().min(1, 'Task title is required'),
      description: z.string().optional().nullable(),
      status: z.string().default('todo'),
      priority: z.string().default('medium'),
      progress: z.number().min(0).max(100).default(0),
      dueDate: z.string().optional().nullable().transform(str => str ? new Date(str) : null),
      projectId: z.string().min(1, 'Project ID is required'),
      assigneeId: z.string().optional().nullable(),
      assigneeIds: z.array(z.string()).optional(),
    });
    
    const validatedData = taskSchema.parse(data);
    console.log('Validated task data:', validatedData);

    // Set initial progress based on status
    let progress = validatedData.progress;
    if (validatedData.status === 'completed') {
      progress = 100;
    } else if (validatedData.status === 'in_progress') {
      progress = progress || 50;
    } else if (validatedData.status === 'review') {
      progress = progress || 75;
    } else if (validatedData.status === 'todo') {
      progress = 0;
    }
    
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: validatedData.projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Use assigneeIds if provided, otherwise use assigneeId
    const assigneeIds = validatedData.assigneeIds || 
      (validatedData.assigneeId ? [validatedData.assigneeId] : []);

    // Create task data
    const taskData: any = {
      title: validatedData.title,
      description: validatedData.description || null,
      status: validatedData.status,
      priority: validatedData.priority,
      dueDate: validatedData.dueDate,
      project: {
        connect: { id: validatedData.projectId }
      }
    };

    // Add primary assignee if available
    if (validatedData.assigneeId) {
      taskData.assignee = {
        connect: { id: validatedData.assigneeId }
      };
    }

    // Create the task with initial data
    const task = await prisma.task.create({
      data: taskData,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Store the additional assignees in a custom field or related table
    // This is a simple implementation assuming you have a way to store this data
    if (assigneeIds.length > 1) {
      // Store additional assignees (beyond the primary one)
      // You may need to create a custom field or table for this
      console.log(`Task ${task.id} has multiple assignees:`, assigneeIds);
      
      // Example: You could store this in task metadata or a separate table
      // This is just logging for now, but you would implement your storage method here
    }

    // Update task progress using raw SQL
    await prisma.$executeRaw`UPDATE tasks SET progress = ${progress} WHERE id = ${task.id}`;

    // Update project progress after creating task
    if (task.projectId) {
      const projectTasks = await prisma.task.findMany({
        where: {
          projectId: task.projectId
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
        WHERE id = ${task.projectId}
      `;
    }
    
    try {
      await createActivityLog(
        session.user.id,
        'task_create',
        'task',
        { 
          title: task.title,
          projectName: project.name,
          status: task.status,
          progress: progress
        }
      );
    } catch (logError) {
      console.error('Error creating activity log:', logError);
      // Don't fail the task creation if activity log fails
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: error.errors[0].message,
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 