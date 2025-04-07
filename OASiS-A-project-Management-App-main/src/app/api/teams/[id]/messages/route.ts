import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/teams/[id]/messages - Get team messages
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be logged in to view team messages' },
        { status: 401 }
      );
    }
    
    const teamId = params.id;
    
    // Verify the team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { 
        id: true,
        ownerId: true
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Get URL query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const before = searchParams.get('before') || undefined;
    
    // Fetch messages from the database
    const messages = await prisma.teamMessage.findMany({
      where: {
        teamId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
    
    return NextResponse.json({
      messages: messages.reverse(), // Return in chronological order
    });
    
  } catch (error) {
    console.error('Error fetching team messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team messages' },
      { status: 500 }
    );
  }
}

// POST /api/teams/[id]/messages - Create a new team message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'You must be logged in to send team messages' },
        { status: 401 }
      );
    }
    
    const teamId = params.id;
    
    // Verify the team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { 
        id: true,
        ownerId: true
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    const { content } = await request.json();
    
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Message content cannot be empty' },
        { status: 400 }
      );
    }
    
    // Create the message in the database
    const message = await prisma.teamMessage.create({
      data: {
        content,
        teamId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Get all team members to send notifications
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        teamId,
        userId: {
          not: session.user.id // Don't notify the sender
        }
      },
      select: {
        userId: true
      }
    });

    // Get team info for the notification
    const teamInfo = await prisma.team.findUnique({
      where: { id: teamId },
      select: { name: true }
    });

    // Create notifications for all team members
    const senderName = session.user.name || session.user.username || session.user.email;
    if (teamInfo && teamMembers.length > 0) {
      await Promise.all(
        teamMembers.map(member => 
          prisma.notification.create({
            data: {
              userId: member.userId,
              type: 'TEAM_MESSAGE',
              title: `New message in ${teamInfo.name}`,
              message: `${senderName} sent a message: "${content.length > 30 ? content.substring(0, 30) + '...' : content}"`,
              read: false,
              linkUrl: `/teams/${teamId}/chat`,
              data: JSON.stringify({ messageId: message.id, teamId })
            }
          })
        )
      );
    }

    return NextResponse.json({
      message,
    });
    
  } catch (error) {
    console.error('Error creating team message:', error);
    return NextResponse.json(
      { error: 'Failed to create team message' },
      { status: 500 }
    );
  }
} 