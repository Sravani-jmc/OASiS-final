import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// GET /api/bulletins - Get all bulletins
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const importance = searchParams.get('importance');
    const pinned = searchParams.get('pinned');

    // Build the where clause based on query parameters
    const where: any = {};
    
    if (category) {
      where.category = category;
    }
    
    if (importance) {
      where.importance = importance;
    }
    
    if (pinned === 'true') {
      where.pinned = true;
    }

    const bulletins = await prisma.bulletinPost.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                fullName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
      orderBy: [
        { pinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Format the response
    const formattedBulletins = bulletins.map(bulletin => ({
      id: bulletin.id,
      title: bulletin.title,
      content: bulletin.content,
      category: (bulletin as any).category,
      importance: (bulletin as any).importance,
      createdAt: bulletin.createdAt,
      updatedAt: bulletin.updatedAt,
      pinned: bulletin.pinned,
      author: {
        id: bulletin.author.id,
        name: bulletin.author.fullName || bulletin.author.username,
      },
      comments: bulletin.comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: {
          id: comment.author.id,
          name: comment.author.fullName || comment.author.username,
        },
      })),
    }));

    return NextResponse.json(formattedBulletins);
  } catch (error) {
    console.error('Error fetching bulletins:', error);
    return NextResponse.json({ error: 'Failed to fetch bulletins' }, { status: 500 });
  }
}

// POST /api/bulletins - Create a new bulletin
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body with zod
    const bulletinSchema = z.object({
      title: z.string().min(1, 'Title is required'),
      content: z.string().min(1, 'Content is required'),
      pinned: z.boolean().default(false),
      category: z.string().optional(),
      importance: z.string().optional(),
    });
    
    const body = await request.json();
    const validatedData = bulletinSchema.parse(body);

    // Create the bulletin
    const bulletin = await prisma.bulletinPost.create({
      data: {
        title: validatedData.title,
        content: validatedData.content,
        pinned: validatedData.pinned,
        category: validatedData.category,
        importance: validatedData.importance,
        authorId: session.user.id,
      } as any,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    // Create a daily log entry for bulletin creation
    await prisma.dailyLog.create({
      data: {
        date: new Date(),
        startTime: new Date().toLocaleTimeString(),
        endTime: new Date().toLocaleTimeString(),
        description: `Created bulletin: ${validatedData.title}`,
        category: 'bulletin',
        completed: true,
        userId: session.user.id,
      },
    });

    // Format the response
    const formattedBulletin = {
      id: bulletin.id,
      title: bulletin.title,
      content: bulletin.content,
      createdAt: bulletin.createdAt,
      updatedAt: bulletin.updatedAt,
      pinned: bulletin.pinned,
      category: validatedData.category || null,
      importance: validatedData.importance || null,
      author: {
        id: (bulletin as any).author.id,
        name: (bulletin as any).author.fullName || (bulletin as any).author.username,
      },
      comments: [],
    };

    return NextResponse.json(formattedBulletin, { status: 201 });
  } catch (error) {
    console.error('Error creating bulletin:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to create bulletin' }, { status: 500 });
  }
} 