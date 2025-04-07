import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createActivityLogHelper as createActivityLog } from '@/lib/activityLogger';

// POST /api/teams/[id]/join-request - Send a request to join a team
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const teamId = params.id;
    
    // Verify the team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'チームが見つかりません' },
        { status: 404 }
      );
    }
    
    // Check if user is already a member
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
      },
    });
    
    if (existingMembership) {
      return NextResponse.json(
        { error: 'すでにこのチームのメンバーです' },
        { status: 400 }
      );
    }
    
    // For now, automatically add the user to the team
    // In a real application, you might want to create a separate join request table
    // and have team owners approve requests
    const teamMember = await prisma.teamMember.create({
      data: {
        teamId,
        userId: session.user.id,
        role: 'member',
        joinedAt: new Date(),
      },
    });
    
    // Create an activity log for the join
    await createActivityLog(
      session.user.id,
      'team_join',
      'team',
      { teamName: team.name }
    );
    
    // Create a notification for the team owner
    try {
      await prisma.notification.create({
        data: {
          type: 'team_join',
          title: 'チーム参加',
          message: `${session.user.name || session.user.email}さんが「${team.name}」チームに参加しました`,
          read: false,
          linkUrl: `/teams/${teamId}`,
          data: JSON.stringify({
            teamId,
            teamName: team.name,
            userId: session.user.id,
            userName: session.user.name || session.user.email
          }),
          userId: team.owner.id,
        },
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
      // Continue even if notification creation fails
    }
    
    return NextResponse.json({
      message: 'チームに参加しました',
      teamMember,
    });
    
  } catch (error) {
    console.error('Error processing team join request:', error);
    return NextResponse.json(
      { error: 'チーム参加リクエストの処理に失敗しました' },
      { status: 500 }
    );
  }
} 