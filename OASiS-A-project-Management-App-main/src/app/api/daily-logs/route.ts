import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/daily-logs - Get daily logs for the current user or all users for admins
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '認証されていません' }, { status: 401 });
    }
    
    const searchParams = new URL(request.url).searchParams;
    const date = searchParams.get('date');
    const category = searchParams.get('category');
    const userId = searchParams.get('userId');
    const showAll = searchParams.get('showAll') === 'true';
    const includeAllActivities = searchParams.get('includeAllActivities') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    
    // Build the query conditions
    const where: any = {};
    
    // Date filter
    if (date) {
      // If including all activities, allow a broader date range for the specific day
      if (includeAllActivities) {
        const dateObj = new Date(date);
        const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
        const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));
        where.date = {
          gte: startOfDay,
          lte: endOfDay
        };
      } else {
        where.date = new Date(date);
      }
    }
    
    // Category filter
    if (category && category !== 'all') {
      where.category = category;
    }
    
    // User filter based on permissions
    if (!showAll) {
      // When not showing all logs, only show the current user's logs
      where.userId = session.user.id;
    } else if (userId && userId !== 'all') {
      // When filtered by a specific user
      where.userId = userId;
    }
    
    // Get the daily logs with user information included
    const logs = await prisma.dailyLog.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      },
      ...(limit ? { take: limit } : {})
    });
    
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching daily logs:', error);
    return NextResponse.json({ error: 'ログの取得に失敗しました' }, { status: 500 });
  }
}

// POST /api/daily-logs - Create a new daily log
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: '認証されていません' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.description || !data.category || !data.startTime || !data.endTime) {
      return NextResponse.json({ error: '必須フィールドが不足しています' }, { status: 400 });
    }

    // Create the daily log
    const log = await prisma.dailyLog.create({
      data: {
        date: data.date ? new Date(data.date) : new Date(),
        startTime: data.startTime,
        endTime: data.endTime,
        description: data.description,
        category: data.category,
        completed: data.completed !== undefined ? data.completed : true,
        userId: session.user.id,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('Error creating daily log:', error);
    return NextResponse.json({ error: 'ログの作成に失敗しました' }, { status: 500 });
  }
} 