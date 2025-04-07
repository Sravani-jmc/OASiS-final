import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// GET /api/bulletins/[id] - Get a specific bulletin
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'You must be logged in to view this bulletin' },
        { status: 401 }
      );
    }
    
    const bulletinId = params.id;
    
    const bulletin = await prisma.bulletinPost.findUnique({
      where: { id: bulletinId },
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
            createdAt: 'asc',
          },
        },
      },
    });
    
    if (!bulletin) {
      return NextResponse.json(
        { error: 'Bulletin not found' },
        { status: 404 }
      );
    }

    // Format the response
    const formattedBulletin = {
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
    };
    
    return NextResponse.json(formattedBulletin);
    
  } catch (error) {
    console.error('Error fetching bulletin:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bulletin details' },
      { status: 500 }
    );
  }
}

// PUT /api/bulletins/[id] - Update a bulletin
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'You must be logged in to update this bulletin' },
        { status: 401 }
      );
    }
    
    const bulletinId = params.id;
    
    // Verify the bulletin exists
    const existingBulletin = await prisma.bulletinPost.findUnique({
      where: { id: bulletinId },
    });
    
    if (!existingBulletin) {
      return NextResponse.json(
        { error: 'Bulletin not found' },
        { status: 404 }
      );
    }
    
    // Check if user is the author or an admin
    if (existingBulletin.authorId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to update this bulletin' },
        { status: 403 }
      );
    }

    // Validate request body with zod
    const updateSchema = z.object({
      title: z.string().min(1, 'Title is required'),
      content: z.string().min(1, 'Content is required'),
      pinned: z.boolean().optional(),
      category: z.string().optional(),
      importance: z.string().optional(),
    });
    
    const body = await request.json();
    const validatedData = updateSchema.parse(body);
    
    // Update the bulletin
    const updatedBulletin = await prisma.bulletinPost.update({
      where: { id: bulletinId },
      data: {
        title: validatedData.title,
        content: validatedData.content,
        ...(validatedData.pinned !== undefined && { pinned: validatedData.pinned }),
        ...(validatedData.category !== undefined && { category: validatedData.category }),
        ...(validatedData.importance !== undefined && { importance: validatedData.importance }),
        updatedAt: new Date(),
      },
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
            createdAt: 'asc',
          },
        },
      },
    });
    
    // Format the response for PUT
    const formattedUpdatedBulletin = {
      id: updatedBulletin.id,
      title: updatedBulletin.title,
      content: updatedBulletin.content,
      category: (updatedBulletin as any).category,
      importance: (updatedBulletin as any).importance,
      createdAt: updatedBulletin.createdAt,
      updatedAt: updatedBulletin.updatedAt,
      pinned: updatedBulletin.pinned,
      author: {
        id: updatedBulletin.author.id,
        name: updatedBulletin.author.fullName || updatedBulletin.author.username,
      },
    };
    
    return NextResponse.json(formattedUpdatedBulletin);
    
  } catch (error) {
    console.error('Error updating bulletin:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update bulletin' },
      { status: 500 }
    );
  }
}

// DELETE /api/bulletins/[id] - Delete a bulletin
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'You must be logged in to delete this bulletin' },
        { status: 401 }
      );
    }
    
    const bulletinId = params.id;
    
    // Verify the bulletin exists
    const existingBulletin = await prisma.bulletinPost.findUnique({
      where: { id: bulletinId },
    });
    
    if (!existingBulletin) {
      return NextResponse.json(
        { error: 'Bulletin not found' },
        { status: 404 }
      );
    }
    
    // Check if user is the author or an admin
    if (existingBulletin.authorId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this bulletin' },
        { status: 403 }
      );
    }
    
    // Delete the bulletin
    await prisma.bulletinPost.delete({
      where: { id: bulletinId },
    });
    
    return NextResponse.json({
      message: 'Bulletin deleted successfully',
    });
    
  } catch (error) {
    console.error('Error deleting bulletin:', error);
    return NextResponse.json(
      { error: 'Failed to delete bulletin' },
      { status: 500 }
    );
  }
} 