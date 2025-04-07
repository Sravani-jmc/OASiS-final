'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  ChartBarIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BoltIcon,
  UserGroupIcon,
  FolderIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  EyeIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

// Import Chart.js dynamically on the client side
import dynamic from 'next/dynamic';
const ChartLoader = dynamic(
  () => import('@/components/charts/ChartLoader'),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-60 w-full"></div>
  }
);

// Define interfaces for the data structures
interface Stats {
  completedTasks: number;
  totalTasks: number;
  activeProjects: number;
  teamMembers: number;
}

interface ActivityItem {
  id: number;
  user: string;
  action: string;
  target: string;
  time: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconBg: string;
  iconColor: string;
}

interface TaskItem {
  id: number;
  title: string;
  dueDate: string;
  priority: string;
  project: string;
}

interface DeadlineItem {
  id: string | number;
  title: string;
  dueDate: string;
  daysRemaining: number;
  type: 'project' | 'task';
  priority?: string;
  status?: string;
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    completedTasks: 0,
    totalTasks: 0,
    activeProjects: 0,
    teamMembers: 0,
  });
  const [trends, setTrends] = useState({
    completedTasksChange: { value: 0, isIncrease: true },
    activeProjectsChange: { value: 0, isIncrease: true },
    teamMembersChange: { value: 0, isIncrease: true },
    taskCompletionRateChange: { value: 0, isIncrease: true }
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TaskItem[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<DeadlineItem[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [dashboardConfig, setDashboardConfig] = useState({
    showProjects: true,
    showTasks: true,
    showActivity: true,
    showUpcomingTasks: true,
    showWeeklyActivity: true,
    showDeadlines: true,
  });
  
  // State for chart data
  const [projectProgressData, setProjectProgressData] = useState({
    labels: [],
    datasets: [
      {
        label: t('dashboard.progress'),
        data: [],
        backgroundColor: ['#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff'],
        borderColor: ['#4338ca', '#6366f1', '#a5b4fc', '#c7d2fe'],
        borderWidth: 1,
      },
    ],
  });
  
  const [taskCompletionData, setTaskCompletionData] = useState({
    labels: [
      t('status.completed'), 
      t('status.inProgress'), 
      t('status.notStarted'), 
      t('status.onHold')
    ],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: ['#84cc16', '#4f46e5', '#f97316', '#ef4444'],
        borderColor: ['#84cc16', '#4f46e5', '#f97316', '#ef4444'],
        borderWidth: 1,
      },
    ],
  });
  
  const [weeklyActivityData, setWeeklyActivityData] = useState({
    labels: ['月', '火', '水', '木', '金', '土', '日'],
    datasets: [
      {
        label: t('dashboard.tasksCompleted'),
        data: [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(79, 70, 229, 0.2)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  });
  
  // Format date as YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Function to load dashboard data
  const loadData = async () => {
    setIsLoading(true);
    
    try {
      // Store stats here to update once at the end
      let newStats = {
        completedTasks: 0,
        totalTasks: 0,
        activeProjects: 0,
        teamMembers: 0,
      };
      
      // Variables to store trend data
      let newTrends = {
        completedTasksChange: { value: 0, isIncrease: true },
        activeProjectsChange: { value: 0, isIncrease: true },
        teamMembersChange: { value: 0, isIncrease: true },
        taskCompletionRateChange: { value: 0, isIncrease: true }
      };
      
      // Variable to store project deadlines
      let allProjectDeadlines: DeadlineItem[] = [];
      
      // Add timestamp to prevent browser caching
      const timestamp = new Date().getTime();
      
      // Load projects data
      const projectsResponse = await fetch(`/api/projects?t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        
        // Calculate project stats
        const currentActiveProjects = projectsData.filter((p: any) => p.status === 'in_progress' || p.status === 'active').length;
        newStats.activeProjects = currentActiveProjects;
        
        // Get previous month's projects for trend calculation
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        // Calculate projects created in the last month
        const newProjectsThisMonth = projectsData.filter((p: any) => {
          const createdDate = new Date(p.createdAt);
          return createdDate >= oneMonthAgo;
        }).length;
        
        newTrends.activeProjectsChange = { 
          value: newProjectsThisMonth, 
          isIncrease: newProjectsThisMonth > 0 
        };
        
        // Format project progress data for chart
        const topProjects = projectsData.slice(0, 4);
        const progressData = {
          labels: topProjects.map((p: any) => p.name),
          datasets: [{
            label: t('dashboard.progress'),
            // Calculate completion percentage based on tasks or time
            data: topProjects.map((p: any) => {
              const startDate = new Date(p.startDate).getTime();
              const endDate = new Date(p.endDate).getTime();
              const today = Date.now();
              
              // Calculate time-based progress
              if (today < startDate) return 0;
              if (today > endDate) return 100;
              
              return Math.round(((today - startDate) / (endDate - startDate)) * 100);
            }),
            backgroundColor: ['#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff'],
            borderColor: ['#4338ca', '#6366f1', '#a5b4fc', '#c7d2fe'],
            borderWidth: 1,
          }]
        };
        setProjectProgressData(progressData);
        
        // Add collection of upcoming project deadlines
        const today = new Date();
        const projectDeadlines = projectsData
          .filter((p: any) => {
            const endDate = new Date(p.endDate);
            // Filter projects that are not completed and have an end date in the future or within the past 7 days
            return p.status !== 'completed' && 
                   endDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          })
          .map((p: any) => {
            const endDate = new Date(p.endDate);
            const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
            
            return {
              id: p.id,
              title: p.name || p.title,
              dueDate: endDate.toLocaleDateString('ja-JP'),
              daysRemaining,
              type: 'project' as const,
              status: p.status
            };
          })
          .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);
          
          // Store temporarily to combine with task deadlines later
          allProjectDeadlines = projectDeadlines;
      }
      
      // Load tasks data
      const tasksResponse = await fetch(`/api/tasks?t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        
        // Update task stats
        const currentCompletedTasks = tasksData.filter((t: any) => t.status === 'completed').length;
        newStats.completedTasks = currentCompletedTasks;
        newStats.totalTasks = tasksData.length;
        
        // Get previous week's data for trend calculation
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        // Calculate completed tasks from last week for comparison
        const lastWeekCompletedTasks = tasksData.filter((t: any) => {
          const completedDate = new Date(t.completedAt || t.updatedAt);
          return t.status === 'completed' && completedDate < oneWeekAgo;
        }).length;
        
        // Calculate the change in completed tasks
        if (lastWeekCompletedTasks > 0) {
          const completedTasksChangePercent = Math.round(((currentCompletedTasks - lastWeekCompletedTasks) / lastWeekCompletedTasks) * 100);
          newTrends.completedTasksChange = {
            value: Math.abs(completedTasksChangePercent),
            isIncrease: completedTasksChangePercent > 0
          };
        }
        
        // Calculate previous month's completion rate
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const previousMonthTasks = tasksData.filter((t: any) => {
          const createdDate = new Date(t.createdAt);
          return createdDate < oneMonthAgo;
        });
        
        const previousMonthCompletedTasks = previousMonthTasks.filter((t: any) => t.status === 'completed').length;
        const previousMonthCompletionRate = previousMonthTasks.length > 0 ? 
          Math.round((previousMonthCompletedTasks / previousMonthTasks.length) * 100) : 0;
        
        const currentCompletionRate = newStats.totalTasks > 0 ? 
          Math.round((newStats.completedTasks / newStats.totalTasks) * 100) : 0;
        
        // Calculate the change in completion rate
        if (previousMonthCompletionRate > 0) {
          const completionRateChange = currentCompletionRate - previousMonthCompletionRate;
          newTrends.taskCompletionRateChange = {
            value: Math.abs(completionRateChange),
            isIncrease: completionRateChange > 0
          };
        }
        
        // Update task completion by status chart
        const statusCounts = {
          completed: tasksData.filter((t: any) => t.status === 'completed').length,
          in_progress: tasksData.filter((t: any) => t.status === 'in_progress').length,
          not_started: tasksData.filter((t: any) => t.status === 'not_started' || t.status === 'todo').length,
          on_hold: tasksData.filter((t: any) => t.status === 'on_hold' || t.status === 'review').length,
        };
        
        const taskCompletionData = {
          labels: [
            t('status.completed'), 
            t('status.inProgress'), 
            t('status.notStarted'), 
            t('status.onHold')
          ],
          datasets: [{
            data: [
              statusCounts.completed,
              statusCounts.in_progress,
              statusCounts.not_started,
              statusCounts.on_hold
            ],
            backgroundColor: ['#84cc16', '#4f46e5', '#f97316', '#ef4444'],
            borderColor: ['#84cc16', '#4f46e5', '#f97316', '#ef4444'],
            borderWidth: 1,
          }]
        };
        setTaskCompletionData(taskCompletionData);
        
        // Update upcoming tasks list
        const upcomingTasksData = tasksData
          .filter((t: any) => t.status !== 'completed')
          .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5)
          .map((task: any) => ({
            id: task.id,
            title: task.title,
            dueDate: new Date(task.dueDate).toLocaleDateString('ja-JP'),
            priority: task.priority,
            project: task.projectName || t('common.noProject'),
          }));
        
        setUpcomingTasks(upcomingTasksData);
        
        // Add collection of upcoming task deadlines
        const today = new Date();
        const taskDeadlines = tasksData
          .filter((t: any) => {
            const dueDate = new Date(t.dueDate);
            // Filter tasks that are not completed and have a due date in the future or within the past 3 days
            return t.status !== 'completed' && 
                   dueDate >= new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
          })
          .map((t: any) => {
            const dueDate = new Date(t.dueDate);
            const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
            
            return {
              id: t.id,
              title: t.title,
              dueDate: dueDate.toLocaleDateString('ja-JP'),
              daysRemaining,
              type: 'task' as const,
              priority: t.priority,
              status: t.status
            };
          })
          .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);
        
        // Combine and sort all deadlines (project deadlines from earlier + task deadlines)
        const allDeadlines = [...(allProjectDeadlines || []), ...taskDeadlines]
          .sort((a, b) => a.daysRemaining - b.daysRemaining)
          .slice(0, 8); // Show up to 8 deadlines
        
        setUpcomingDeadlines(allDeadlines);
      }
      
      // Load team members
      const membersResponse = await fetch(`/api/users?t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        newStats.teamMembers = membersData.length;
        
        // Calculate new members in the last month
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const newMembersCount = membersData.filter((m: any) => {
          const joinDate = new Date(m.createdAt);
          return joinDate >= oneMonthAgo;
        }).length;
        
        newTrends.teamMembersChange = {
          value: newMembersCount,
          isIncrease: newMembersCount > 0
        };
      }
      
      // Update stats and trends at the end after all data is fetched
      setStats(newStats);
      setTrends(newTrends);
      
      // Load recent activity from daily logs
      const activityResponse = await fetch(`/api/daily-logs?limit=5&includeAllActivities=true&t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      if (activityResponse.ok) {
        const logsData = await activityResponse.json();
        
        // Format activity data
        const activityData = logsData.map((log: any) => {
          // Use the actual description for activities instead of mapping categories
          // This ensures we show the correct Japanese text from createActivityLog
          
          const iconMap: {[key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>>} = {
            'meeting': UserGroupIcon,
            'development': BoltIcon,
            'planning': DocumentTextIcon,
            'review': CheckCircleIcon,
            'research': EyeIcon,
            'documentation': DocumentTextIcon,
            'team': UserGroupIcon,
            'project': FolderIcon,
            'task': CheckCircleIcon,
            'other': CheckCircleIcon,
          };
          
          const bgColorMap: {[key: string]: string} = {
            'meeting': 'bg-purple-100',
            'development': 'bg-blue-100',
            'planning': 'bg-yellow-100',
            'review': 'bg-green-100',
            'research': 'bg-indigo-100',
            'documentation': 'bg-amber-100',
            'team': 'bg-purple-100',
            'project': 'bg-indigo-100',
            'task': 'bg-green-100',
            'other': 'bg-gray-100',
          };
          
          const textColorMap: {[key: string]: string} = {
            'meeting': 'text-purple-600',
            'development': 'text-blue-600',
            'planning': 'text-yellow-600',
            'review': 'text-green-600',
            'research': 'text-indigo-600',
            'documentation': 'text-amber-600',
            'team': 'text-purple-600',
            'project': 'text-indigo-600',
            'task': 'text-green-600',
            'other': 'text-gray-600',
          };
          
          // Calculate how long ago
          const timeAgo = (() => {
            const now = new Date();
            const createdAt = new Date(log.createdAt);
            const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
            
            if (diffInMinutes < 60) {
              return `${diffInMinutes}分前`;
            } else if (diffInMinutes < 1440) {
              return `${Math.floor(diffInMinutes / 60)}時間前`;
            } else {
              return `${Math.floor(diffInMinutes / 1440)}日前`;
            }
          })();
          
          return {
            id: log.id,
            user: log.user?.fullName || log.user?.username || 'Unknown User',
            // For automatically generated logs, we should just show the description directly
            action: '', // Empty string since the description contains the full action
            target: log.description, // Use the full description which includes the Japanese text
            time: timeAgo,
            icon: iconMap[log.category] || CheckCircleIcon,
            iconBg: bgColorMap[log.category] || 'bg-gray-100',
            iconColor: textColorMap[log.category] || 'text-gray-600',
          };
        });
        
        setRecentActivity(activityData);
      }
      
      // Calculate weekly activity (completed tasks per day)
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      
      const weeklyLogsResponse = await fetch(`/api/daily-logs?startDate=${formatDateString(weekStart)}&endDate=${formatDateString(today)}&t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      if (weeklyLogsResponse.ok) {
        const weeklyLogs = await weeklyLogsResponse.json();
        
        // Group by day of week
        const dayCount = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
        
        weeklyLogs.forEach((log: any) => {
          const logDate = new Date(log.date);
          const dayOfWeek = logDate.getDay(); // 0 = Sunday, 6 = Saturday
          dayCount[dayOfWeek]++;
        });
        
        // Adjust to Japanese week ordering (Mon-Sun)
        const jpDayCount = [...dayCount.slice(1), dayCount[0]];
        
        const weeklyData = {
          labels: ['月', '火', '水', '木', '金', '土', '日'],
          datasets: [{
            label: t('dashboard.tasksCompleted'),
            data: jpDayCount,
            backgroundColor: 'rgba(79, 70, 229, 0.2)',
            borderColor: 'rgba(79, 70, 229, 1)',
            borderWidth: 2,
            tension: 0.4,
          }]
        };
        
        setWeeklyActivityData(weeklyData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to manually refresh data
  const refreshDashboardData = () => {
    setIsLoading(true);
    // Clear the current stats before loading new data
    setStats({
      completedTasks: 0,
      totalTasks: 0,
      activeProjects: 0,
      teamMembers: 0,
    });
    // Load data immediately
    loadData();
  };
  
  // Load data from API endpoints
  useEffect(() => {
    loadData();
    
    // Clean up resources when component unmounts
    return () => {};
  }, []);  // Empty dependency array to run only once on mount

  // Handle navigations
  const navigateToCompletedTasks = () => {
    router.push('/tasks?filter=completed');
  };

  const navigateToActiveProjects = () => {
    router.push('/projects?filter=active');
  };

  const navigateToTeamMembers = () => {
    router.push('/members');
  };

  const navigateToTaskCompletion = () => {
    router.push('/reports/task-completion');
  };

  const viewTaskDetails = (taskId: number) => {
    router.push(`/tasks/${taskId}`);
  };
  
  // Show loading state
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
      {/* Welcome header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('dashboard.welcome')}</h1>
        <p className="text-gray-600">{new Date().toLocaleDateString('ja-JP', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refreshDashboardData}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                更新中...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                データを更新
              </>
            )}
          </button>
          <button 
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isCustomizing ? 'カスタマイズを完了' : 'ダッシュボードをカスタマイズ'}
          </button>
        </div>
      </div>
      
      {/* Customization options */}
      {isCustomizing && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-3">ダッシュボードをカスタマイズ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="showProjects" 
                checked={dashboardConfig.showProjects} 
                onChange={() => setDashboardConfig(prev => ({ ...prev, showProjects: !prev.showProjects }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="showProjects" className="text-sm text-gray-700">プロジェクト進捗を表示</label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="showTasks" 
                checked={dashboardConfig.showTasks} 
                onChange={() => setDashboardConfig(prev => ({ ...prev, showTasks: !prev.showTasks }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="showTasks" className="text-sm text-gray-700">タスク状況を表示</label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="showActivity" 
                checked={dashboardConfig.showActivity} 
                onChange={() => setDashboardConfig(prev => ({ ...prev, showActivity: !prev.showActivity }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="showActivity" className="text-sm text-gray-700">最近のアクティビティを表示</label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="showUpcomingTasks" 
                checked={dashboardConfig.showUpcomingTasks} 
                onChange={() => setDashboardConfig(prev => ({ ...prev, showUpcomingTasks: !prev.showUpcomingTasks }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="showUpcomingTasks" className="text-sm text-gray-700">予定タスクを表示</label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="showWeeklyActivity" 
                checked={dashboardConfig.showWeeklyActivity} 
                onChange={() => setDashboardConfig(prev => ({ ...prev, showWeeklyActivity: !prev.showWeeklyActivity }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="showWeeklyActivity" className="text-sm text-gray-700">週間アクティビティを表示</label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="showDeadlines" 
                checked={dashboardConfig.showDeadlines} 
                onChange={() => setDashboardConfig(prev => ({ ...prev, showDeadlines: !prev.showDeadlines }))}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="showDeadlines" className="text-sm text-gray-700">締め切り一覧を表示</label>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div 
          className="stat-card stat-primary cursor-pointer transition-transform hover:scale-105" 
          onClick={navigateToCompletedTasks}
          role="button"
          aria-label={t('dashboard.tasksCompleted')}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigateToCompletedTasks()}
        >
          <div className="flex justify-between items-start">
            <p className="stat-label">{t('dashboard.tasksCompleted')}</p>
            <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="stat-value">{stats.completedTasks}</p>
          <div className={`stat-change ${trends.completedTasksChange.isIncrease ? 'stat-increase' : 'stat-decrease'}`}>
            {trends.completedTasksChange.isIncrease ? 
              <ArrowUpIcon className="h-3 w-3 mr-1" /> : 
              <ArrowDownIcon className="h-3 w-3 mr-1" />
            }
            <span>{trends.completedTasksChange.value}% {t('dashboard.fromLastWeek')}</span>
          </div>
          <div className="progress-container">
            <div 
              className="progress-bar progress-indigo" 
              style={{ width: `${(stats.completedTasks / stats.totalTasks) * 100}%` }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-indigo-600 flex items-center justify-end">
            <EyeIcon className="h-3 w-3 mr-1" />
            <span>{t('action.view')}</span>
          </div>
        </div>
        
        <div 
          className="stat-card stat-secondary cursor-pointer transition-transform hover:scale-105" 
          onClick={navigateToActiveProjects}
          role="button"
          aria-label={t('dashboard.activeProjects')}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigateToActiveProjects()}
        >
          <div className="flex justify-between items-start">
            <p className="stat-label">{t('dashboard.activeProjects')}</p>
            <FolderIcon className="h-5 w-5 text-purple-600" />
          </div>
          <p className="stat-value">{stats.activeProjects}</p>
          <div className={`stat-change ${trends.activeProjectsChange.isIncrease ? 'stat-increase' : 'stat-decrease'}`}>
            {trends.activeProjectsChange.isIncrease ? 
              <ArrowUpIcon className="h-3 w-3 mr-1" /> : 
              <ArrowDownIcon className="h-3 w-3 mr-1" />
            }
            <span>{trends.activeProjectsChange.value} {t('dashboard.newThisMonth')}</span>
          </div>
          <div className="mt-2 text-xs text-purple-600 flex items-center justify-end">
            <EyeIcon className="h-3 w-3 mr-1" />
            <span>{t('action.view')}</span>
          </div>
        </div>
        
        <div 
          className="stat-card stat-success cursor-pointer transition-transform hover:scale-105" 
          onClick={navigateToTeamMembers}
          role="button"
          aria-label={t('dashboard.teamMembers')}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigateToTeamMembers()}
        >
          <div className="flex justify-between items-start">
            <p className="stat-label">{t('dashboard.teamMembers')}</p>
            <UserGroupIcon className="h-5 w-5 text-green-600" />
          </div>
          <p className="stat-value">{stats.teamMembers}</p>
          <div className={`stat-change ${trends.teamMembersChange.isIncrease ? 'stat-increase' : 'stat-decrease'}`}>
            {trends.teamMembersChange.isIncrease ? 
              <ArrowUpIcon className="h-3 w-3 mr-1" /> : 
              <ArrowDownIcon className="h-3 w-3 mr-1" />
            }
            <span>{trends.teamMembersChange.value} {t('dashboard.newMembers')}</span>
          </div>
          <div className="mt-2 text-xs text-green-600 flex items-center justify-end">
            <EyeIcon className="h-3 w-3 mr-1" />
            <span>{t('action.view')}</span>
          </div>
        </div>
        
        <div 
          className="stat-card stat-warning cursor-pointer transition-transform hover:scale-105" 
          onClick={navigateToTaskCompletion}
          role="button"
          aria-label={t('dashboard.taskCompletion')}
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigateToTaskCompletion()}
        >
          <div className="flex justify-between items-start">
            <p className="stat-label">{t('dashboard.taskCompletion')}</p>
            <BoltIcon className="h-5 w-5 text-sakura-600" />
          </div>
          <p className="stat-value">{Math.round((stats.completedTasks / stats.totalTasks) * 100)}%</p>
          <div className={`stat-change ${trends.taskCompletionRateChange.isIncrease ? 'stat-increase' : 'stat-decrease'}`}>
            {trends.taskCompletionRateChange.isIncrease ? 
              <ArrowUpIcon className="h-3 w-3 mr-1" /> : 
              <ArrowDownIcon className="h-3 w-3 mr-1" />
            }
            <span>{trends.taskCompletionRateChange.value}% {t('dashboard.fromLastMonth')}</span>
          </div>
          <div className="mt-2 text-xs text-sakura-600 flex items-center justify-end">
            <EyeIcon className="h-3 w-3 mr-1" />
            <span>{t('action.view')}</span>
          </div>
        </div>
      </div>
      
      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Project Progress Chart */}
        {dashboardConfig.showProjects && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">{t('dashboard.projectProgress')}</h3>
          </div>
          <div className="dashboard-card-body">
            <div className="chart-container">
              <ChartLoader type="bar" data={projectProgressData} />
            </div>
          </div>
          <div className="p-3 bg-gray-50 border-t border-gray-100">
            <Link href="/projects" className="text-sm text-indigo-600 font-medium flex items-center justify-center hover:text-indigo-500">
              {t('action.view')} {t('nav.projects')}
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        )}
        
        {/* Task Completion Chart */}
        {dashboardConfig.showTasks && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">{t('dashboard.taskStatus')}</h3>
          </div>
          <div className="dashboard-card-body">
            <div className="chart-container">
              <ChartLoader type="doughnut" data={taskCompletionData} />
            </div>
          </div>
          <div className="p-3 bg-gray-50 border-t border-gray-100">
            <Link href="/tasks" className="text-sm text-indigo-600 font-medium flex items-center justify-center hover:text-indigo-500">
              {t('action.view')} {t('nav.tasks')}
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        )}
        
        {/* Weekly Activity Chart */}
        {dashboardConfig.showWeeklyActivity && (
        <div className="dashboard-card lg:col-span-2">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">{t('dashboard.weeklyActivity')}</h3>
          </div>
          <div className="dashboard-card-body">
            <div className="chart-container">
              <ChartLoader type="line" data={weeklyActivityData} />
            </div>
          </div>
          <div className="p-3 bg-gray-50 border-t border-gray-100">
            <Link href="/reports" className="text-sm text-indigo-600 font-medium flex items-center justify-center hover:text-indigo-500">
              {t('action.view')} {t('nav.reports')}
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        )}
      </div>
      
      {/* Deadlines Section */}
      {dashboardConfig.showDeadlines && upcomingDeadlines.length > 0 && (
        <div className="mb-8">
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">
                <CalendarIcon className="h-5 w-5 mr-2 inline-block text-indigo-600" />
                締め切り一覧
              </h3>
            </div>
            <div className="dashboard-card-body p-0">
              <div className="divide-y divide-gray-100">
                {upcomingDeadlines.map((deadline) => (
                  <div 
                    key={`${deadline.type}-${deadline.id}`} 
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(
                      deadline.type === 'project' 
                        ? `/projects/${deadline.id}` 
                        : `/tasks/${deadline.id}`
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {deadline.type === 'project' ? (
                          <FolderIcon className="h-5 w-5 text-indigo-500 mr-2" />
                        ) : (
                          <DocumentTextIcon className="h-5 w-5 text-green-500 mr-2" />
                        )}
                        <h3 className="text-sm font-medium text-gray-900">
                          {deadline.title}
                          <span className="ml-2 text-xs text-gray-500">
                            ({deadline.type === 'project' ? 'プロジェクト' : 'タスク'})
                          </span>
                        </h3>
                      </div>
                      
                      <div className="flex items-center">
                        {deadline.type === 'task' && deadline.priority && (
                          <span className={`
                            mr-3 px-2 py-1 text-xs rounded-full 
                            ${deadline.priority === 'high' ? 'bg-sakura-100 text-sakura-800' : 
                              deadline.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'}
                          `}>
                            {deadline.priority === 'high' ? '高' : 
                             deadline.priority === 'medium' ? '中' : '低'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center text-xs text-gray-500">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        <span>{deadline.dueDate}</span>
                      </div>
                      
                      <div className={`
                        flex items-center text-xs font-medium rounded-full px-2 py-1
                        ${deadline.daysRemaining < 0 ? 'bg-red-100 text-red-800' : 
                          deadline.daysRemaining === 0 ? 'bg-red-100 text-red-800' :
                          deadline.daysRemaining <= 3 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'}
                      `}>
                        {deadline.daysRemaining < 0 ? (
                          <>
                            <ExclamationCircleIcon className="h-3 w-3 mr-1" />
                            {Math.abs(deadline.daysRemaining)}日遅延
                          </>
                        ) : deadline.daysRemaining === 0 ? (
                          <>
                            <ExclamationCircleIcon className="h-3 w-3 mr-1" />
                            本日期限
                          </>
                        ) : (
                          <>
                            <ClockIcon className="h-3 w-3 mr-1" />
                            残り{deadline.daysRemaining}日
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-between">
                  <Link 
                    href="/projects" 
                    className="text-sm text-indigo-600 font-medium flex items-center hover:text-indigo-500"
                  >
                    すべてのプロジェクト
                    <ArrowRightIcon className="h-4 w-4 ml-1" />
                  </Link>
                  <Link 
                    href="/tasks" 
                    className="text-sm text-indigo-600 font-medium flex items-center hover:text-indigo-500"
                  >
                    すべてのタスク
                    <ArrowRightIcon className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Activity & Tasks section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        {dashboardConfig.showActivity && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">{t('dashboard.recentActivity')}</h3>
          </div>
          <div className="dashboard-card-body p-0">
            <div className="divide-y divide-gray-100">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-start p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/activity?user=${activity.user.replace(/\s+/g, '-').toLowerCase()}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/activity?user=${activity.user.replace(/\s+/g, '-').toLowerCase()}`)}
                  >
                    <div className={`${activity.iconBg} p-2 rounded-full mr-3`}>
                      {React.createElement(activity.icon, { className: `h-5 w-5 ${activity.iconColor}` })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        <span className="font-bold">{activity.user}</span> {activity.target}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <p className="text-gray-500">{t('dashboard.noRecentActivity')}</p>
                </div>
              )}
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-100">
              <Link href="/activity" className="text-sm text-indigo-600 font-medium flex items-center justify-center hover:text-indigo-500">
                {t('dashboard.viewAllActivity')}
                <ArrowRightIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
        )}
        
        {/* Upcoming Tasks */}
        {dashboardConfig.showUpcomingTasks && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">{t('dashboard.upcomingTasks')}</h3>
          </div>
          <div className="dashboard-card-body p-0">
            <div className="divide-y divide-gray-100">
              {upcomingTasks.map((task) => (
                <div 
                  key={task.id} 
                  className={`p-4 flex items-start task-priority-${task.priority} hover:bg-gray-50 transition-colors cursor-pointer`}
                  onClick={() => viewTaskDetails(task.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && viewTaskDetails(task.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <div className="flex items-center mt-1">
                      <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-xs text-gray-500 mr-3">{task.dueDate}</span>
                      <FolderIcon className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-xs text-gray-500">{task.project}</span>
                    </div>
                  </div>
                  <div className={`
                    px-2 py-1 text-xs rounded-full 
                    ${task.priority === 'high' ? 'bg-sakura-100 text-sakura-800' : 
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'}
                  `}>
                    {t(`priority.${task.priority}`)}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-100">
              <Link href="/tasks" className="text-sm text-indigo-600 font-medium flex items-center justify-center hover:text-indigo-500">
                {t('dashboard.viewAllTasks')}
                <ArrowRightIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
} 