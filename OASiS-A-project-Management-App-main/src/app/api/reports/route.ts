import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Define interface for report data
interface ReportData {
  date: Date;
  userId: string;
  completed: string[];
  inProgress: string[];
  issues: string[];
  tomorrow: string[];
  project: string;
  status: string;
  projectId?: string;
  taskIds: string[];
  userFeedback: string | null;
  adminFeedback: string | null;
  adminReviewed: boolean;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  reportIndex?: number; // Adding reportIndex to track multiple reports per day
}

// GET /api/reports - Get all reports for the current user or specified user (for admins)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('Unauthorized GET request to /api/reports');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || session.user.id;
    
    // Check if the user has permission to view reports for this user
    if (userId !== session.user.id && !session.user.isAdmin) {
      console.log('Permission denied for GET request to /api/reports');
      return NextResponse.json({ 
        error: 'Permission denied', 
        message: 'You can only view your own reports',
        requestedUserId: userId,
        yourUserId: session.user.id,
        isAdmin: session.user.isAdmin || false
      }, { status: 403 });
    }

    console.log('Fetching reports for user:', userId);

    try {
      // Use Prisma client to query the reports
      const reports = await prisma.dailyReport.findMany({
        where: {
          userId: userId
        },
        orderBy: [
          { date: 'desc' }
        ],
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true
            }
          }
        }
      });

      console.log('Found reports:', reports.length);

      // Format the reports as a dictionary keyed by date
      const formattedReports: Record<string, any> = {};
      
      // Group reports by date
      reports.forEach((report) => {
        // Format the date as YYYY-MM-DD
        const dateKey = report.date.toISOString().split('T')[0];
        
        // Parse JSON string fields to arrays
        const parsedReport = {
          ...report,
          completed: JSON.parse(report.completed || '[]'),
          inProgress: JSON.parse(report.inProgress || '[]'),
          issues: JSON.parse(report.issues || '[]'),
          tomorrow: JSON.parse(report.tomorrow || '[]'),
          taskIds: JSON.parse(report.taskIds || '[]'),
          date: report.date
        };
        
        // If we already have a report for this date, convert to array
        if (formattedReports[dateKey]) {
          if (Array.isArray(formattedReports[dateKey])) {
            // Already an array, add to it
            formattedReports[dateKey].push(parsedReport);
          } else {
            // Convert single report to array
            formattedReports[dateKey] = [formattedReports[dateKey], parsedReport];
          }
        } else {
          // First report for this date
          formattedReports[dateKey] = parsedReport;
        }
      });

      return NextResponse.json({ [userId]: formattedReports });
    } catch (dbError) {
      console.error('Database error when fetching reports:', dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: String(dbError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

// Function to create a daily log entry for a report
const createDailyLogForReport = async (userId: string, reportDate: Date, isNew: boolean, project: string) => {
  try {
    // Format the date for the description
    const formattedDate = reportDate.toISOString().split('T')[0];
    
    // Generate a description based on whether this is a new report or an update
    const description = isNew 
      ? `プロジェクト「${project}」の日報を作成しました（${formattedDate}）`
      : `プロジェクト「${project}」の日報を更新しました（${formattedDate}）`;
    
    // Create the daily log entry
    const log = await prisma.dailyLog.create({
      data: {
        date: reportDate,
        startTime: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }), // Current time as start with proper Japanese format
        endTime: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }), // Current time as end with proper Japanese format
        description: description,
        category: 'documentation', // Use documentation as the category for reports
        completed: true, // Mark as completed
        userId: userId,
      },
    });
    
    console.log('Created daily log entry for report:', log);
    return log;
  } catch (error) {
    console.error('Error creating daily log for report:', error);
    // Don't throw error to prevent it from breaking the report creation
    return null;
  }
};

