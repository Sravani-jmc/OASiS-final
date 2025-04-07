import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import { createActivityLogHelper as createActivityLog } from '@/lib/activityLogger';

// PUT /api/invitations/[invitationId] - Accept or reject an invitation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const invitationId = params.id;
    
    // Validate request body
    const ActionSchema = z.object({
      action: z.enum(['accept', 'reject'])
    });
    
    const body = await request.json();
    const { action } = ActionSchema.parse(body);
    
    // Find the invitation in the database
    const invitation = await prisma.teamInvitation.findUnique({
      where: {
        id: invitationId,
      },
      include: {
        team: true
      }
    });
    
    if (!invitation) {
      return NextResponse.json(
        { error: '招待が見つかりませんでした' },
        { status: 404 }
      );
    }
    
    // Make sure the invitation isn't expired
    if (invitation.expiresAt < new Date() && !invitation.accepted) {
      return NextResponse.json(
        { error: '招待の有効期限が切れています' },
        { status: 400 }
      );
    }
    
    // Make sure the invitation is for the current user
    if (invitation.email !== session.user.email) {
      return NextResponse.json(
        { error: 'この招待は他のユーザー向けです' },
        { status: 403 }
      );
    }
    
    if (action === 'accept') {
      // Check if the user is already a member of the team
      const existingMember = await prisma.teamMember.findFirst({
        where: {
          teamId: invitation.teamId,
          userId: session.user.id
        }
      });
      
      if (existingMember) {
        // Mark invitation as accepted
        await prisma.teamInvitation.update({
          where: { id: invitationId },
          data: { accepted: true }
        });
        
        return NextResponse.json({
          message: 'あなたは既にこのチームのメンバーです',
          teamId: invitation.teamId,
          teamName: invitation.team.name
        });
      }
      
      // Add user to the team with the specified role
      await prisma.teamMember.create({
        data: {
          id: crypto.randomUUID(),
          teamId: invitation.teamId,
          userId: session.user.id,
          role: invitation.role,
          joinedAt: new Date()
        }
      });
      
      // Mark invitation as accepted
      await prisma.teamInvitation.update({
        where: { id: invitationId },
        data: { accepted: true }
      });
      
      // Create a notification for the team owner/admin
      await prisma.notification.create({
        data: {
          userId: invitation.invitedById,
          type: 'TEAM_MEMBER_JOINED',
          title: 'チームメンバー参加',
          message: `${session.user.username || session.user.email}がチーム「${invitation.team.name}」に参加しました`,
          read: false,
          linkUrl: `/teams/${invitation.teamId}`,
          data: JSON.stringify({ teamId: invitation.teamId })
        }
      });
      
      // Log activity for accepting team invitation
      await createActivityLog(
        session.user.id,
        'team_join',
        'team',
        { teamName: invitation.team.name }
      );
      
      return NextResponse.json({
        message: 'チームに参加しました',
        teamId: invitation.teamId,
        teamName: invitation.team.name
      });
    } else {
      // Just mark the invitation as rejected (we'll keep it in the database)
      await prisma.teamInvitation.update({
        where: { id: invitationId },
        data: { 
          accepted: false,
          // Set expiration date to now to mark it as expired
          expiresAt: new Date() 
        }
      });
      
      // Create a notification for the team owner/admin about the rejection
      await prisma.notification.create({
        data: {
          userId: invitation.invitedById,
          type: 'TEAM_INVITATION_REJECTED',
          title: 'チーム招待拒否',
          message: `${session.user.username || session.user.email}がチーム「${invitation.team.name}」への招待を拒否しました`,
          read: false,
          linkUrl: `/teams/${invitation.teamId}/members`,
          data: JSON.stringify({ teamId: invitation.teamId })
        }
      });
      
      // Log activity for rejecting team invitation
      await createActivityLog(
        session.user.id,
        'team_invite_reject',
        'team',
        { teamName: invitation.team.name }
      );
      
      return NextResponse.json({
        message: '招待を拒否しました'
      });
    }
    
  } catch (error) {
    console.error('Error processing invitation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '無効なデータ形式です', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: '招待の処理に失敗しました' },
      { status: 500 }
    );
  }
} 