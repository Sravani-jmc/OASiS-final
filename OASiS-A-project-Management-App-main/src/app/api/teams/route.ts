import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';
import { createActivityLogHelper as createActivityLog } from '@/lib/activityLogger';

// Define types for team with owner and counts
type TeamWithOwnerAndCounts = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  owner: {
    id: string;
    username: string;
    fullName: string | null;
  };
  _count: {
    members: number;
    projects: number;
  };
};

// GET /api/teams - Get all teams for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const getAll = searchParams.get('getAll') === 'true';
    
    // Always get all teams, regardless of user membership
    // This ensures all users including new ones can see all teams
    const teamsRaw = await prisma.team.findMany({
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        },
        _count: {
          select: {
            members: true,
            projects: true
          }
        },
        members: {
          // Include user's membership if it exists
          where: {
            userId: session.user.id
          },
          select: {
            role: true,
            userId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the data to include userRole
    const teams = teamsRaw.map(team => {
      // For all teams, set appropriate userRole
      let userRole = 'viewer'; // Default for non-members
      
      if (team.ownerId === session.user.id) {
        userRole = 'owner';
      } else {
        // Find this user's membership
        const membership = team.members.find(member => member.userId === session.user.id);
        if (membership) {
          userRole = membership.role;
        }
      }
      
      // Remove members field to match the expected format
      const { members, ...teamWithoutMembers } = team;
      
      return {
        ...teamWithoutMembers,
        userRole
      };
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // Validate memberIds if provided
    if (data.memberIds && (
      !Array.isArray(data.memberIds) || 
      data.memberIds.some((member: { userId?: string; role?: string }) => !member.userId || !member.role)
    )) {
      return NextResponse.json({ 
        error: 'Invalid memberIds format. Each member should have userId and role properties.' 
      }, { status: 400 });
    }

    // Create the team
    const team = await prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        ownerId: session.user.id,
      },
    });

    // Add members to the team if provided
    if (data.memberIds && Array.isArray(data.memberIds) && data.memberIds.length > 0) {
      // Handle the new format where memberIds is an array of objects with userId and role
      const memberData = data.memberIds.map((member: { userId: string; role: string }) => ({
        teamId: team.id,
        userId: member.userId,
        role: member.role || 'member', // Default to 'member' if role is not provided
      }));

      await prisma.teamMember.createMany({
        data: memberData,
      });

      // Create notifications for each team member
      for (const member of data.memberIds) {
        try {
          // Create a notification for the invited user
          await prisma.notification.create({
            data: {
              id: `not_${crypto.randomBytes(16).toString('hex')}`,
              type: 'team_added',
              title: 'チーム追加',
              message: `あなたは「${team.name}」チームに追加されました`,
              read: false,
              createdAt: new Date(),
              linkUrl: `/teams/${team.id}`,
              data: JSON.stringify({
                teamId: team.id,
                teamName: team.name,
                addedBy: session.user.id,
                role: member.role
              }),
              userId: member.userId
            }
          });
        } catch (error) {
          console.error('Failed to create notification:', error);
          // Continue with the next member even if notification creation fails
        }
      }
    }

    // Log team creation activity
    await createActivityLog(
      session.user.id,
      'team_create',
      'team',
      { teamName: data.name }
    );

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
} 