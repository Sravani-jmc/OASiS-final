import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/invitations/count - Get count of pending invitations for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '認証が必要です', count: 0 },
        { status: 401 }
      );
    }
    
    // Check if email exists
    if (!session.user.email) {
      return NextResponse.json({ count: 0 });
    }
    
    // Use Prisma count method instead of raw SQL to improve compatibility
    try {
      const count = await prisma.teamInvitation.count({
        where: {
          email: session.user.email,
          accepted: false,
          expiresAt: {
            gt: new Date()
          }
        }
      });
      
      return NextResponse.json({ count });
    } catch (dbError) {
      console.error('Database error counting invitations:', dbError);
      // Return 0 count on database error to avoid breaking the UI
      return NextResponse.json({ count: 0 });
    }
    
  } catch (error) {
    console.error('Error counting invitations:', error);
    // Always return a valid response with count 0 to prevent UI errors
    return NextResponse.json(
      { error: '招待の数の取得に失敗しました', count: 0 },
      { status: 200 } // Using 200 instead of 500 to prevent client error
    );
  }
} 