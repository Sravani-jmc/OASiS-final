'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PencilIcon, 
  TrashIcon,
  ArrowLeftIcon,
  CalendarIcon,
  UserIcon,
  BookmarkIcon,
  PaperClipIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Input } from '@/components/ui';

// Types
interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
}

interface Bulletin {
  id: string;
  title: string;
  content: string;
  category?: string;
  importance?: string;
  createdAt: string;
  updatedAt?: string;
  author: {
    id: string;
    name: string;
  };
  pinned: boolean;
  comments?: Comment[];
}

export default function BulletinDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBulletin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/bulletins/${params.id}`, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Bulletin not found');
        }
        throw new Error('Failed to fetch bulletin');
      }
      
      const data = await response.json();
      setBulletin(data);
    } catch (err) {
      console.error('Error fetching bulletin:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bulletin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBulletin();
  }, [params.id]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/bulletins/${params.id}/comments`, {
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
      
      // Update local state with the new comment
      if (bulletin) {
        setBulletin({
          ...bulletin,
          comments: [...(bulletin.comments || []), newComment],
        });
      }
      
      setComment('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/bulletins/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete bulletin');
      }

      router.push('/bulletins');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete bulletin:', error);
      setIsDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const getCategoryLabel = (category?: string) => {
    if (!category) return 'その他';
    
    switch (category) {
      case 'announcement':
        return 'お知らせ';
      case 'system':
        return 'システム';
      case 'general':
        return '一般';
      case 'facility':
        return '設備';
      default:
        return category;
    }
  };

  const getCategoryBadgeVariant = (category?: string) => {
    if (!category) return 'default';
    
    switch (category) {
      case 'announcement':
        return 'info';
      case 'system':
        return 'warning';
      case 'general':
        return 'default';
      case 'facility':
        return 'success';
      default:
        return 'default';
    }
  };

  const getImportanceBadgeVariant = (importance?: string) => {
    if (!importance) return 'default';
    
    switch (importance) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getImportanceLabel = (importance?: string) => {
    if (!importance) return '通常';
    
    switch (importance) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return importance;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <p className="text-sakura-600 mb-4">{error}</p>
          <div className="mt-6">
            <Link href="/bulletins">
              <Button>
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                掲示板に戻る
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!bulletin) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <p className="text-ink-600">投稿が見つかりませんでした</p>
          <div className="mt-6">
            <Link href="/bulletins">
              <Button>
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                掲示板に戻る
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Link href="/bulletins" className="inline-flex items-center text-indigo-600 hover:text-indigo-500">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          掲示板に戻る
        </Link>
      </div>

      <PageHeader
        title={bulletin.title}
        actions={
          <div className="flex space-x-2">
            <Link href={`/bulletins/${bulletin.id}/edit`}>
              <Button>
                <PencilIcon className="h-4 w-4 mr-2" />
                編集
              </Button>
            </Link>
            <Button 
              variant="danger" 
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              {deleteConfirm ? '削除確認' : '削除'}
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              {bulletin.pinned && (
                <BookmarkIcon className="h-5 w-5 text-indigo-500" />
              )}
              {bulletin.category && (
                <Badge variant={getCategoryBadgeVariant(bulletin.category)}>
                  {getCategoryLabel(bulletin.category)}
                </Badge>
              )}
              {bulletin.importance && (
                <Badge variant={getImportanceBadgeVariant(bulletin.importance)}>
                  {getImportanceLabel(bulletin.importance)}
                </Badge>
              )}
              <div className="flex-grow"></div>
              <div className="flex items-center text-sm text-ink-500">
                <UserIcon className="h-4 w-4 mr-1" />
                {bulletin.author.name}
              </div>
              <div className="flex items-center text-sm text-ink-500">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {new Date(bulletin.createdAt).toLocaleDateString('ja-JP')}
              </div>
              {bulletin.updatedAt && (
                <div className="text-sm text-ink-500 italic">
                  更新: {new Date(bulletin.updatedAt).toLocaleDateString('ja-JP')}
                </div>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              <div className="prose prose-indigo max-w-none">
                {bulletin.content.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-ink-900">
              <ChatBubbleLeftRightIcon className="h-5 w-5 inline-block mr-2 text-ink-400" />
              コメント ({bulletin.comments?.length || 0})
            </h2>
          </CardHeader>
          <CardBody>
            {bulletin.comments && bulletin.comments.length > 0 ? (
              <div className="space-y-4">
                {bulletin.comments.map((comment) => (
                  <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium text-ink-900">{comment.author.name}</span>
                      <span className="text-sm text-ink-500">
                        {new Date(comment.createdAt).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <p className="text-ink-600">{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-ink-500 py-4">コメントはありません</p>
            )}

            <form onSubmit={handleCommentSubmit} className="mt-6">
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
          </CardBody>
        </Card>
      </div>
    </>
  );
} 