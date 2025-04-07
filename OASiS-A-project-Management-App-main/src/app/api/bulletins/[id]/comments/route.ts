import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// POST /api/bulletins/[id]/comments - Add a comment to a bulletin
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'You must be logged in to comment' },
        { status: 401 }
      );
    }
    
    const bulletinId = params.id;
    
    // Verify the bulletin exists
    const bulletin = await prisma.bulletinPost.findUnique({
      where: { id: bulletinId },
    });
    
    if (!bulletin) {
      return NextResponse.json(
        { error: 'Bulletin not found' },
        { status: 404 }
      );
    }
    
    // Validate request body
    const commentSchema = z.object({
      content: z.string().min(1, 'Comment content is required'),
    });
    
    const body = await request.json();
    const validatedData = commentSchema.parse(body);
    
    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content: validatedData.content,
        postId: bulletinId,
        authorId: session.user.id,
      },
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
    
    // Format the response
    const formattedComment = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: {
        id: comment.author.id,
        name: comment.author.fullName || comment.author.username,
      },
    };
    
    return NextResponse.json(formattedComment, { status: 201 });
    
  } catch (error) {
    console.error('Error adding comment:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
} 