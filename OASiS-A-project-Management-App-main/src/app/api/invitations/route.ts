import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// GET /api/invitations - Get pending invitations for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const query = prisma.$queryRaw`
      SELECT 
        i.id, 
        i."teamId", 
        t.name as "teamName", 
        i."invitedById" as "inviterId", 
        COALESCE(u."fullName", u.username) as "inviterName",
        CASE 
          WHEN i.accepted = true THEN 'accepted'
          WHEN i."expiresAt" < datetime('now') THEN 'expired'
          ELSE 'pending'
        END as status,
        i."createdAt",
        i."role",
        i."expiresAt"
      FROM team_invitations i
      JOIN teams t ON i."teamId" = t.id
      JOIN users u ON i."invitedById" = u.id
      WHERE i.email = ${session.user.email}
      ORDER BY i."createdAt" DESC
    `;

    const invitations = await query as any[];
    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: '招待の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST /api/invitations - Create a new invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { action, invitationToken } = body;

    if (!action || !invitationToken) {
      return NextResponse.json(
        { error: 'アクションとトークンが必要です' },
        { status: 400 }
      );
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: '無効なアクションです' },
        { status: 400 }
      );
    }

    const query = prisma.$queryRaw`
      SELECT 
        i.id, 
        i."teamId", 
        t.name as "teamName", 
        i."invitedById" as "inviterId", 
        COALESCE(u."fullName", u.username) as "inviterName",
        i.accepted,
        i."expiresAt"
      FROM team_invitations i
      JOIN teams t ON i."teamId" = t.id
      JOIN users u ON i."invitedById" = u.id
      WHERE i.token = ${invitationToken}
    `;

    const invitation = await query as any[];
    
    if (!invitation.length) {
      return NextResponse.json(
        { error: '招待が見つかりませんでした' },
        { status: 404 }
      );
    }

    const invitationData = invitation[0];

    if (invitationData.accepted) {
      return NextResponse.json(
        { error: 'この招待は既に処理されています' },
        { status: 400 }
      );
    }

    if (invitationData.expiresAt < new Date()) {
      return NextResponse.json(
        { error: '招待の有効期限が切れています' },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      // Add user to the team
      await prisma.teamMember.create({
        data: {
          teamId: invitationData.teamId,
          userId: session.user.id,
          role: 'member',
          joinedAt: new Date()
        }
      });

      // Mark invitation as accepted
      await prisma.teamInvitation.update({
        where: { id: invitationData.id },
        data: { accepted: true }
      });

      return NextResponse.json({
        message: 'チームに参加しました',
        teamId: invitationData.teamId,
        teamName: invitationData.teamName
      });
    } else {
      // Mark invitation as rejected
      await prisma.teamInvitation.update({
        where: { id: invitationData.id },
        data: { 
          accepted: false,
          expiresAt: new Date() // Set expiration date to now
        }
      });

      return NextResponse.json({
        message: '招待を拒否しました'
      });
    }
  } catch (error) {
    console.error('Error processing invitation:', error);
    return NextResponse.json(
      { error: '招待の処理に失敗しました' },
      { status: 500 }
    );
  }
} 