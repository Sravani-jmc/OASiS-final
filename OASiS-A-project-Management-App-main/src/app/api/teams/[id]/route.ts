import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// GET /api/teams/[id] - Get team details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be logged in to view team details' },
        { status: 401 }
      );
    }
    
    const teamId = params.id;
    
    // Fetch the team from database
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'チームが見つかりませんでした' },
        { status: 404 }
      );
    }
    
    // Fetch team members
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            position: true,
            department: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });
    
    // Check if the current user is a member of this team
    const userMembership = members.find(member => member.user.id === session.user.id);
    const isOwner = team.ownerId === session.user.id;
    
    // Determine the user's role - allow all users to view teams but with appropriate permissions
    let userRole = 'viewer'; // Default role for non-members
    if (isOwner) {
      userRole = 'owner';
    } else if (userMembership) {
      userRole = userMembership.role;
    }
    
    return NextResponse.json({
      team: {
        ...team,
        members,
        userRole,
      },
      userRole,
    });
    
  } catch (error) {
    console.error('Error fetching team details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team details' },
      { status: 500 }
    );
  }
}

// PUT /api/teams/[id] - Update team details
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be logged in to update team details' },
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
    
    // Check if user is the owner or an admin of the team
    const isOwner = team.ownerId === session.user.id;
    
    if (!isOwner) {
      const userTeamMember = await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: session.user.id,
          role: 'admin',
        },
      });
      
      if (!userTeamMember) {
        return NextResponse.json(
          { error: 'You do not have permission to update this team' },
          { status: 403 }
        );
      }
    }
    
    const { name, description, addedMembers, updatedRoles, removedUserIds } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      );
    }
    
    // Update the team in the database
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        name,
        description,
      },
    });

    // Handle member updates if provided
    if (addedMembers || updatedRoles || removedUserIds) {
      // 1. Add new members
      if (addedMembers && Array.isArray(addedMembers) && addedMembers.length > 0) {
        // Create new team members
        await prisma.teamMember.createMany({
          data: addedMembers.map(member => ({
            teamId,
            userId: member.userId,
            role: member.role || 'member',
            joinedAt: new Date()
          }))
        });

        // Create notifications for new members
        for (const member of addedMembers) {
          try {
            await prisma.$executeRaw`
              INSERT INTO notifications (
                id, type, title, message, read, "createdAt", "linkUrl", data, "userId"
              )
              VALUES (
                ${`not_${crypto.randomUUID()}`},
                'team_added',
                'チーム追加',
                ${`あなたは「${updatedTeam.name}」チームに追加されました`},
                false,
                ${new Date()},
                ${`/teams/${teamId}`},
                ${JSON.stringify({
                  teamId,
                  teamName: updatedTeam.name,
                  addedBy: session.user.id,
                  role: member.role || 'member'
                })},
                ${member.userId}
              )
            `;
          } catch (error) {
            console.error('Failed to create notification:', error);
            // Continue with the next member even if notification creation fails
          }
        }
      }

      // 2. Update roles for existing members
      if (updatedRoles && Array.isArray(updatedRoles) && updatedRoles.length > 0) {
        for (const member of updatedRoles) {
          await prisma.teamMember.updateMany({
            where: {
              teamId,
              userId: member.userId
            },
            data: {
              role: member.role
            }
          });
        }
      }

      // 3. Remove members
      if (removedUserIds && Array.isArray(removedUserIds) && removedUserIds.length > 0) {
        await prisma.teamMember.deleteMany({
          where: {
            teamId,
            userId: {
              in: removedUserIds
            }
          }
        });
      }
    }
    
    return NextResponse.json({
      message: 'Team updated successfully',
      team: updatedTeam,
    });
    
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id] - Delete a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be logged in to delete a team' },
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
    
    // Verify the user is the owner of this team
    if (team.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the team owner can delete the team' },
        { status: 403 }
      );
    }
    
    // Delete the team
    await prisma.team.delete({
      where: { id: teamId },
    });
    
    return NextResponse.json({
      message: `Team "${team.name}" has been deleted successfully`,
    });
    
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
} 