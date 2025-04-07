'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusIcon, 
  ChevronDownIcon,
  FunnelIcon,
  ArrowPathIcon,
  MegaphoneIcon,
  ExclamationCircleIcon,
  BookmarkIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Select } from '@/components/ui';

// Types for bulletins
interface Bulletin {
  id: string;
  title: string;
  content: string;
  category?: string;
  importance?: string;
  createdAt: string;
  updatedAt?: string;
  pinned: boolean;
  author: {
    id: string;
    name: string;
  };
  comments?: {
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
    };
  }[];
}

const categoryOptions = [
  { value: 'all', label: '全て' },
  { value: 'announcement', label: 'お知らせ' },
  { value: 'system', label: 'システム' },
  { value: 'general', label: '一般' },
  { value: 'facility', label: '設備' }
];

const importanceOptions = [
  { value: 'all', label: '全て' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' }
];

export default function BulletinsPage() {
  const [loading, setLoading] = useState(true);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [filters, setFilters] = useState({
    category: 'all',
    importance: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBulletins = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters based on filters
      const queryParams = new URLSearchParams();
      if (filters.category !== 'all') {
        queryParams.append('category', filters.category);
      }
      
      const response = await fetch(`/api/bulletins?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch bulletins');
      }
      
      const data = await response.json();
      setBulletins(data);
    } catch (err) {
      console.error('Error fetching bulletins:', err);
      setError('掲示板の読み込みに失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBulletins();
    
    // Auto-refresh every 5 minutes
    const intervalId = setInterval(() => {
      fetchBulletins();
    }, 300000);
    
    return () => clearInterval(intervalId);
  }, [filters.category, filters.importance]);

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      category: 'all',
      importance: 'all',
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBulletins();
  };

  const filteredBulletins = bulletins.filter(bulletin => {
    if (filters.category !== 'all' && filters.category && bulletin.category !== filters.category) return false;
    if (filters.importance !== 'all' && filters.importance && bulletin.importance !== filters.importance) return false;
    return true;
  });

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

  return (
    <>
      <PageHeader
        title="掲示板"
        description="会社のお知らせと部署間の情報共有"
        actions={
          <Link href="/bulletins/new">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              新規投稿
            </Button>
          </Link>
        }
      />

      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFilters}
              className="mr-2"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              フィルター
              <ChevronDownIcon className={`h-4 w-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
            {(filters.category !== 'all' || filters.importance !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                リセット
              </Button>
            )}
          </div>
          <div className="text-sm text-ink-500">
            {filteredBulletins.length} 件の投稿
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardBody className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Select
                id="category-filter"
                label="カテゴリー"
                options={categoryOptions}
                value={filters.category}
                onChange={(value) => handleFilterChange('category', value)}
              />
              <Select
                id="importance-filter"
                label="重要度"
                options={importanceOptions}
                value={filters.importance}
                onChange={(value) => handleFilterChange('importance', value)}
              />
            </div>
          </CardBody>
        )}
      </Card>

      <div className="space-y-4">
        {filteredBulletins.map((bulletin) => (
          <Card key={bulletin.id} className={bulletin.pinned ? 'border-l-4 border-indigo-500' : ''}>
            <CardBody>
              <div className="sm:flex sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    {bulletin.pinned && (
                      <BookmarkIcon className="h-5 w-5 text-indigo-500" />
                    )}
                    <Link 
                      href={`/bulletins/${bulletin.id}`}
                      className="text-lg font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      {bulletin.title}
                    </Link>
                    <Badge 
                      variant={getCategoryBadgeVariant(bulletin.category)} 
                      size="sm"
                    >
                      {getCategoryLabel(bulletin.category)}
                    </Badge>
                    <Badge 
                      variant={getImportanceBadgeVariant(bulletin.importance)} 
                      size="sm"
                    >
                      {getImportanceLabel(bulletin.importance)}
                    </Badge>
                  </div>
                  <p className="text-ink-600 mb-3 line-clamp-2">{bulletin.content}</p>
                  
                  {bulletin.comments && bulletin.comments.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">コメント:</h4>
                      <ul className="space-y-2">
                        {bulletin.comments.map(comment => (
                          <li key={comment.id} className="text-sm">
                            <div className="flex items-center mb-1">
                              <UserIcon className="h-4 w-4 text-gray-500 mr-1" />
                              <span className="font-medium mr-2">{comment.author.name}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.createdAt).toLocaleString('ja-JP')}
                              </span>
                            </div>
                            <p className="text-gray-700 ml-5">{comment.content}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center text-xs text-ink-500 gap-x-4">
                    <div className="flex items-center">
                      <UserIcon className="h-3.5 w-3.5 mr-1" />
                      {bulletin.author.name}
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                      {new Date(bulletin.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                    {bulletin.updatedAt && (
                      <div className="italic">
                        更新: {new Date(bulletin.updatedAt).toLocaleDateString('ja-JP')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 sm:mt-0 flex flex-shrink-0 space-x-2">
                  <Link href={`/bulletins/${bulletin.id}`}>
                    <Button variant="outline" size="sm">詳細</Button>
                  </Link>
                  <Link href={`/bulletins/${bulletin.id}/edit`}>
                    <Button variant="secondary" size="sm">編集</Button>
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}

        {filteredBulletins.length === 0 && (
          <Card>
            <CardBody className="text-center py-12">
              <MegaphoneIcon className="mx-auto h-12 w-12 text-ink-300" />
              <p className="mt-4 text-ink-600">
                {filters.category !== 'all' || filters.importance !== 'all'
                  ? 'フィルター条件に一致する投稿はありません'
                  : '投稿がありません'}
              </p>
              <div className="mt-6">
                <Link href="/bulletins/new">
                  <Button>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    新規投稿作成
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
} 