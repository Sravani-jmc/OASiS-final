import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// GET /api/projects/[id] - Get a specific project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    const project = await prisma.project.findUnique({
      where: {
        id: params.id,
      },
      include: {
        manager: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        tasks: {
          include: {
            assignee: {
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
        members: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Calculate progress
    const totalTasks = project.tasks.length;
    let progress = 0;
    
    if (totalTasks > 0) {
      // Assign weights based on priority
      const getTaskWeight = (priority: string) => {
        switch (priority) {
          case 'high': return 3;
          case 'medium': return 2;
          case 'low': return 1;
          default: return 1;
        }
      };
      
      const totalWeight = project.tasks.reduce((sum, task) => sum + getTaskWeight(task.priority), 0);
      const completedWeight = project.tasks
        .filter(task => task.status === 'completed')
        .reduce((sum, task) => sum + getTaskWeight(task.priority), 0);
      
      progress = Math.round((completedWeight / totalWeight) * 100);
    }

    // Add a flag to indicate if the current user is a member or manager of this project
    const isUserMember = project.members.some(m => m.id === userId) || project.managerId === userId;

    return NextResponse.json({
      ...project,
      progress,
      isUserMember,
      // Include this property so the UI can determine write permissions
      canEdit: session.user.isAdmin || project.managerId === userId
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

// PATCH /api/projects/[id] - Update a project
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
    
    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if the user has permission to edit the project
    if (!session.user.isAdmin && existingProject.managerId !== session.user.id) {
      return NextResponse.json({ error: 'You do not have permission to edit this project' }, { status: 403 });
    }

    // Use a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Update the project with validated data
      const updatedProject = await tx.project.update({
        where: { id: params.id },
        data: {
          name: data.name !== undefined ? data.name : undefined,
          description: data.description !== undefined ? data.description : undefined,
          startDate: data.startDate !== undefined ? new Date(data.startDate) : undefined,
          endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
          status: data.status !== undefined ? data.status : undefined,
          priority: data.priority !== undefined ? data.priority : undefined,
          managerId: data.managerId !== undefined ? data.managerId : undefined,
          teamId: data.teamId !== undefined ? data.teamId : undefined,
        },
      });
      
      // Create activity log directly
      const now = new Date();
      const timeString = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      
      await tx.dailyLog.create({
        data: {
          date: now,
          startTime: timeString,
          endTime: timeString,
          description: `プロジェクト「${updatedProject.name}」を更新しました`,
          category: 'development',
          completed: true,
          userId: session.user.id,
        }
      });

      // Update project members if provided
      if (data.memberIds && Array.isArray(data.memberIds)) {
        // First disconnect all existing members
        await tx.project.update({
          where: { id: params.id },
          data: {
            members: {
              set: [], // Clear existing connections
            },
          },
        });
        
        // Then connect the new members
        if (data.memberIds.length > 0) {
          const validMemberIds = await tx.user.findMany({
            where: {
              id: {
                in: data.memberIds
              }
            },
            select: {
              id: true
            }
          });
          
          const validIds = validMemberIds.map(user => user.id);
          
          if (validIds.length > 0) {
            await tx.project.update({
              where: { id: params.id },
              data: {
                members: {
                  connect: validIds.map(id => ({ id })),
                },
              },
            });
          }
        }
      }

      return updatedProject;
    }).catch(error => {
      console.error('Transaction failed in project update:', error);
      throw error;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating project:', error);
    
    // Check for specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if project exists and include tasks
    const existingProject = await prisma.project.findUnique({
      where: {
        id: params.id,
      },
      include: {
        tasks: true
      }
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Check if the user has permission to delete the project
    if (!session.user.isAdmin && existingProject.managerId !== session.user.id) {
      return NextResponse.json({ error: 'You do not have permission to delete this project' }, { status: 403 });
    }

    // Use a transaction for the delete operation
    await prisma.$transaction(async (tx) => {
      // Delete all tasks associated with the project first
      if (existingProject.tasks.length > 0) {
        await tx.task.deleteMany({
          where: {
            projectId: params.id
          }
        });
      }

      // Delete the project
      await tx.project.delete({
        where: { id: params.id },
      });
      
      // Create activity log directly
      const now = new Date();
      const timeString = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      
      await tx.dailyLog.create({
        data: {
          date: now,
          startTime: timeString,
          endTime: timeString,
          description: `プロジェクト「${existingProject.name}」を削除しました`,
          category: 'development',
          completed: true,
          userId: session.user.id,
        }
      });
    }).catch(error => {
      console.error('Transaction failed in project deletion:', error);
      throw error;
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
} 