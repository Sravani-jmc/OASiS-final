'use client';

import { useState, useEffect, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  StarIcon as StarOutline,
  PlusIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Dialog, Transition } from '@headlessui/react';
import { Button } from '@/components/ui/Button';

// Define the Project interface
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

const statusColors = {
  active: { bg: 'bg-blue-100', text: 'text-blue-700', label: '進行中' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: '完了' },
  paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '一時停止' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: '中止' },
};

const priorityColors = {
  low: { bg: 'bg-gray-100', text: 'text-gray-700', label: '低' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '中' },
  high: { bg: 'bg-red-100', text: 'text-red-700', label: '高' },
};

const taskStatusColors = {
  todo: { bg: 'bg-gray-100' },
  in_progress: { bg: 'bg-blue-100' },
  review: { bg: 'bg-yellow-100' },
  completed: { bg: 'bg-green-100' },
};

export default function ProjectDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'team' | 'activity'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      if (!params?.id) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/projects/${params.id}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('プロジェクトが見つかりませんでした');
          } else {
            throw new Error('Failed to fetch project');
          }
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        setProject(data);
        setIsFavorite(data.isFavorite || false);
      } catch (err) {
        console.error('Error fetching project:', err);
        setError('プロジェクトの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProject();
  }, [params?.id]);

  const handleToggleFavorite = async () => {
    setIsFavorite(!isFavorite);
    // In a real app, you would update this via an API call
  };

  const handleEditProject = () => {
    router.push(`/projects/${params?.id}/edit`);
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!project) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
      // Close modal before navigation
      setIsDeleteModalOpen(false);
      
      // Navigate back to projects page - use push instead of replace
      router.push('/projects');
      
      // Don't use router.refresh() as it can cause React DOM issues
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('プロジェクトの削除に失敗しました。もう一度お試しください。');
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (error || !project) {
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
          <h1 className="text-2xl font-bold text-gray-900">プロジェクト詳細</h1>
        </div>
        
        <Card>
          <div className="p-6 text-center">
            <p className="text-gray-600 mb-4">{error || 'プロジェクトが見つかりませんでした'}</p>
            <Button onClick={() => router.push('/projects')}>
              プロジェクト一覧に戻る
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const calculateDaysLeft = () => {
    const today = new Date();
    const dueDate = new Date(project.endDate || project.startDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = calculateDaysLeft();
  const isPastDue = daysLeft < 0;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

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
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        </div>

        <div className="flex items-center space-x-2">
            <button
            onClick={handleToggleFavorite}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? (
              <StarSolid className="h-5 w-5 text-yellow-400" />
            ) : (
              <StarOutline className="h-5 w-5 text-gray-400" />
            )}
            </button>
          
            <button
            onClick={handleEditProject}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Edit project"
            >
            <PencilIcon className="h-5 w-5 text-gray-500" />
            </button>
          
            <button
            onClick={handleDeleteClick}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Delete project"
          >
            <TrashIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
        <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge 
                  className={`${statusColors[project.status as keyof typeof statusColors]?.bg} ${statusColors[project.status as keyof typeof statusColors]?.text}`}
                >
                  {statusColors[project.status as keyof typeof statusColors]?.label || project.status}
                </Badge>
                
                <Badge 
                  className={`${priorityColors[project.priority as keyof typeof priorityColors]?.bg} ${priorityColors[project.priority as keyof typeof priorityColors]?.text}`}
                >
                  優先度: {priorityColors[project.priority as keyof typeof priorityColors]?.label || project.priority}
                </Badge>
              </div>
              
              <p className="text-gray-600 mb-6">{project.description || '説明なし'}</p>
              
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">進捗状況</h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full" 
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">進捗</span>
                  <span className="text-xs font-medium text-gray-700">{project.progress}%</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">プロジェクト期間</h3>
                  <div className="flex items-center text-gray-600">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span>
                      開始: {new Date(project.startDate).toLocaleDateString('ja-JP')}
                      {project.endDate && ` 〜 終了: ${new Date(project.endDate).toLocaleDateString('ja-JP')}`}
                    </span>
                        </div>
                      </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">チーム</h3>
                  <div className="flex items-center text-gray-600">
                    <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span>
                      {project.team ? project.team.name : 'チームなし'} ({project.members.length} メンバー)
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">マネージャー</h3>
                  <div className="flex items-center text-gray-600">
                    <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span>
                      {project.manager.fullName || project.manager.username}
                    </span>
                        </div>
                      </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">作成日</h3>
                  <div className="flex items-center text-gray-600">
                    <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span>{new Date(project.createdAt).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('overview')}
                >
                  概要
                </button>
                <button
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'tasks'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('tasks')}
                >
                  タスク
                </button>
                <button
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'team'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('team')}
                >
                  チーム
                </button>
                <button
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'activity'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('activity')}
                >
                  アクティビティ
                </button>
              </nav>
            </div>
            
            <div className="p-6">
              {activeTab === 'overview' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">プロジェクト概要</h3>
                  <p className="text-gray-600">{project.description || 'このプロジェクトに説明はありません。'}</p>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">タスク</h3>
                    <Link href={`/tasks/new?projectId=${project.id}`}>
                      <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <PlusIcon className="h-4 w-4 mr-1" />
                        新規タスク
                </button>
                    </Link>
              </div>
              
                  {project.tasks && project.tasks.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {project.tasks.map((task) => (
                        <li key={task.id} className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full ${taskStatusColors[task.status as keyof typeof taskStatusColors]?.bg} mr-3`}></div>
                              <Link href={`/tasks/${task.id}`} className="text-indigo-600 hover:text-indigo-900">
                                {task.title}
                              </Link>
                            </div>
                            <div className="text-sm text-gray-500">
                              {task.assignee ? `担当: ${task.assignee.fullName || task.assignee.username}` : '未割り当て'}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <p>タスクがありません</p>
                      <p className="text-sm">新しいタスクを作成して始めましょう</p>
              </div>
                  )}
            </div>
          )}

          {activeTab === 'team' && (
            <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">チームメンバー</h3>
                  
                  {project.members && project.members.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {project.members.map((member) => (
                        <li key={member.id} className="py-3 flex items-center">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                            <span className="text-indigo-800 font-medium">
                              {(member.fullName || member.username).charAt(0).toUpperCase()}
                            </span>
              </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{member.fullName || member.username}</p>
                    </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <UserGroupIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <p>メンバーがいません</p>
                    </div>
                  )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">アクティビティ</h3>
                  
                  <div className="text-center py-6 text-gray-500">
                    <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p>アクティビティはありません</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
        
        <div>
          <Card className="mb-6">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">統計</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-500">タスク完了率</span>
                    <span className="text-sm font-medium text-gray-900">
                      {project.tasks && project.tasks.length > 0
                        ? `${Math.round((project.tasks.filter(t => t.status === 'completed').length / project.tasks.length) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: project.tasks && project.tasks.length > 0
                          ? `${Math.round((project.tasks.filter(t => t.status === 'completed').length / project.tasks.length) * 100)}%`
                          : '0%'
                      }}
                    ></div>
                  </div>
                      </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">タスクステータス</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">未着手</span>
                      <span className="text-xs font-medium text-gray-900">
                        {project.tasks ? project.tasks.filter(t => t.status === 'todo').length : 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">進行中</span>
                      <span className="text-xs font-medium text-gray-900">
                        {project.tasks ? project.tasks.filter(t => t.status === 'in_progress').length : 0}
                      </span>
                      </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">レビュー中</span>
                      <span className="text-xs font-medium text-gray-900">
                        {project.tasks ? project.tasks.filter(t => t.status === 'review').length : 0}
                      </span>
                        </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">完了</span>
                      <span className="text-xs font-medium text-gray-900">
                        {project.tasks ? project.tasks.filter(t => t.status === 'completed').length : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">アクション</h3>
              
              <div className="space-y-3">
                <Link href={`/tasks/new?projectId=${project.id}`} className="w-full">
                  <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    新規タスク作成
                  </button>
                </Link>
                
                <button 
                  onClick={handleEditProject}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PencilIcon className="h-5 w-5 mr-2" />
                  プロジェクト編集
                </button>
                
                <button 
                  onClick={handleDeleteClick}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="h-5 w-5 mr-2" />
                  プロジェクト削除
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
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
                      {project.name} を削除してもよろしいですか？この操作は元に戻せません。
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