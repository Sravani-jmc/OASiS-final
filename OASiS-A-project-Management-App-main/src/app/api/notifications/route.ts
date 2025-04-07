import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/notifications - Get all notifications for the current user
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get all notifications for the user
    const notifications = await (prisma as any).notification.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/notifications - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow server-side or authenticated users to create notifications
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate request body with Zod
    const schema = z.object({
      userId: z.string(),
      type: z.string(),
      title: z.string(),
      message: z.string(),
      linkUrl: z.string().optional(),
      data: z.any().optional(),
    });
    
    const validationResult = schema.safeParse(await request.json());
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid notification data', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Extract validated data
    const { userId, type, title, message, linkUrl, data } = validationResult.data;
    
    // Check permission - only allow creating notifications for self or if admin
    if (userId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'You can only create notifications for yourself' },
        { status: 403 }
      );
    }
    
    // Create the notification
    const notification = await (prisma as any).notification.create({
      data: {
        userId,
        type,
        title,
        message,
        linkUrl,
        data: data || {},
        createdAt: new Date(),
      },
    });
    
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// PUT /api/notifications - Mark all notifications as read
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Update all unread notifications for this user
    const result = await (prisma as any).notification.updateMany({
      where: {
        userId: session.user.id,
        read: false
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });
    
    return NextResponse.json({ 
      message: `Marked ${result.count} notifications as read` 
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
} 