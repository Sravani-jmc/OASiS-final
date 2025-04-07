'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  ArrowLeftIcon,
  FolderIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { Dialog, Transition } from '@headlessui/react';
import { useSession } from 'next-auth/react';

interface Team {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  managerId: string;
  teamId: string | null;
  manager: {
    id: string;
    username: string;
    fullName: string | null;
  };
  team?: {
    id: string;
    name: string;
  } | null;
  members: {
    id: string;
    username: string;
    fullName: string | null;
  }[];
  tasks: any[];
}

export default function ProjectsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = searchParams?.get('filter') || 'all';
  const initialTeamId = searchParams?.get('teamId') || 'all';
  const { data: session } = useSession();
  
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState(initialFilter);
  const [teamFilter, setTeamFilter] = useState(initialTeamId);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New states for delete confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Function to fetch teams data
  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setTeams(data);
      } else {
        console.error('Unexpected teams data format:', data);
        setTeams([]);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };
  
  // Function to fetch projects data
  const fetchProjects = async () => {
    setIsLoading(prev => prev === false ? false : true);
    setError(null);
    
    try {
      // Fetch all projects data with no caching
      const response = await fetch('/api/projects', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        next: { revalidate: 0 }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setProjects(data);
        console.log(`Fetched ${data.length} projects successfully`);
      } else {
        console.error('Unexpected data format:', data);
        setProjects([]);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('プロジェクトの読み込みに失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchTeams();
    fetchProjects();
    
    // Auto-refresh every 30 seconds instead of 2 minutes
    const intervalId = setInterval(() => {
      fetchProjects();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Listen for route changes to refresh data when navigating back to this page
  useEffect(() => {
    // This will run when the component mounts
    const handleRouteChange = () => {
      console.log('Route changed, refreshing projects data');
      fetchProjects();
    };

    // Add event listener for when the route changes
    window.addEventListener('focus', handleRouteChange);
    
    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('focus', handleRouteChange);
    };
  }, []);
  
  // Apply filters and search
  useEffect(() => {
    let result = [...projects];
    
    // Apply status filter
    if (filter !== 'all') {
      result = result.filter(project => {
        if (filter === 'notStarted') return project.status === 'notStarted';
        if (filter === 'inProgress') return project.status === 'inProgress';
        if (filter === 'completed') return project.status === 'completed';
        if (filter === 'onHold') return project.status === 'onHold';
        return true;
      });
    }

    // Apply team filter
    if (teamFilter !== 'all') {
      result = result.filter(project => project.teamId === teamFilter);
    }
    
    // Apply search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(project => 
        project.name.toLowerCase().includes(query) ||
        (project.description && project.description.toLowerCase().includes(query)) ||
        (project.manager.fullName && project.manager.fullName.toLowerCase().includes(query)) ||
        project.manager.username.toLowerCase().includes(query)
      );
    }
    
    setFilteredProjects(result);
  }, [projects, filter, teamFilter, searchQuery]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchProjects();
  };
  
  // Handle project click
  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };
  
  // Handle create new project
  const handleCreateProject = () => {
    // Only allow admins to create projects
    if (session?.user?.isAdmin) {
      router.push('/projects/new');
    }
  };
  
  // Handle edit project
  const handleEditProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // Prevent the card click event
    router.push(`/projects/${projectId}/edit`);
  };
  
  // Handle delete project click
  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation(); // Prevent the card click event
    setProjectToDelete(project);
    setIsDeleteModalOpen(true);
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
      // Close the delete modal
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
      
      // Remove the project from the local state to avoid fetching again
      setProjects(prev => prev.filter(project => project.id !== projectToDelete.id));
      
      // Use a timeout to let the state update before potentially redirecting
      setTimeout(() => {
        // Simply update the filtered projects based on the new projects array
        setFilteredProjects(prev => prev.filter(project => project.id !== projectToDelete.id));
      }, 0);
      
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('プロジェクトの削除に失敗しました。もう一度お試しください。');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle URL update when team filter changes
  const handleTeamFilterChange = (teamId: string) => {
    setTeamFilter(teamId);
    
    // Update URL without refreshing the page
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (teamId === 'all') {
      params.delete('teamId');
    } else {
      params.set('teamId', teamId);
    }
    router.push(`/projects?${params.toString()}`);
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

  // Add this block before the existing filter section in the return statement
  const renderTeamFilter = () => (
    <div className="mb-6">
      <label htmlFor="teamFilter" className="block text-sm font-medium text-gray-700 mb-1">
        チーム
      </label>
      <select
        id="teamFilter"
        value={teamFilter}
        onChange={(e) => handleTeamFilterChange(e.target.value)}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
      >
        <option value="all">すべてのチーム</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="dashboard jp-pattern-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center">
          <button 
            onClick={() => router.back()} 
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">プロジェクト</h1>
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
          
          {session?.user?.isAdmin && (
            <button
              onClick={handleCreateProject}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              新規プロジェクト
            </button>
          )}
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
              filter === 'notStarted' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('notStarted')}
          >
            未開始
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'inProgress' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('inProgress')}
          >
            進行中
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
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'onHold' 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setFilter('onHold')}
          >
            一時停止
          </button>
        </div>
      </div>
      
      {renderTeamFilter()}
      
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="flex justify-center mb-4">
            <FolderIcon className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">プロジェクトが見つかりません</h3>
          <p className="text-gray-500 mb-4">
            {filter !== 'all' 
              ? '選択したフィルターに一致するプロジェクトがありません。フィルターを変更するか、新しいプロジェクトを作成してください。'
              : '新しいプロジェクトを作成して始めましょう。'}
          </p>
          {session?.user?.isAdmin && (
            <button
              onClick={handleCreateProject}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              新規プロジェクト
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            // Format dates
            const startDate = new Date(project.startDate);
            const endDate = project.endDate ? new Date(project.endDate) : null;
            
            // Get team size
            const teamSize = project.members?.length || 0;
            
            return (
              <div 
                key={project.id}
                className="bg-white rounded-lg shadow overflow-hidden cursor-pointer transform transition hover:shadow-lg hover:-translate-y-1"
                onClick={() => handleProjectClick(project.id)}
              >
                <div className="p-5">
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <a 
                          href={`/projects/${project.id}`}
                          className="text-lg font-medium text-gray-900 hover:text-indigo-600"
                          onClick={(e) => {
                            e.preventDefault();
                            handleProjectClick(project.id);
                          }}
                        >
                          {project.name}
                        </a>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          project.status === 'notStarted' ? 'bg-gray-100 text-gray-800' :
                          project.status === 'inProgress' ? 'bg-blue-100 text-blue-800' :
                          project.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {t(`status.${project.status}`)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <UserGroupIcon className="h-5 w-5 mr-1" />
                        {project.team?.name || 'No Team'}
                      </div>
                      <div className="flex items-center">
                        <CalendarIcon className="h-5 w-5 mr-1" />
                        {format(new Date(project.startDate), 'yyyy/MM/dd')}
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">進捗</span>
                        <span className="text-sm font-medium text-gray-700">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${project.progress}%`,
                            backgroundColor:
                              project.progress >= 100 ? '#10B981' :
                              project.progress >= 60 ? '#3B82F6' :
                              project.progress >= 30 ? '#F59E0B' :
                              '#EF4444'
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <a
                        href="https://drive.google.com/drive/folders/1I1dnQlxyW3g4zftPfFg9YcAClrMj-kMQ?usp=drive_link"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-indigo-600 transition flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FolderIcon className="w-4 h-4" />
                        <span className="text-sm">Drive</span>
                      </a>
                      {session?.user?.isAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleEditProject(e, project.id)}
                            className="text-gray-400 hover:text-indigo-600 transition"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(e, project)}
                            className="text-gray-400 hover:text-red-600 transition"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
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
                    プロジェクトの削除
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {projectToDelete?.name} を削除してもよろしいですか？この操作は元に戻せません。
                      関連するタスクもすべて削除されます。
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