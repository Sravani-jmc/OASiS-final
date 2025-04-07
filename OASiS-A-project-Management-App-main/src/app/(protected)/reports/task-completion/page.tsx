'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';

// Import Chart.js dynamically on the client side
const ChartLoader = dynamic(() => import('@/components/charts/ChartLoader'), { ssr: false });

interface TaskCompletionData {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  averageCompletionTime: string;
  tasksCompletedByDay: {
    labels: string[];
    data: number[];
  };
  tasksByCategory: {
    labels: string[];
    data: number[];
  };
  tasksByUser: {
    labels: string[];
    data: number[];
  };
  recentlyCompletedTasks: {
    id: number;
    title: string;
    completedBy: string;
    completedAt: string;
    project: string;
  }[];
}

export default function TaskCompletionReportPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<TaskCompletionData | null>(null);
  const [timeRange, setTimeRange] = useState('week'); // 'week', 'month', 'quarter', 'year'
  
  // Fetch report data
  useEffect(() => {
    const fetchReportData = async () => {
      setIsLoading(true);
      try {
        // Add timestamp to prevent browser caching
        const timestamp = new Date().getTime();
      
        // Fetch tasks data
        const tasksResponse = await fetch(`/api/tasks?t=${timestamp}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        
        if (!tasksResponse.ok) {
          throw new Error('Failed to fetch tasks data');
        }
        
        const tasksData = await tasksResponse.json();
        
        // Fetch users data for contributors
        const usersResponse = await fetch(`/api/users?t=${timestamp}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        
        if (!usersResponse.ok) {
          throw new Error('Failed to fetch users data');
        }
        
        const usersData = await usersResponse.json();
        
        // Calculate time range filter based on selected timeRange
        const endDate = new Date();
        let startDate = new Date();
        
        if (timeRange === 'week') {
          startDate.setDate(endDate.getDate() - 7);
        } else if (timeRange === 'month') {
          startDate.setMonth(endDate.getMonth() - 1);
        } else if (timeRange === 'quarter') {
          startDate.setMonth(endDate.getMonth() - 3);
        } else if (timeRange === 'year') {
          startDate.setFullYear(endDate.getFullYear() - 1);
        }
        
        // Filter tasks based on time range
        const timeRangeTasks = tasksData.filter((task: any) => {
          const taskDate = task.completedAt ? new Date(task.completedAt) : null;
          return taskDate && taskDate >= startDate && taskDate <= endDate;
        });
        
        // Calculate completion metrics
        const completedTasks = tasksData.filter((t: any) => t.status === 'completed').length;
        const totalTasks = tasksData.length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        // Calculate average completion time
        const completedTasksWithDates = tasksData.filter((t: any) => 
          t.status === 'completed' && t.completedAt && t.createdAt
        );
        
        let avgCompletionTimeInDays = 0;
        let avgCompletionTimeStr = '';
        if (completedTasksWithDates.length > 0) {
          const totalCompletionTime = completedTasksWithDates.reduce((total: number, task: any) => {
            const createdDate = new Date(task.createdAt).getTime();
            const completedDate = new Date(task.completedAt).getTime();
            return total + (completedDate - createdDate);
          }, 0);
          
          avgCompletionTimeInDays = Math.round((totalCompletionTime / completedTasksWithDates.length) / (1000 * 60 * 60 * 24) * 10) / 10;
          
          // Format the time based on Japanese conventions
          if (avgCompletionTimeInDays < 1) {
            // Convert to hours if less than a day
            const hours = Math.round((avgCompletionTimeInDays * 24) * 10) / 10;
            avgCompletionTimeStr = `${hours} 時間`;
          } else {
            avgCompletionTimeStr = `${avgCompletionTimeInDays} 日`;
          }
        } else {
          avgCompletionTimeStr = '- 日';
        }
        
        // Get tasks completed by day of week
        const dayLabels = ['月', '火', '水', '木', '金', '土', '日'];
        const dayCount = [0, 0, 0, 0, 0, 0, 0]; // Mon to Sun
        
        completedTasksWithDates.forEach((task: any) => {
          const completedDate = new Date(task.completedAt);
          // getDay returns 0 for Sunday, so we adjust to get Monday as 0
          const dayOfWeek = completedDate.getDay() === 0 ? 6 : completedDate.getDay() - 1;
          dayCount[dayOfWeek]++;
        });
        
        // Group tasks by category
        const categoryMap: {[key: string]: number} = {};
        tasksData.filter((t: any) => t.status === 'completed').forEach((task: any) => {
          const category = task.category || 'その他';
          categoryMap[category] = (categoryMap[category] || 0) + 1;
        });
        
        const topCategories = Object.entries(categoryMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        // Group tasks by user
        const userTaskMap: {[key: string]: number} = {};
        const userNameMap: {[key: string]: string} = {};
        
        usersData.forEach((user: any) => {
          userNameMap[user.id] = user.fullName || user.username;
        });
        
        tasksData
          .filter((t: any) => t.status === 'completed' && t.assigneeId)
          .forEach((task: any) => {
            const userId = task.assigneeId;
            if (userId && userNameMap[userId]) {
              userTaskMap[userNameMap[userId]] = (userTaskMap[userNameMap[userId]] || 0) + 1;
            }
          });
        
        const topUsers = Object.entries(userTaskMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        // Get recently completed tasks
        const recentlyCompletedTasks = tasksData
          .filter((t: any) => t.status === 'completed' && t.completedAt)
          .sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
          .slice(0, 5)
          .map((task: any) => {
            const completedDate = new Date(task.completedAt);
            const now = new Date();
            const diffInDays = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
            
            let timeDescription;
            if (diffInDays === 0) {
              timeDescription = '今日';
            } else if (diffInDays === 1) {
              timeDescription = '昨日';
            } else {
              timeDescription = `${diffInDays}日前`;
            }
            
            return {
              id: task.id,
              title: task.title,
              completedBy: userNameMap[task.assigneeId] || 'Unknown User',
              completedAt: timeDescription,
              project: task.projectName || '未分類',
            };
          });
        
        // Format the final report data
        const formattedReportData: TaskCompletionData = {
          totalTasks,
          completedTasks,
          completionRate,
          averageCompletionTime: avgCompletionTimeStr,
        tasksCompletedByDay: {
            labels: dayLabels,
            data: dayCount,
        },
        tasksByCategory: {
            labels: topCategories.map(([name]) => name),
            data: topCategories.map(([_, count]) => count),
          },
          tasksByUser: {
            labels: topUsers.length > 0 ? topUsers.map(([name]) => name) : [t('dashboard.noData')],
            data: topUsers.length > 0 ? topUsers.map(([_, count]) => count) : [0],
          },
          recentlyCompletedTasks,
        };
        
        setReportData(formattedReportData);
      } catch (error) {
        console.error('Error fetching report data:', error);
        // If there's an error, fall back to empty data structure
        setReportData({
          totalTasks: 0,
          completedTasks: 0,
          completionRate: 0,
          averageCompletionTime: '- 日',
          tasksCompletedByDay: {
            labels: ['月', '火', '水', '木', '金', '土', '日'],
            data: [0, 0, 0, 0, 0, 0, 0],
          },
          tasksByCategory: {
            labels: [],
            data: [],
          },
          tasksByUser: {
            labels: [t('dashboard.noData')],
            data: [0],
          },
          recentlyCompletedTasks: [],
        });
      } finally {
      setIsLoading(false);
      }
    };
    
    fetchReportData();
    
    // Auto-refresh every 5 minutes
    const intervalId = setInterval(() => {
      fetchReportData();
    }, 300000);
    
    return () => clearInterval(intervalId);
  }, [timeRange]);
  
  // Prepare chart data
  const tasksCompletedByDayData = reportData ? {
    labels: reportData.tasksCompletedByDay.labels,
    datasets: [
      {
        label: t('dashboard.tasksCompleted'),
        data: reportData.tasksCompletedByDay.data,
        backgroundColor: 'rgba(79, 70, 229, 0.2)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  } : null;
  
  const tasksByCategoryData = reportData ? {
    labels: reportData.tasksByCategory.labels,
    datasets: [
      {
        data: reportData.tasksByCategory.data,
        backgroundColor: ['#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff', '#a5b4fc'],
        borderColor: ['#4338ca', '#6366f1', '#a5b4fc', '#c7d2fe', '#818cf8'],
        borderWidth: 1,
      },
    ],
  } : null;
  
  const tasksByUserData = reportData ? {
    labels: reportData.tasksByUser.labels,
    datasets: [
      {
        label: t('dashboard.tasksCompleted'),
        data: reportData.tasksByUser.data,
        backgroundColor: ['#84cc16', '#4f46e5', '#f97316', '#ef4444', '#8b5cf6'],
        borderColor: ['#84cc16', '#4f46e5', '#f97316', '#ef4444', '#8b5cf6'],
        borderWidth: 1,
      },
    ],
  } : null;
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-500">{t('app.loading')}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="dashboard jp-pattern-1">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => router.back()} 
          className="mr-4 p-2 rounded-full hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.taskCompletionReport')}</h1>
      </div>
      
      {/* Time range selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button 
          className={`px-4 py-2 rounded-full text-sm font-medium ${timeRange === 'week' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}
          onClick={() => setTimeRange('week')}
        >
          {t('timeRange.week')}
        </button>
        <button 
          className={`px-4 py-2 rounded-full text-sm font-medium ${timeRange === 'month' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}
          onClick={() => setTimeRange('month')}
        >
          {t('timeRange.month')}
        </button>
        <button 
          className={`px-4 py-2 rounded-full text-sm font-medium ${timeRange === 'quarter' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}
          onClick={() => setTimeRange('quarter')}
        >
          {t('timeRange.quarter')}
        </button>
        <button 
          className={`px-4 py-2 rounded-full text-sm font-medium ${timeRange === 'year' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}
          onClick={() => setTimeRange('year')}
        >
          {t('timeRange.year')}
        </button>
      </div>
      
      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card stat-primary">
          <div className="flex justify-between items-start">
            <p className="stat-label">{t('dashboard.tasksCompleted')}</p>
            <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="stat-value">{reportData?.completedTasks}</p>
          <div className="stat-change stat-neutral">
            <span>{t('dashboard.outOf')} {reportData?.totalTasks} {t('dashboard.totalTasks')}</span>
          </div>
        </div>
        
        <div className="stat-card stat-secondary">
          <div className="flex justify-between items-start">
            <p className="stat-label">{t('dashboard.completionRate')}</p>
            <ChartBarIcon className="h-5 w-5 text-purple-600" />
          </div>
          <p className="stat-value">{reportData?.completionRate}%</p>
          <div className="progress-container">
            <div 
              className="progress-bar progress-purple" 
              style={{ width: `${reportData?.completionRate || 0}%` }}
            ></div>
          </div>
        </div>
        
        <div className="stat-card stat-success">
          <div className="flex justify-between items-start">
            <p className="stat-label">{t('dashboard.avgCompletionTime')}</p>
            <ClockIcon className="h-5 w-5 text-green-600" />
          </div>
          <p className="stat-value">{reportData?.averageCompletionTime}</p>
          <div className="stat-change stat-neutral">
            <span>{t('dashboard.perTask')}</span>
          </div>
        </div>
        
        <div className="stat-card stat-warning">
          <div className="flex justify-between items-start">
            <p className="stat-label">{t('dashboard.topContributor')}</p>
            <UserIcon className="h-5 w-5 text-sakura-600" />
          </div>
          <p className="stat-value">
            {reportData?.tasksByUser.labels[0] !== t('dashboard.noData') 
              ? reportData?.tasksByUser.labels[0] 
              : t('dashboard.noData')}
          </p>
          <div className="stat-change stat-neutral">
            <span>
              {reportData?.tasksByUser.labels[0] !== t('dashboard.noData') 
                ? `${reportData?.tasksByUser.data[0]} ${t('dashboard.tasksCompleted')}` 
                : ''}
            </span>
          </div>
        </div>
      </div>
      
      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tasks Completed By Day Chart */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">{t('reports.tasksCompletedByDay')}</h3>
          </div>
          <div className="dashboard-card-body">
            <div className="chart-container">
              {tasksCompletedByDayData && <ChartLoader type="line" data={tasksCompletedByDayData} />}
            </div>
          </div>
        </div>
        
        {/* Tasks By Category Chart */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">{t('reports.tasksByCategory')}</h3>
          </div>
          <div className="dashboard-card-body">
            <div className="chart-container">
              {tasksByCategoryData && <ChartLoader type="doughnut" data={tasksByCategoryData} />}
            </div>
          </div>
        </div>
        
        {/* Tasks By User Chart */}
        <div className="dashboard-card lg:col-span-2">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">{t('reports.tasksByUser')}</h3>
          </div>
          <div className="dashboard-card-body">
            <div className="chart-container">
              {tasksByUserData && <ChartLoader type="bar" data={tasksByUserData} />}
            </div>
          </div>
        </div>
      </div>
      
      {/* Recently Completed Tasks */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <h3 className="dashboard-card-title">{t('reports.recentlyCompletedTasks')}</h3>
        </div>
        <div className="dashboard-card-body p-0">
          <div className="divide-y divide-gray-100">
            {reportData?.recentlyCompletedTasks.map((task) => (
              <div key={task.id} className="flex items-start p-4 hover:bg-gray-50 transition-colors">
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  <div className="flex items-center mt-1">
                    <UserIcon className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-500 mr-3">{task.completedBy}</span>
                    <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-500 mr-3">{task.completedAt}</span>
                    <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                      {task.project}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 