import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// POST /api/reports/[userId]/[date]/feedback - Add admin feedback to a report
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string; date: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is an admin
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const { userId, date } = params;

    // Validate request body with Zod
    const FeedbackSchema = z.object({
      adminFeedback: z.string(),
      adminReviewed: z.boolean().default(true),
      reportIndex: z.number().optional() // Add optional reportIndex field
    });

    const body = await request.json();
    const validatedData = FeedbackSchema.parse(body);

    // Format the date string to a Date object (assuming date format YYYY-MM-DD)
    const reportDate = new Date(date);
    
    // Query conditions for finding the report
    const queryCondition: any = {
      userId,
      date: reportDate
    };
    
    // If reportIndex is provided, include it in the search
    if (validatedData.reportIndex !== undefined) {
      queryCondition.reportIndex = validatedData.reportIndex;
    }
    
    // Check if report exists
    const existingReport = await prisma.dailyReport.findFirst({
      where: queryCondition
    });

    if (!existingReport) {
      return NextResponse.json({ error: 'レポートが見つかりません' }, { status: 404 });
    }

    // Update the report with admin feedback
    const updatedReport = await prisma.dailyReport.update({
      where: {
        id: existingReport.id
      },
      data: {
        adminFeedback: validatedData.adminFeedback,
        adminReviewed: validatedData.adminReviewed
      }
    });

    try {
      // Create a notification for the user
      await prisma.notification.create({
        data: {
          userId,
          type: 'REPORT_FEEDBACK',
          title: '日報フィードバック',
          message: `管理者があなたの${date}の日報にフィードバックを提供しました。`,
          read: false,
          linkUrl: `/reports?date=${date}`,
          data: JSON.stringify({ reportId: updatedReport.id })
        }
      });
    } catch (notificationError) {
      console.error('Error creating feedback notification:', notificationError);
      // Continue with the response even if notification creation fails
    }

    return NextResponse.json({
      message: 'フィードバックが保存されました',
      report: {
        id: updatedReport.id,
        date: updatedReport.date,
        adminFeedback: updatedReport.adminFeedback,
        adminReviewed: updatedReport.adminReviewed
      }
    });

  } catch (error) {
    console.error('Error saving admin feedback:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '無効なデータ形式です', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'フィードバックの保存に失敗しました' },
      { status: 500 }
    );
  }
} 