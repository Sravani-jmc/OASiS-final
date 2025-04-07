import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/teams/[id]/projects - Get all projects for a specific team
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be logged in to view team projects' },
        { status: 401 }
      );
    }
    
    const teamId = params.id;
    
    // Verify the team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Verify the user has permission to view team projects
    const isOwner = team.ownerId === session.user.id;
    const isMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
      },
    });
    
    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: 'You do not have permission to view this team\'s projects' },
        { status: 403 }
      );
    }
    
    // Fetch projects for this team
    const projects = await prisma.project.findMany({
      where: { teamId },
      include: {
        manager: {
          select: {
            id: true,
            username: true,
            fullName: true,
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
            priority: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Calculate progress for each project
    const formattedProjects = projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      progress: calculateProgress(project.tasks),
      startDate: project.startDate.toISOString(),
      endDate: project.endDate ? project.endDate.toISOString() : null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      managerId: project.managerId,
      manager: project.manager,
      memberCount: project.members.length,
      taskCount: project.tasks.length,
    }));
    
    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
      },
      projects: formattedProjects,
    });
    
  } catch (error) {
    console.error('Error fetching team projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team projects' },
      { status: 500 }
    );
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
  
  const totalWeight = tasks.reduce((sum, task) => sum + getTaskWeight(task.priority), 0);
  const completedWeight = tasks
    .filter(task => task.status === 'completed')
    .reduce((sum, task) => sum + getTaskWeight(task.priority), 0);
  
  return Math.round((completedWeight / totalWeight) * 100);
} 