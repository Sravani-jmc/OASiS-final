import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';

// PATCH /api/teams/[id]/members/[userId]/role - Update a team member's role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'メンバーの役割を変更するにはログインが必要です' },
        { status: 401 }
      );
    }
    
    const teamId = params.id;
    const targetUserId = params.userId;
    
    // Verify the team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'チームが見つかりません' },
        { status: 404 }
      );
    }
    
    // Verify the user has permission to update member roles
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
          { error: 'このチームのメンバーの役割を変更する権限がありません' },
          { status: 403 }
        );
      }
    }
    
    // Prevent changing the role of the team owner
    if (targetUserId === team.ownerId) {
      return NextResponse.json(
        { error: 'チームのオーナーの役割は変更できません' },
        { status: 400 }
      );
    }
    
    // Validate request body
    const schema = z.object({
      role: z.enum(['member', 'admin']),
    });
    
    const validationResult = schema.safeParse(await request.json());
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '役割の値が無効です。「member」または「admin」を指定してください' },
        { status: 400 }
      );
    }
    
    const { role } = validationResult.data;
    
    // Verify the target user is a member of the team
    const targetMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: targetUserId,
      },
      include: {
        user: {
          select: {
            username: true,
            fullName: true,
          },
        },
      },
    });
    
    if (!targetMember) {
      return NextResponse.json(
        { error: 'このユーザーはチームのメンバーではありません' },
        { status: 404 }
      );
    }
    
    // Update the member's role
    const updatedMember = await prisma.teamMember.update({
      where: {
        id: targetMember.id,
      },
      data: {
        role,
      },
    });
    
    // Create a daily log entry for the role update
    await prisma.dailyLog.create({
      data: {
        date: new Date(),
        startTime: new Date().toLocaleTimeString(),
        endTime: new Date().toLocaleTimeString(),
        description: `Updated role of ${targetMember.user.fullName || targetMember.user.username} to ${role} in team: ${team.name}`,
        category: 'team',
        completed: true,
        userId: session.user.id,
      },
    });
    
    // Create a notification for the target user
    try {
      await prisma.$executeRaw`
        INSERT INTO notifications (
          id, type, title, message, "read", "createdAt", "linkUrl", data, "userId"
        )
        VALUES (
          ${`not_${crypto.randomBytes(16).toString('hex')}`},
          'role_update',
          'チーム役割の更新',
          ${`「${team.name}」チームでの役割が「${role === 'admin' ? '管理者' : 'メンバー'}」に変更されました`},
          false,
          ${new Date()},
          ${`/teams/${teamId}`},
          ${JSON.stringify({
            teamId,
            teamName: team.name,
            updatedBy: session.user.id,
            newRole: role,
          })},
          ${targetUserId}
        )
      `;
    } catch (error) {
      console.error('Failed to create notification:', error);
      // Continue even if notification creation fails
    }
    
    return NextResponse.json({
      message: 'メンバーの役割が正常に更新されました',
      member: {
        userId: targetUserId,
        role: updatedMember.role,
      },
    });
    
  } catch (error) {
    console.error('Error updating team member role:', error);
    return NextResponse.json(
      { error: 'メンバーの役割の更新に失敗しました' },
      { status: 500 }
    );
  }
} 