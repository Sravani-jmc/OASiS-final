import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// GET /api/projects - Get all projects for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const isAdmin = session.user.isAdmin || false;
    
    // Get all projects - for all users, not just members
    // This ensures all users can view projects
    const projects = await prisma.project.findMany({
      // No filtering by user membership - allows all users to see all projects
      include: {
        manager: {
          select: {
            id: true,
            username: true,
            fullName: true,
          }
        },
        team: {
          select: {
            id: true,
            name: true,
          }
        },
        members: {
          select: {
            id: true,
            username: true,
            fullName: true,
          }
        },
        tasks: {
          select: {
            id: true,
            status: true,
          }
        }
      }
    });
    
    // Format the response
    const formattedProjects = projects.map((project) => {
      // Map database status to frontend status
      let status = project.status;
      switch (project.status) {
        case 'planning':
          status = 'notStarted';
          break;
        case 'active':
          status = 'inProgress';
          break;
        case 'paused':
          status = 'onHold';
          break;
        case 'completed':
          status = 'completed';
          break;
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: status,
        priority: project.priority,
        progress: calculateProgress(project.tasks),
        startDate: project.startDate.toISOString(),
        endDate: project.endDate ? project.endDate.toISOString() : null,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        managerId: project.managerId,
        teamId: project.teamId,
        manager: project.manager,
        team: project.team,
        members: project.members,
        tasks: project.tasks,
        isUserMember: project.members.some(m => m.id === userId) || project.managerId === userId
      };
    });
    
    return NextResponse.json(formattedProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// Helper function to calculate project progress based on tasks
function calculateProgress(tasks: { id: string; status: string; priority?: string }[]): number {
  if (!tasks || tasks.length === 0) return 0;
  
  // Assign weights based on priority
  const getTaskWeight = (priority?: string) => {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  };

  // Map task statuses to progress values
  const getTaskProgress = (status: string): number => {
    switch (status) {
      case 'completed': return 100;
      case 'inProgress': return 50;
      case 'todo': return 0;
      default: return 0;
    }
  };
  
  const totalWeight = tasks.reduce((sum, task) => sum + getTaskWeight(task.priority), 0);
  const weightedProgress = tasks.reduce((sum, task) => {
    const progress = getTaskProgress(task.status);
    return sum + (progress * getTaskWeight(task.priority));
  }, 0);
  
  return Math.round(weightedProgress / totalWeight);
}

// POST /api/projects - Create a new project
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is an admin
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Only administrators can create projects' }, { status: 403 });
    }
    
    const userId = session.user.id;
    const body = await req.json();
    
    // Validate request body
    const projectSchema = z.object({
      name: z.string().min(1, 'Project name is required'),
      description: z.string().optional().nullable(),
      status: z.enum(['notStarted', 'inProgress', 'completed', 'onHold']).default('notStarted'),
      priority: z.enum(['low', 'medium', 'high']).default('medium'),
      startDate: z.string().transform(str => new Date(str)),
      endDate: z.string().optional().nullable().transform(str => str ? new Date(str) : null),
      teamId: z.string().nullable().optional(),
      memberIds: z.array(z.string()).optional(),
    });
    
    const validatedData = projectSchema.parse(body);

    // Map frontend status to database status
    const dbStatus = (() => {
      switch (validatedData.status) {
        case 'notStarted': return 'planning';
        case 'inProgress': return 'active';
        case 'onHold': return 'paused';
        case 'completed': return 'completed';
        default: return 'planning';
      }
    })();
    
    // Create the project with transaction to ensure all operations succeed or fail together
    const project = await prisma.$transaction(async (tx) => {
      // Create the project
      const newProject = await tx.project.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          status: dbStatus,
          priority: validatedData.priority,
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          managerId: userId,
          teamId: validatedData.teamId || null,
        },
      });
      
      // Add members if provided
      if (validatedData.memberIds && validatedData.memberIds.length > 0) {
        // Verify that all the members exist
        const validMemberIds = await tx.user.findMany({
          where: {
            id: {
              in: validatedData.memberIds
            }
          },
          select: {
            id: true
          }
        });
        
        const validIds = validMemberIds.map(user => user.id);
        
        if (validIds.length > 0) {
          await tx.project.update({
            where: { id: newProject.id },
            data: {
              members: {
                connect: validIds.map(id => ({ id })),
              },
            },
          });
        }
      }
      
      // Add the manager as a member if not already included
      if (!validatedData.memberIds?.includes(userId)) {
        await tx.project.update({
          where: { id: newProject.id },
          data: {
            members: {
              connect: { id: userId },
            },
          },
        });
      }
      
      // Log activity directly instead of using createActivityLog
      const now = new Date();
      const timeString = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      
      await tx.dailyLog.create({
        data: {
          date: now,
          startTime: timeString,
          endTime: timeString,
          description: `プロジェクト「${newProject.name}」を作成しました`,
          category: 'development',
          completed: true,
          userId: userId,
        }
      });
      
      return newProject;
    }).catch(error => {
      console.error('Transaction failed in project creation:', error);
      throw error;
    });
    
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'A project with this name already exists' }, { status: 409 });
      }
      if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Referenced record does not exist' }, { status: 400 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
} 