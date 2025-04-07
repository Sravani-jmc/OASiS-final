import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// POST /api/notifications/mark-read - Mark specific notifications as read
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate request body
    const schema = z.object({
      notificationIds: z.array(z.string()),
    });
    
    const validationResult = schema.safeParse(await request.json());
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { notificationIds } = validationResult.data;
    
    // Update specified notifications as read
    // Ensure that the user can only mark their own notifications as read
    const result = await (prisma as any).notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: session.user.id,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
    
    return NextResponse.json({ 
      message: `Marked ${result.count} notifications as read` 
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
} 