'use client';

import { useState, useEffect, Fragment } from 'react';
import { 
  PlusIcon, 
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  FolderIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  ExclamationCircleIcon,
  UserIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Input, Select } from '@/components/ui';
import { Dialog, Transition } from '@headlessui/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ClipboardIcon } from '@heroicons/react/24/outline';

// Types for Daily Log entries
interface LogEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  category: string;
  description: string;
  completed: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    fullName?: string;
  };
}

const categoryOptions = [
  { value: 'all', label: '全て' },
  { value: 'meeting', label: 'ミーティング' },
  { value: 'development', label: '開発' },
  { value: 'planning', label: '計画・設計' },
  { value: 'review', label: 'レビュー' },
  { value: 'research', label: '調査・研究' },
  { value: 'documentation', label: 'ドキュメント作成' },
  { value: 'other', label: 'その他' }
];

const projectOptions = [
  { value: 'all', label: '全て' },
  { value: '1', label: 'ウェブサイトリニューアル' },
  { value: '2', label: 'モバイルアプリ開発' },
  { value: '3', label: 'マーケティングキャンペーン' },
  { value: '4', label: 'データ分析プラットフォーム' }
];

export default function DailyLogPage() {
  const [loading, setLoading] = useState(true);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [entryForm, setEntryForm] = useState({
    startTime: '09:00',
    endTime: '10:00',
    category: 'development',
    description: '',
    projectId: '',
    taskId: ''
  });
  const [filters, setFilters] = useState({
    category: 'all',
    projectId: 'all',
    userId: 'all',
  });
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  
  // New states for edit and delete functionality
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const session = await response.json();
          if (session && session.user) {
            setIsAdmin(session.user.isAdmin || false);
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    
    checkAdminStatus();
  }, []);
  
  // Fetch users for admin filter
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAdmin) return;
      
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    fetchUsers();
  }, [isAdmin]);

  // Format date as YYYY-MM-DD ensuring it uses the correct timezone
  const formatDate = (date: Date): string => {
    // Create a new date object with the current date to avoid timezone issues
    const d = new Date(date);
    // Format as YYYY-MM-DD in local timezone
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Format current date as a display string
  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // Navigate to previous day
  const prevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  // Navigate to next day
  const nextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  // Navigate to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Fetch log entries for the current date
  useEffect(() => {
    const fetchLogEntries = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Format date as YYYY-MM-DD for API
        const dateParam = formatDate(currentDate);
        
        // Build query parameters
        const queryParams = new URLSearchParams();
        queryParams.append('date', dateParam);
        
        if (filters.category !== 'all') {
          queryParams.append('category', filters.category);
        }
        
        // Always show all logs for all users
        queryParams.append('showAll', 'true');
        
        // Include all activities
        queryParams.append('includeAllActivities', 'true');
        
        // Add userId filter if selected
        if (filters.userId !== 'all') {
          queryParams.append('userId', filters.userId);
        }
        
        // Add a timestamp parameter to force fresh data and prevent caching
        queryParams.append('_t', Date.now().toString());
        
        const response = await fetch(`/api/daily-logs?${queryParams.toString()}`, {
          // Add strict cache control headers to prevent caching
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch daily logs');
        }
        
        const data = await response.json();
        console.log('Fetched log entries:', data.length);
        setLogEntries(data);
      } catch (err) {
        console.error('Error fetching daily logs:', err);
        setError('日報の読み込みに失敗しました。もう一度お試しください。');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };
    
    // Fetch projects for the form
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
          
          // Set first project as default if available
          if (data.length > 0) {
            setEntryForm(prev => ({ ...prev, projectId: data[0].id }));
          }
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    
    // Fetch users for filters
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    fetchLogEntries();
    fetchProjects();
    fetchUsers();
    
    // Set up auto-refresh interval every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchLogEntries();
    }, 30000); // 30 seconds
    
    // Clean up interval on component unmount
    return () => clearInterval(refreshInterval);
  }, [currentDate, filters, showAllLogs]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate form
    if (!entryForm.description) {
      alert('説明を入力してください');
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formatDate(currentDate),
          startTime: entryForm.startTime,
          endTime: entryForm.endTime,
          description: entryForm.description,
          category: entryForm.category,
          completed: true,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create daily log');
      }
      
      // Reset form
      setEntryForm({
        startTime: '09:00',
        endTime: '10:00',
        category: 'development',
        description: '',
        projectId: projects.length > 0 ? projects[0].id : '',
        taskId: ''
      });
      
      setShowNewEntryForm(false);
      
      // Refresh logs to show the new entry immediately
      refreshLogEntries();
    } catch (error) {
      console.error('Error creating daily log:', error);
      alert('日報の作成に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // New handler for edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!editingEntry) {
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/daily-logs/${editingEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: editingEntry.startTime,
          endTime: editingEntry.endTime,
          description: editingEntry.description,
          category: editingEntry.category,
          completed: editingEntry.completed,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update daily log');
      }
      
      // Close the edit form
      setEditingEntry(null);
      
      // Refresh logs to show the updated entry immediately
      refreshLogEntries();
    } catch (error) {
      console.error('Error updating daily log:', error);
      alert('日報の更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for delete confirmation
  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/daily-logs/${entryToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete daily log');
      }
      
      // Close the delete modal
      setIsDeleteModalOpen(false);
      setEntryToDelete(null);
      
      // Refresh logs to update the list immediately
      refreshLogEntries();
    } catch (error) {
      console.error('Error deleting daily log:', error);
      alert('日報の削除に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for edit button click
  const handleEditClick = (entry: LogEntry) => {
    setEditingEntry(entry);
  };

  // Handler for delete button click
  const handleDeleteClick = (id: string) => {
    setEntryToDelete(id);
    setIsDeleteModalOpen(true);
  };

  // Handler for edit form input changes
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editingEntry) {
      setEditingEntry(prev => ({ ...prev!, [name]: value }));
    }
  };

  // Filter entries by current date and filters
  const filteredEntries = logEntries.filter(entry => {
    // Filter by date
    const entryDate = new Date(entry.date);
    const currentDateStr = formatDate(currentDate);
    const entryDateStr = formatDate(entryDate);
    
    if (entryDateStr !== currentDateStr) return false;
    
    // Filter by category
    if (filters.category !== 'all' && entry.category !== filters.category) return false;
    
    return true;
  });

  // Sort entries by start time
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });

  // Calculate total hours worked for the current day
  const calculateTotalHours = (entries: LogEntry[]): string => {
    let totalMinutes = 0;
    
    entries.forEach(entry => {
      const startParts = entry.startTime.split(':').map(Number);
      const endParts = entry.endTime.split(':').map(Number);
      
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      
      totalMinutes += endMinutes - startMinutes;
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours}時間${minutes > 0 ? ` ${minutes}分` : ''}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEntryForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleToggleComplete = (id: string) => {
    setLogEntries(prev => 
      prev.map(entry => 
        entry.id === id 
          ? { ...entry, completed: !entry.completed } 
          : entry
      )
    );
  };

  const getCategoryLabel = (category: string): string => {
    const option = categoryOptions.find(opt => opt.value === category);
    return option ? option.label : category;
  };

  const getCategoryBadgeVariant = (category: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (category) {
      case 'meeting':
        return 'info';
      case 'development':
        return 'success';
      case 'planning':
        return 'warning';
      case 'review':
        return 'danger';
      case 'research':
        return 'default';
      case 'documentation':
        return 'info';
      default:
        return 'default';
    }
  };

  // Function to manually refresh log entries
  const refreshLogEntries = () => {
    setIsRefreshing(true);
    console.log('Manual refresh triggered');
    
    // Force fetch with a new timestamp to bypass cache
    const fetchFreshData = async () => {
      try {
        const dateParam = formatDate(currentDate);
        const queryParams = new URLSearchParams();
        queryParams.append('date', dateParam);
        
        if (filters.category !== 'all') {
          queryParams.append('category', filters.category);
        }
        
        queryParams.append('showAll', 'true');
        
        if (filters.userId !== 'all') {
          queryParams.append('userId', filters.userId);
        }
        
        // Add timestamp to force fresh data
        queryParams.append('_t', Date.now().toString());
        
        console.log('Fetching fresh data with params:', queryParams.toString());
        
        const response = await fetch(`/api/daily-logs?${queryParams.toString()}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch daily logs');
        }
        
        const data = await response.json();
        console.log('Manually refreshed log entries:', data.length);
        setLogEntries(data);
        setIsRefreshing(false);
      } catch (err) {
        console.error('Error refreshing logs:', err);
        setError('日報の更新に失敗しました。もう一度お試しください。');
        setIsRefreshing(false);
      }
    };
    
    fetchFreshData();
  };

  // Add a toggle function to switch between viewing all logs or just the user's own logs
  const toggleShowAllLogs = () => {
    // Toggle the state
    const newValue = !showAllLogs;
    setShowAllLogs(newValue);
    
    // Reset user filter when switching to own logs
    if (!newValue && filters.userId !== 'all') {
      setFilters(prev => ({ ...prev, userId: 'all' }));
    }
    
    // Set loading state and refresh logs
    setLoading(true);
    
    // This will trigger the useEffect hook to re-fetch the log entries
    setCurrentDate(new Date(currentDate));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loading />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <PageHeader 
          title="日報" 
          description="日々の活動を記録し管理します" 
        />
      </div>
      
      {/* Error Alert */}
      {error && (
        <Alert className="mb-4">
          <ExclamationCircleIcon className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Control Panel */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex justify-between space-x-2 mb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={prevDay}
                className="p-2 rounded-full border border-gray-300 hover:bg-gray-100"
                aria-label="Previous day"
              >
                <CalendarDaysIcon className="h-4 w-4 text-gray-600" />
                <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
              </button>
              
              <button
                onClick={goToToday}
                className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
              >
                今日
              </button>
              
              <button
                onClick={nextDay}
                className="p-2 rounded-full border border-gray-300 hover:bg-gray-100"
                aria-label="Next day"
              >
                <CalendarDaysIcon className="h-4 w-4 text-gray-600" />
                <ChevronRightIcon className="h-4 w-4 text-gray-600" />
              </button>
              
              <span className="text-lg font-medium text-gray-900 ml-2">
                {formatDateDisplay(currentDate)}
              </span>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={refreshLogEntries}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
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
                onClick={() => setShowNewEntryForm(true)}
                className="px-3 py-2 bg-indigo-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                新規エントリー
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      {!loading && logEntries.length === 0 && (
        <Card className="p-6 text-center text-gray-500">
          <div className="flex flex-col items-center justify-center gap-2">
            <ClipboardIcon className="h-12 w-12 text-gray-400" />
            <h3 className="text-lg font-medium">No logs found</h3>
            <p>There are no activity logs for this day with the selected filters.</p>
            <Button 
              onClick={() => setShowNewEntryForm(true)} 
              className="mt-2"
            >
              Add Your First Log
            </Button>
          </div>
        </Card>
      )}

      {!loading && logEntries.length > 0 && (
        <>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">
              {logEntries.length} {logEntries.length === 1 ? 'Entry' : 'Entries'} • Total Time: {calculateTotalHours(logEntries)}
            </h3>
          </div>

          <div className="space-y-4">
            {logEntries.map(entry => (
              <Card key={entry.id} className={`p-4 border-l-4 ${entry.completed ? 'border-l-green-500' : 'border-l-yellow-500'}`}>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getCategoryBadgeVariant(entry.category)}>
                        {getCategoryLabel(entry.category)}
                      </Badge>
                      
                      {entry.user && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <UserIcon className="h-3 w-3" />
                          <span>{entry.user.fullName || entry.user.username}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-lg font-medium mb-1">{entry.description}</p>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <ClockIcon className="h-4 w-4" />
                      <span>{entry.startTime} - {entry.endTime}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`${entry.completed ? 'text-green-600' : 'text-yellow-600'}`}
                      onClick={() => handleToggleComplete(entry.id)}
                    >
                      {entry.completed ? (
                        <><CheckCircleIcon className="h-5 w-5 mr-1" /> Completed</>
                      ) : (
                        <><ClockIcon className="h-5 w-5 mr-1" /> In Progress</>
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(entry)}
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => handleDeleteClick(entry.id)}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {showNewEntryForm && (
        <Card className="mb-6">
          <CardHeader>
            <h3 className="text-lg font-medium text-ink-900">新規活動記録</h3>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                <Input
                  id="startTime"
                  name="startTime"
                  label="開始時間"
                  type="time"
                  value={entryForm.startTime}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  id="endTime"
                  name="endTime"
                  label="終了時間"
                  type="time"
                  value={entryForm.endTime}
                  onChange={handleInputChange}
                  required
                />
                <Select
                  id="category"
                  name="category"
                  label="カテゴリー"
                  options={categoryOptions.filter(opt => opt.value !== 'all')}
                  value={entryForm.category}
                  onChange={(value) => setEntryForm(prev => ({ ...prev, category: value }))}
                  required
                />
                <Select
                  id="projectId"
                  name="projectId"
                  label="プロジェクト"
                  options={[{ value: '', label: '選択してください' }, ...projectOptions.filter(opt => opt.value !== 'all')]}
                  value={entryForm.projectId}
                  onChange={(value) => setEntryForm(prev => ({ ...prev, projectId: value }))}
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-ink-700 mb-1">
                  説明
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="block w-full rounded-md shadow-sm sm:text-sm border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="活動内容の説明"
                  value={entryForm.description}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowNewEntryForm(false)}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                      保存中...
                    </>
                  ) : '保存'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {editingEntry && (
        <Card className="mb-6">
          <CardHeader className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-ink-900">活動記録の編集</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingEntry(null)}
            >
              <XMarkIcon className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                <Input
                  id="startTime"
                  name="startTime"
                  label="開始時間"
                  type="time"
                  value={editingEntry.startTime}
                  onChange={handleEditInputChange}
                  required
                />
                <Input
                  id="endTime"
                  name="endTime"
                  label="終了時間"
                  type="time"
                  value={editingEntry.endTime}
                  onChange={handleEditInputChange}
                  required
                />
                <Select
                  id="category"
                  name="category"
                  label="カテゴリー"
                  options={categoryOptions.filter(opt => opt.value !== 'all')}
                  value={editingEntry.category}
                  onChange={(value) => setEditingEntry(prev => ({ ...prev!, category: value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-ink-700 mb-1">
                  説明
                </label>
                <textarea
                  id="edit-description"
                  name="description"
                  rows={3}
                  className="block w-full rounded-md shadow-sm sm:text-sm border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="活動内容の説明"
                  value={editingEntry.description}
                  onChange={handleEditInputChange}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingEntry(null)}
                  disabled={isSubmitting}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                      更新中...
                    </>
                  ) : '更新'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsDeleteModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    活動記録の削除
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      この活動記録を削除してもよろしいですか？この操作は元に戻せません。
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsDeleteModalOpen(false)}
                      disabled={isSubmitting}
                    >
                      キャンセル
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleDeleteConfirm}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                          削除中...
                        </>
                      ) : '削除'}
                    </Button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
} 