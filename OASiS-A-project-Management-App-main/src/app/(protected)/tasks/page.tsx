'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  FolderIcon,
  FunnelIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  UserIcon,
  ClipboardIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { Dialog, Transition } from '@headlessui/react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  projectId: string;
  assigneeId: string | null;
  project: {
    id: string;
    name: string;
  };
  assignee: {
    id: string;
    username: string;
    fullName: string | null;
  } | null;
  progress: number;
}

export default function TasksPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = searchParams?.get('filter') || 'all';
  
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New states for delete confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Function to fetch tasks data
  const fetchTasks = async () => {
    setIsLoading(prev => prev === false ? false : true);
    setError(null);
    
    try {
      const response = await fetch('/api/tasks', {
        // Add cache: 'no-store' to prevent caching
        cache: 'no-store',
        // Add a timestamp to the URL to prevent caching
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('タスクの読み込みに失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchTasks();
    
    // Auto-refresh every 2 minutes
    const intervalId = setInterval(() => {
      fetchTasks();
    }, 120000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Listen for route changes to refresh data when navigating back to this page
  useEffect(() => {
    // This will run when the component mounts
    const handleRouteChange = () => {
      console.log('Route changed, refreshing tasks data');
      fetchTasks();
    };

    // Add event listener for when the route changes
    window.addEventListener('focus', handleRouteChange);
    
    // Add a cleanup timeout to ensure proper unmounting
    const cleanupTimeout = setTimeout(() => {
      // This runs after the component is fully mounted
    }, 0);
    
    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('focus', handleRouteChange);
      clearTimeout(cleanupTimeout);
    };
  }, []);
  
  // Apply filters and search
  useEffect(() => {
    let result = [...tasks];
    
    // Apply status filter
    if (filter !== 'all') {
      result = result.filter(task => {
        if (filter === 'completed') return task.status === 'completed';
        if (filter === 'in_progress') return task.status === 'in_progress';
        if (filter === 'todo') return task.status === 'todo';
        if (filter === 'review') return task.status === 'review';
        if (filter === 'active') return task.status !== 'completed';
        return true;
      });
    }
    
    // Apply search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(task => 
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query)) ||
        (task.assignee && task.assignee.fullName && task.assignee.fullName.toLowerCase().includes(query)) ||
        (task.assignee && task.assignee.username.toLowerCase().includes(query)) ||
        task.project.name.toLowerCase().includes(query)
      );
    }

    // Sort tasks by latest edit (updatedAt)
    result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    setFilteredTasks(result);
  }, [tasks, filter, searchQuery]);
  
  // Group tasks by project
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const projectId = task.project.id;
    if (!acc[projectId]) {
      acc[projectId] = {
        project: task.project,
        tasks: []
      };
    }
    acc[projectId].tasks.push(task);
    return acc;
  }, {} as Record<string, { project: { id: string; name: string }; tasks: Task[] }>);

  // Convert grouped tasks to array and sort by latest task update
  const sortedGroups = Object.values(groupedTasks).sort((a, b) => {
    const aLatest = new Date(a.tasks[0].updatedAt).getTime();
    const bLatest = new Date(b.tasks[0].updatedAt).getTime();
    return bLatest - aLatest;
  });
  
  // Handle manual refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTasks();
  };
  
  // Handle task click
  const handleTaskClick = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };
  
  // Handle create new task
  const handleCreateTask = () => {
    router.push('/tasks/new');
  };
  
  // Handle edit task
  const handleEditTask = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation(); // Prevent the task item click event
    router.push(`/tasks/${taskId}/edit`);
  };
  
  // Handle delete task click
  const handleDeleteClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); // Prevent the task item click event
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/tasks/${taskToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      
      // Remove the task from the local state
      setTasks(prev => prev.filter(task => task.id !== taskToDelete.id));
      
      // Close the delete modal
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('タスクの削除に失敗しました。もう一度お試しください。');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Add this helper function
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 20) return 'bg-yellow-500';
    return 'bg-gray-500';
  };
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center">
          <button 
            onClick={() => router.back()} 
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">タスク</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <button
            onClick={handleRefresh}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label="Refresh"
            disabled={isRefreshing}
          >
            <ArrowPathIcon className={`h-5 w-5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleCreateTask}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            新規タスク
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'all' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('all')}
          >
            すべて
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'active' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('active')}
          >
            進行中のタスク
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'todo' 
                ? 'bg-gray-100 text-gray-700' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('todo')}
          >
            未着手
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'in_progress' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('in_progress')}
          >
            進行中
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'review' 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('review')}
          >
            レビュー中
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'completed' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('completed')}
          >
            完了
          </button>
        </div>
      </div>
      
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="flex justify-center mb-4">
            <ClipboardIcon className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">タスクが見つかりません</h3>
          <p className="text-gray-500 mb-4">
            {filter !== 'all' 
              ? '選択したフィルターに一致するタスクがありません。フィルターを変更するか、新しいタスクを作成してください。'
              : '新しいタスクを作成して始めましょう。'}
          </p>
          <button
            onClick={handleCreateTask}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            新規タスク
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedGroups.map((group) => (
            <div key={group.project.id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{group.project.name}</h3>
                  <a
                    href="https://drive.google.com/drive/folders/1I1dnQlxyW3g4zftPfFg9YcAClrMj-kMQ?usp=drive_link"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FolderIcon className="h-4 w-4 mr-1" />
                    Drive
                  </a>
                </div>
              </div>
              <ul className="divide-y divide-gray-200">
                {group.tasks.map((task) => {
                  // Determine status color and icon
                  let statusColor = 'bg-gray-100 text-gray-800';
                  let statusIcon = <ClockIcon className="h-5 w-5 text-gray-500" />;
                  
                  if (task.status === 'completed') {
                    statusColor = 'bg-green-100 text-green-800';
                    statusIcon = <CheckCircleIcon className="h-5 w-5 text-green-500" />;
                  } else if (task.status === 'in_progress') {
                    statusColor = 'bg-blue-100 text-blue-800';
                    statusIcon = <ClockIcon className="h-5 w-5 text-blue-500" />;
                  } else if (task.status === 'review') {
                    statusColor = 'bg-yellow-100 text-yellow-800';
                    statusIcon = <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />;
                  }
                  
                  // Determine priority color
                  let priorityColor = 'bg-gray-100 text-gray-800';
                  if (task.priority === 'high') {
                    priorityColor = 'bg-red-100 text-red-800';
                  } else if (task.priority === 'medium') {
                    priorityColor = 'bg-yellow-100 text-yellow-800';
                  } else if (task.priority === 'low') {
                    priorityColor = 'bg-green-100 text-green-800';
                  }
                  
                  // Format date
                  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                  
                  return (
                    <li 
                      key={task.id}
                      className="hover:bg-gray-50 cursor-pointer relative"
                    >
                      <div className="px-4 py-4 sm:px-6" onClick={() => handleTaskClick(task.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1 min-w-0">
                            {statusIcon}
                            <p className="ml-3 text-sm font-medium text-indigo-600 truncate">
                              {task.title}
                            </p>
                          </div>
                          <div className="flex flex-shrink-0 ml-2 space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColor}`}>
                              {task.priority}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                              {task.status === 'todo' && '未着手'}
                              {task.status === 'in_progress' && '進行中'}
                              {task.status === 'review' && 'レビュー中'}
                              {task.status === 'completed' && '完了'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center text-sm text-gray-500">
                              <ChartBarIcon className="h-4 w-4 mr-1" />
                              <span>Progress</span>
                            </div>
                            <span className="text-sm text-gray-500">{task.progress}%</span>
                          </div>
                          <div className="w-3/4 bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${getProgressColor(task.progress)}`}
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="absolute top-2 right-2 flex space-x-1">
                        <button
                          onClick={(e) => handleEditTask(e, task.id)}
                          className="p-1 rounded-full text-gray-500 hover:text-indigo-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          aria-label="Edit task"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, task)}
                          className="p-1 rounded-full text-gray-500 hover:text-red-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          aria-label="Delete task"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-10" 
          onClose={() => {
            if (!isDeleting) {
              setIsDeleteModalOpen(false);
            }
          }}
          static
        >
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
                    タスクの削除
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {taskToDelete?.title} を削除してもよろしいですか？この操作は元に戻せません。
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={() => setIsDeleteModalOpen(false)}
                      disabled={isDeleting}
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      onClick={handleDeleteConfirm}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          削除中...
                        </>
                      ) : '削除する'}
                    </button>
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