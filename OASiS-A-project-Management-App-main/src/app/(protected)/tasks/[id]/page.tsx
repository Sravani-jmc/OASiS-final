'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PencilIcon, 
  TrashIcon,
  ArrowLeftIcon,
  ClockIcon,
  UserIcon,
  FolderIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Dialog, Transition } from '@headlessui/react';
import { Input } from '@/components/ui';

// Type for our task
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
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
  comments?: TaskComment[];
}

// Type for comments
type TaskComment = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    fullName: string | null;
  };
};

// Comment Component
function CommentSection({ 
  taskId, 
  comments = [], 
  onCommentAdded,
  onCommentDeleted
}: { 
  taskId: string; 
  comments: TaskComment[]; 
  onCommentAdded: (newComment: TaskComment) => void;
  onCommentDeleted: (commentId: string) => void;
}) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: comment }),
      });

      if (!response.ok) {
        throw new Error('Failed to post comment');
      }

      const newComment = await response.json();
      onCommentAdded(newComment);
      setComment('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!commentId) return;
    
    setDeletingCommentId(commentId);
    
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }
      
      onCommentDeleted(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 mb-2">コメント</h3>
      
      {comments && comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((commentItem) => (
            <div key={commentItem.id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="font-medium">
                  {commentItem.author.fullName || commentItem.author.username}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {new Date(commentItem.createdAt).toLocaleString('ja-JP')}
                  </span>
                  <button 
                    onClick={() => handleDeleteComment(commentItem.id)}
                    disabled={deletingCommentId === commentItem.id}
                    className="text-gray-400 hover:text-red-500 p-1 rounded"
                    title="削除"
                  >
                    {deletingCommentId === commentItem.id ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-gray-700">{commentItem.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p>コメントはありません</p>
        </div>
      )}
      
      <form onSubmit={handleCommentSubmit} className="mt-4">
        <div className="mb-3">
          <Input
            id="comment"
            name="comment"
            label="コメントを追加"
            placeholder="コメントを入力してください"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-end">
          <Button 
            type="submit" 
            isLoading={isSubmitting}
            disabled={!comment.trim()}
          >
            投稿
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tasks/${params.id}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('タスクが見つかりませんでした');
          } else {
            throw new Error('Failed to fetch task');
          }
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        setTask(data);
      } catch (err) {
        console.error('Error fetching task:', err);
        setError('タスクの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTask();
  }, [params.id]);

  const handleEditClick = () => {
    router.push(`/tasks/${params.id}/edit`);
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!task) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      
      // Navigate back to tasks page
      router.push('/tasks');
      router.refresh();
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('タスクの削除に失敗しました。もう一度お試しください。');
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleCommentAdded = (newComment: TaskComment) => {
    if (task) {
      setTask({
        ...task,
        comments: [...(task.comments || []), newComment],
      });
    }
  };

  const handleCommentDeleted = (commentId: string) => {
    if (task && task.comments) {
      setTask({
        ...task,
        comments: task.comments.filter(comment => comment.id !== commentId),
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'info';
      case 'completed':
        return 'success';
      case 'review':
        return 'warning';
      case 'todo':
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return '進行中';
      case 'completed':
        return '完了';
      case 'review':
        return 'レビュー中';
      case 'todo':
      default:
        return '未着手';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return priority;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 20) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error || !task) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <p className="text-ink-600">{error || 'タスクが見つかりませんでした'}</p>
          <div className="mt-6">
            <Link href="/tasks">
              <Button>
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                タスク一覧に戻る
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <button 
            onClick={() => router.back()} 
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleEditClick}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-indigo-600"
            aria-label="Edit task"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          
          <button
            onClick={handleDeleteClick}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-600"
            aria-label="Delete task"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant={getStatusBadgeVariant(task.status)}>
              {getStatusLabel(task.status)}
            </Badge>
            
            <Badge variant={getPriorityBadgeVariant(task.priority)}>
              優先度: {getPriorityLabel(task.priority)}
            </Badge>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">説明</h3>
            <p className="text-gray-700 whitespace-pre-line">{task.description || '説明なし'}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">プロジェクト</h3>
              <div className="flex items-center">
                <FolderIcon className="h-5 w-5 text-gray-400 mr-2" />
                <Link href={`/projects/${task.project.id}`} className="text-indigo-600 hover:text-indigo-900">
                  {task.project.name}
                </Link>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">担当者</h3>
              <div className="flex items-center">
                <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-700">
                  {task.assignee ? (task.assignee.fullName || task.assignee.username) : '未割り当て'}
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">期限</h3>
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-700">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ja-JP') : '期限なし'}
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">作成日</h3>
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-700">
                  {new Date(task.createdAt).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <ChartBarIcon className="h-5 w-5 text-gray-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">Progress</span>
              </div>
              <span className="text-sm font-medium text-gray-700">{task.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${getProgressColor(task.progress)}`}
                style={{ width: `${task.progress}%` }}
              ></div>
            </div>
          </div>
          
          {task && (
            <CommentSection 
              taskId={task.id} 
              comments={task.comments || []} 
              onCommentAdded={handleCommentAdded}
              onCommentDeleted={handleCommentDeleted}
            />
          )}
        </CardBody>
      </Card>
      
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
                    タスクの削除
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {task.title} を削除してもよろしいですか？この操作は元に戻せません。
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