// POST /api/reports - Create or update a report
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('Unauthorized POST request to /api/reports');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const singleReportSchema = z.object({
      userId: z.string(),
      date: z.string(),
      reportIndex: z.number().optional(), // Add optional reportIndex
      report: z.object({
        completed: z.array(z.string()),
        inProgress: z.array(z.string()),
        issues: z.array(z.string()),
        tomorrow: z.array(z.string()),
        project: z.string(),
        status: z.string(),
        userId: z.string(),
        projectId: z.string().optional(),
        taskIds: z.array(z.string()).optional(),
        userFeedback: z.string().nullable().optional(),
        adminFeedback: z.string().nullable().optional(),
        adminReviewed: z.boolean().optional(),
        reportIndex: z.number().optional(), // Add reportIndex to report data
      }),
    });
    
    // Parse the request body
    const data = await request.json();
    
    // Check if the report field is an array
    const isReportArray = Array.isArray(data.report);
    
    if (isReportArray) {
      // Handle array of reports - this is not allowed for new submissions but may come from client
      console.log('Received array of reports - processing individually');
      
      // Simply process the first report for now
      if (data.report.length > 0) {
        const firstReport = data.report[0];
        const reportData = {
          userId: data.userId,
          date: data.date,
          reportIndex: firstReport.reportIndex, 
          report: firstReport
        };
        
        const validationResult = singleReportSchema.safeParse(reportData);
        
        if (!validationResult.success) {
          console.error('Invalid report data:', validationResult.error);
          return NextResponse.json(
            { error: 'Invalid data', details: validationResult.error.format() },
            { status: 400 }
          );
        }
        
        // Process this single report
        const { userId, date, reportIndex, report } = validationResult.data;
        
        // Continue with the same processing logic as for a single report
        // Check if the user has permission to create/update reports for this user
        if (userId !== session.user.id && !session.user.isAdmin) {
          console.log('Permission denied for POST request to /api/reports');
          return NextResponse.json({ 
            error: 'Permission denied', 
            message: 'You can only create or update your own reports',
            requestUserId: userId,
            sessionUserId: session.user.id
          }, { status: 403 });
        }

        console.log('Creating/updating report for user:', userId, 'on date:', date, 'with reportIndex:', reportIndex);

        const reportDate = new Date(date);
        
        try {
          // Check if the report already exists using Prisma client, including reportIndex in the query
          const queryCondition: { userId: string; date: Date; reportIndex?: number } = {
            userId: userId,
            date: reportDate,
          };
          
          // If reportIndex is provided, include it in the search
          if (reportIndex !== undefined) {
            queryCondition.reportIndex = reportIndex;
          }
          
          const existingReport = await prisma.dailyReport.findFirst({
            where: queryCondition
          });
          
          console.log('Existing report:', existingReport);

          let result;
          let isNewReport = false;
          
          if (existingReport) {
            // Update existing report using Prisma client
            console.log('Updating existing report');
            result = await prisma.dailyReport.update({
              where: {
                id: existingReport.id
              },
              data: {
                completed: JSON.stringify(report.completed),
                inProgress: JSON.stringify(report.inProgress),
                issues: JSON.stringify(report.issues),
                tomorrow: JSON.stringify(report.tomorrow),
                project: report.project,
                status: report.status,
                projectId: report.projectId || null,
                taskIds: JSON.stringify(report.taskIds || []),
                userFeedback: report.userFeedback || null,
                adminFeedback: report.adminFeedback || null,
                adminReviewed: report.adminReviewed || false,
                updatedAt: new Date()
              }
            });
          } else {
            // For new reports, calculate the reportIndex if not provided
            let newReportIndex = reportIndex;
            
            if (newReportIndex === undefined) {
              // Find the highest reportIndex for this user and date
              const existingReports = await prisma.dailyReport.findMany({
                where: {
                  userId: userId,
                  date: reportDate
                },
                orderBy: {
                  reportIndex: 'desc'
                },
                take: 1
              });
              
              // Set the new index to be one more than the highest, or 0 if none exist
              newReportIndex = existingReports.length > 0 && existingReports[0].reportIndex !== null
                ? (existingReports[0].reportIndex || 0) + 1  // Increment to the next index
                : 0; // Start at 0 if no reports exist
            }
            
            // Create new report using Prisma client
            console.log('Creating new report with reportIndex:', newReportIndex);
            isNewReport = true;
            
            // Use type assertion to bypass type checking since our schema has the field but types haven't been updated
            const createData: any = {
              userId: userId,
              date: reportDate,
              completed: JSON.stringify(report.completed),
              inProgress: JSON.stringify(report.inProgress),
              issues: JSON.stringify(report.issues),
              tomorrow: JSON.stringify(report.tomorrow),
              project: report.project,
              status: report.status,
              projectId: report.projectId || null,
              taskIds: JSON.stringify(report.taskIds || []),
              userFeedback: report.userFeedback || null,
              adminFeedback: report.adminFeedback || null,
              adminReviewed: report.adminReviewed || false,
              reportIndex: newReportIndex
            };
            
            result = await prisma.dailyReport.create({
              data: createData
            });
          }

          // Create a daily log entry for this report action
          await createDailyLogForReport(userId, reportDate, isNewReport, report.project);

          console.log('Report saved successfully:', result);
          return NextResponse.json(result);
        } catch (dbError) {
          console.error('Database error when saving report:', dbError);
          return NextResponse.json({ 
            error: 'Database error', 
            details: String(dbError) 
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: 'Empty report array provided' }, { status: 400 });
      }
    } else {
      // Standard single report processing
      const validationResult = singleReportSchema.safeParse(data);
    
    if (!validationResult.success) {
      console.error('Invalid report data:', validationResult.error);
      return NextResponse.json(
        { error: 'Invalid data', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { userId, date, reportIndex, report } = validationResult.data;

    // Check if the user has permission to create/update reports for this user
    if (userId !== session.user.id && !session.user.isAdmin) {
      console.log('Permission denied for POST request to /api/reports');
      return NextResponse.json({ 
        error: 'Permission denied', 
        message: 'You can only create or update your own reports',
        requestUserId: userId,
        sessionUserId: session.user.id
      }, { status: 403 });
    }

    console.log('Creating/updating report for user:', userId, 'on date:', date, 'with reportIndex:', reportIndex);

    const reportDate = new Date(date);
    
    try {
      // Check if the report already exists using Prisma client, including reportIndex in the query
      const queryCondition: { userId: string; date: Date; reportIndex?: number } = {
        userId: userId,
        date: reportDate,
      };
      
      // If reportIndex is provided, include it in the search
      if (reportIndex !== undefined) {
        queryCondition.reportIndex = reportIndex;
      }
      
      const existingReport = await prisma.dailyReport.findFirst({
        where: queryCondition
      });
      
      console.log('Existing report:', existingReport);

      let result;
      let isNewReport = false;
      
      if (existingReport) {
        // Update existing report using Prisma client
        console.log('Updating existing report');
        result = await prisma.dailyReport.update({
          where: {
            id: existingReport.id
          },
          data: {
            completed: JSON.stringify(report.completed),
            inProgress: JSON.stringify(report.inProgress),
            issues: JSON.stringify(report.issues),
            tomorrow: JSON.stringify(report.tomorrow),
            project: report.project,
            status: report.status,
            projectId: report.projectId || null,
            taskIds: JSON.stringify(report.taskIds || []),
            userFeedback: report.userFeedback || null,
            adminFeedback: report.adminFeedback || null,
            adminReviewed: report.adminReviewed || false,
            updatedAt: new Date()
          }
        });
      } else {
        // For new reports, calculate the reportIndex if not provided
        let newReportIndex = reportIndex;
        
        if (newReportIndex === undefined) {
          // Find the highest reportIndex for this user and date
          const existingReports = await prisma.dailyReport.findMany({
            where: {
              userId: userId,
              date: reportDate
            },
              orderBy: {
                reportIndex: 'desc'
              },
            take: 1
          });
          
          // Set the new index to be one more than the highest, or 0 if none exist
            newReportIndex = existingReports.length > 0 && existingReports[0].reportIndex !== null
              ? (existingReports[0].reportIndex || 0) + 1  // Increment to the next index
            : 0; // Start at 0 if no reports exist
        }
        
        // Create new report using Prisma client
        console.log('Creating new report with reportIndex:', newReportIndex);
        isNewReport = true;
        
        // Use type assertion to bypass type checking since our schema has the field but types haven't been updated
        const createData: any = {
          userId: userId,
          date: reportDate,
          completed: JSON.stringify(report.completed),
          inProgress: JSON.stringify(report.inProgress),
          issues: JSON.stringify(report.issues),
          tomorrow: JSON.stringify(report.tomorrow),
          project: report.project,
          status: report.status,
          projectId: report.projectId || null,
          taskIds: JSON.stringify(report.taskIds || []),
          userFeedback: report.userFeedback || null,
          adminFeedback: report.adminFeedback || null,
          adminReviewed: report.adminReviewed || false,
          reportIndex: newReportIndex
        };
        
        result = await prisma.dailyReport.create({
          data: createData
        });
      }

      // Create a daily log entry for this report action
      await createDailyLogForReport(userId, reportDate, isNewReport, report.project);

      console.log('Report saved successfully:', result);
      return NextResponse.json(result);
    } catch (dbError) {
      console.error('Database error when saving report:', dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: String(dbError) 
      }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Error saving report:', error);
    return NextResponse.json({ 
      error: 'Failed to save report', 
      details: String(error) 
    }, { status: 500 });
  }
}

// DELETE /api/reports - Delete a report
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('Unauthorized DELETE request to /api/reports');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the search params from the request URL
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const date = url.searchParams.get('date');
    const userId = url.searchParams.get('userId');
    const reportIndex = url.searchParams.get('reportIndex');
    
    // Check if we have the required parameters
    if (!id && (!date || !userId)) {
      return NextResponse.json({ 
        error: 'Missing parameters', 
        message: 'Either id OR date and userId parameters are required'
      }, { status: 400 });
    }
    
    // Ensure the user can only delete their own reports unless they're an admin
    if (userId && userId !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json({ 
        error: 'Permission denied', 
        message: 'You can only delete your own reports'
      }, { status: 403 });
    }
    
    try {
      let result;
      
      if (id) {
        // Delete using the direct ID
        const reportToDelete = await prisma.dailyReport.findUnique({
          where: { id: id }
        });
        
        // Check if the user has permission to delete this report
        if (reportToDelete && reportToDelete.userId !== session.user.id && !session.user.isAdmin) {
          return NextResponse.json({ 
            error: 'Permission denied', 
            message: 'You can only delete your own reports'
          }, { status: 403 });
        }
        
        // Delete the report
        result = await prisma.dailyReport.delete({
          where: { id: id }
        });
      } else {
        // Delete using date, userId, and optionally reportIndex
        const whereClause: { userId: string; date: Date; reportIndex?: number } = {
          userId: userId!,
          date: new Date(date!),
        };
        
        // If reportIndex is provided, include it in the query
        if (reportIndex !== null && reportIndex !== undefined) {
          whereClause.reportIndex = parseInt(reportIndex);
        }
        
        // Find the specific report(s) to delete
        const reportsToDelete = await prisma.dailyReport.findMany({
          where: whereClause
        });
        
        if (reportsToDelete.length === 0) {
          return NextResponse.json({ 
            error: 'Not found', 
            message: 'No reports found with the provided parameters'
          }, { status: 404 });
        }
        
        // Delete only the specific report(s) matching the query
        result = await prisma.dailyReport.deleteMany({
          where: whereClause
        });
      }
      
      console.log('Report deletion result:', result);
      return NextResponse.json({ success: true, deletedCount: result.count || 1 });
    } catch (dbError) {
      console.error('Database error when deleting report:', dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: String(dbError) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json({ 
      error: 'Failed to delete report', 
      details: String(error) 
    }, { status: 500 });
  }
} 