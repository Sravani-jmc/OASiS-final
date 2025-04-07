'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  FolderIcon, 
  DocumentTextIcon, 
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useRouter } from 'next/navigation';

interface ActivityItem {
  id: number;
  user: string;
  action: string;
  target: string;
  time: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconBg: string;
  iconColor: string;
  date: string;
}

export default function ActivityPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState('all');
  
  // Simulate fetching activity data
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        
        // Add a timestamp to prevent caching
        const timestamp = new Date().getTime();
        
        // Fetch real data from the daily-logs API
        const response = await fetch(`/api/daily-logs?includeAllActivities=true&t=${timestamp}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch activity data');
        }
        
        const logsData = await response.json();
        
        // Format activity data from real API response
        const activityData = logsData.map((log: any) => {
          // Use the actual description for activities
          const iconMap: {[key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>>} = {
            'meeting': CalendarIcon,
            'development': CheckCircleIcon,
            'planning': DocumentTextIcon,
            'review': CheckCircleIcon,
            'research': DocumentTextIcon,
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
          
          // Format date for grouping
          const logDate = new Date(log.date);
          const formattedDate = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
          
          // Determine action type from description
          let action = '';
          if (log.description.includes('タスク') && log.description.includes('完了')) {
            action = t('dashboard.completedTask');
          } else if (log.description.includes('プロジェクト') && log.description.includes('作成')) {
            action = t('dashboard.createdProject');
          } else if (log.description.includes('コメント')) {
            action = t('dashboard.commentedOn');
          } else if (log.description.includes('チーム') && log.description.includes('メンバー')) {
            action = t('dashboard.addedTeamMember');
          } else {
            action = '';
          }
          
          // Extract target from description - for now, just use the full description
          const target = log.description;
          
          return {
            id: log.id,
            user: log.user?.fullName || log.user?.username || 'Unknown User',
            action: action,
            target: target,
            time: timeAgo,
            date: formattedDate,
            icon: iconMap[log.category] || CheckCircleIcon,
            iconBg: bgColorMap[log.category] || 'bg-gray-100',
            iconColor: textColorMap[log.category] || 'text-gray-600',
          };
        });
        
        setActivities(activityData);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchActivities();
    
    // Setup auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      fetchActivities();
    }, 30000);
    
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [t]);
  
  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'tasks') return activity.action.includes('Task');
    if (filter === 'projects') return activity.action.includes('Project');
    if (filter === 'documents') return activity.action.includes('Document') || activity.action.includes('Comment');
    if (filter === 'team') return activity.action.includes('Team') || activity.action.includes('Member');
    return true;
  });
  
  // Group activities by date
  const groupedActivities: { [key: string]: ActivityItem[] } = {};
  filteredActivities.forEach(activity => {
    if (!groupedActivities[activity.date]) {
      groupedActivities[activity.date] = [];
    }
    groupedActivities[activity.date].push(activity);
  });
  
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
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.allActivity')}</h1>
      </div>
      
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button 
          className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'all' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}
          onClick={() => setFilter('all')}
        >
          {t('filter.all')}
        </button>
        <button 
          className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'tasks' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
          onClick={() => setFilter('tasks')}
        >
          {t('filter.tasks')}
        </button>
        <button 
          className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'projects' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}
          onClick={() => setFilter('projects')}
        >
          {t('filter.projects')}
        </button>
        <button 
          className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'documents' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}
          onClick={() => setFilter('documents')}
        >
          {t('filter.documents')}
        </button>
        <button 
          className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'team' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}
          onClick={() => setFilter('team')}
        >
          {t('filter.team')}
        </button>
      </div>
      
      {/* Activity feed */}
      <div className="dashboard-card">
        <div className="dashboard-card-body p-0">
          {Object.keys(groupedActivities).length > 0 ? (
            Object.keys(groupedActivities).sort((a, b) => b.localeCompare(a)).map(date => (
              <div key={date} className="border-b border-gray-200 last:border-b-0">
                <div className="bg-gray-50 p-4 font-medium text-gray-700">
                  {(() => {
                    const activityDate = new Date(date);
                    const today = new Date();
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    if (activityDate.toDateString() === today.toDateString()) {
                      return t('time.today');
                    } else if (activityDate.toDateString() === yesterday.toDateString()) {
                      return t('time.yesterday');
                    } else {
                      return new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
                    }
                  })()}
                </div>
                
                <div>
                  {groupedActivities[date].map(activity => {
                    const IconComponent = activity.icon;
                    
                    return (
                      <div key={activity.id} className="flex items-start p-4 hover:bg-gray-50 transition-colors">
                        <div className={`${activity.iconBg} p-2 rounded-full mr-3`}>
                          <IconComponent className={`h-5 w-5 ${activity.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.action ? (
                              <>
                                <span className="font-semibold">{activity.user}</span> {activity.action} <span className="font-medium">{activity.target}</span>
                              </>
                            ) : (
                              <span>{activity.target}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">{t('dashboard.noActivity')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 