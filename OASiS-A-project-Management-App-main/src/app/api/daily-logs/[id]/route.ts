import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// PUT /api/daily-logs/:id - Update a daily log
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.description || !data.category || !data.startTime || !data.endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the daily log
    const log = await prisma.dailyLog.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!log) {
      return NextResponse.json({ error: 'Daily log not found' }, { status: 404 });
    }

    // Update the daily log
    const updatedLog = await prisma.dailyLog.update({
      where: {
        id: params.id,
      },
      data: {
        startTime: data.startTime,
        endTime: data.endTime,
        description: data.description,
        category: data.category,
        completed: data.completed !== undefined ? data.completed : log.completed,
      },
    });

    return NextResponse.json(updatedLog);
  } catch (error) {
    console.error('Error updating daily log:', error);
    return NextResponse.json({ error: 'Failed to update daily log' }, { status: 500 });
  }
}

// DELETE /api/daily-logs/:id - Delete a daily log
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the daily log
    const log = await prisma.dailyLog.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!log) {
      return NextResponse.json({ error: 'Daily log not found' }, { status: 404 });
    }

    // Delete the daily log
    await prisma.dailyLog.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ message: 'Daily log deleted' });
  } catch (error) {
    console.error('Error deleting daily log:', error);
    return NextResponse.json({ error: 'Failed to delete daily log' }, { status: 500 });
  }
} 