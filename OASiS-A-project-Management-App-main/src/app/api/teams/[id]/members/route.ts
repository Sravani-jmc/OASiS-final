import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { z } from 'zod';
import { createActivityLogHelper as createActivityLog } from '@/lib/activityLogger';

// Mock function to simulate sending an invitation email
async function sendInvitationEmail(email: string, teamName: string, inviterName: string) {
  // In a real application, this would send an actual email
  console.log(`Invitation email sent to ${email} for team ${teamName} from ${inviterName}`);
  return true;
}

// POST /api/teams/[id]/members - Invite a new member to the team
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'メンバーを招待するにはログインが必要です' },
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
    
    // Verify the user has permission to invite members to this team
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
          { error: 'このチームにメンバーを招待する権限がありません' },
          { status: 403 }
        );
      }
    }
    
    // Validate request body
    const schema = z.object({
      email: z.string().email('有効なメールアドレスを入力してください'),
      role: z.enum(['member', 'admin']),
      name: z.string().optional(),
    });
    
    const validationResult = schema.safeParse(await request.json());
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: '入力データが無効です', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { email, role, name } = validationResult.data;
    
    // Check if user already exists in the system
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });
    
    // Check if there's already a pending invitation for this email and team
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        email,
        teamId,
        accepted: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
    
    if (existingInvitation) {
      return NextResponse.json(
        { error: 'このメールアドレスには既に招待が送信されています' },
        { status: 400 }
      );
    }
    
    // If user exists, check if they're already a member of the team
    if (existingUser) {
      const existingMember = await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: existingUser.id,
        },
      });
      
      if (existingMember) {
        return NextResponse.json(
          { error: 'このユーザーは既にチームのメンバーです' },
          { status: 400 }
        );
      }
    } else {
      // User doesn't exist in the system
      return NextResponse.json(
        { error: 'このメールアドレスはOasisに登録されていません。先にユーザー登録が必要です。' },
        { status: 400 }
      );
    }
    
    // Create an invitation record
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
    
    const invitation = await prisma.teamInvitation.create({
      data: {
        email,
        teamId,
        invitedById: session.user.id,
        token,
        role,
        expiresAt,
      },
    });
    
    // Log activity for team invitation
    await createActivityLog(
      session.user.id,
      'team_invite_send',
      'team',
      { 
        email: email,
        teamName: team.name
      }
    );
    
    // In a real app, you would send an email with the invitation link
    // For now, we'll just return the invitation data
    
    return NextResponse.json(
      { 
        message: '招待が正常に送信されました',
        invitation: {
          id: invitation.id,
          email,
          teamId,
          teamName: team.name,
          role,
          expiresAt: invitation.expiresAt,
        }
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Error inviting team member:', error);
    return NextResponse.json(
      { error: 'チームメンバーの招待に失敗しました' },
      { status: 500 }
    );
  }
}

// GET /api/teams/[id]/members - Get all members of a team
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'チームメンバーを表示するにはログインが必要です' },
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
            email: true,
            position: true,
            department: true,
            lastLogin: true,
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
    
    // Verify the user has permission to view members of this team
    const isOwner = team.ownerId === session.user.id;
    const isMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
      },
    });
    
    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: 'このチームのメンバーを表示する権限がありません' },
        { status: 403 }
      );
    }
    
    // Get all members of the team
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
            lastLogin: true,
          },
        },
      },
    });
    
    // Format the response
    const formattedMembers = members.map(member => ({
      id: member.user.id,
      username: member.user.username,
      fullName: member.user.fullName,
      email: member.user.email,
      position: member.user.position,
      department: member.user.department,
      lastLogin: member.user.lastLogin,
      role: member.role,
      joinedAt: member.joinedAt,
    }));
    
    // Add the owner to the list
    const ownerMember = {
      id: team.owner.id,
      username: team.owner.username,
      fullName: team.owner.fullName,
      email: team.owner.email,
      position: team.owner.position,
      department: team.owner.department,
      lastLogin: team.owner.lastLogin,
      role: 'owner',
      joinedAt: team.createdAt,
    };
    
    return NextResponse.json([ownerMember, ...formattedMembers]);
    
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'チームメンバーの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id]/members/[userId] - Remove a member from the team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'チームメンバーを削除するにはログインが必要です' },
        { status: 401 }
      );
    }
    
    const teamId = params.id;
    const targetUserId = params.userId;
    
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
    
    // Prevent removing the team owner
    if (targetUserId === team.ownerId) {
      return NextResponse.json(
        { error: 'チームのオーナーは削除できません' },
        { status: 400 }
      );
    }
    
    // Self-removal is always allowed
    const isSelfRemoval = targetUserId === session.user.id;
    
    // If not self-removal, verify the user has permission to remove members
    if (!isSelfRemoval) {
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
            { error: 'このチームからメンバーを削除する権限がありません' },
            { status: 403 }
          );
        }
      }
    }
    
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
    
    // Remove the user from the team
    await prisma.teamMember.delete({
      where: {
        id: targetMember.id,
      },
    });
    
    // Create a daily log entry for the removal
    await prisma.dailyLog.create({
      data: {
        date: new Date(),
        startTime: new Date().toLocaleTimeString(),
        endTime: new Date().toLocaleTimeString(),
        description: `Removed ${targetMember.user.fullName || targetMember.user.username} from team: ${team.name}`,
        category: 'team',
        completed: true,
        userId: session.user.id,
      },
    });
    
    return NextResponse.json(
      { message: 'メンバーが正常に削除されました' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'チームメンバーの削除に失敗しました' },
      { status: 500 }
    );
  }
} 