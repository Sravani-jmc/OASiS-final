import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { createActivityLogHelper as createActivityLog } from '@/lib/activityLogger';

// GET /api/tasks/[id]/comments - Get all comments for a task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskId = params.id;
    
    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get all comments for this task
    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching task comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/comments - Create a new comment for a task
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskId = params.id;
    const userId = session.user.id;
    
    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            name: true
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Validate request body
    const body = await request.json();
    const commentSchema = z.object({
      content: z.string().min(1, 'Comment content is required'),
    });
    
    const validatedData = commentSchema.parse(body);

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content: validatedData.content,
        author: {
          connect: { id: userId }
        },
        task: {
          connect: { id: taskId }
        }
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
          }
        }
      }
    });

    // Log the activity
    try {
      await createActivityLog(
        userId,
        'comment_create',
        'task',
        { 
          taskName: task.title,
          projectName: task.project?.name || 'Unknown Project',
        }
      );
    } catch (logError) {
      console.error('Error creating activity log:', logError);
      // Don't fail the comment creation if activity log fails
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: error.errors[0].message,
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]/comments?commentId=xxx - Delete a specific comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the commentId from the URL searchParams
    const url = new URL(request.url);
    const commentId = url.searchParams.get('commentId');
    
    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    // Find the comment to verify ownership and get task info
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: {
            project: {
              select: {
                name: true
              }
            }
          }
        },
        author: true
      }
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Only allow the comment author to delete it (or implement admin role check)
    if (comment.author.id !== session.user.id) {
      return NextResponse.json({ error: 'You are not authorized to delete this comment' }, { status: 403 });
    }

    // Delete the comment
    await prisma.comment.delete({
      where: { id: commentId }
    });

    // Log the activity
    try {
      await createActivityLog(
        session.user.id,
        'comment_delete',
        'task',
        { 
          taskName: comment.task?.title || 'Unknown Task',
          projectName: comment.task?.project?.name || 'Unknown Project',
        }
      );
    } catch (logError) {
      console.error('Error creating activity log:', logError);
      // Don't fail the comment deletion if activity log fails
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
} 