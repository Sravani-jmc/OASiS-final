'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui';
import { Switch } from '@/components/ui/Switch';
import { Loading } from '@/components/ui/Loading';

const categoryOptions = [
  { value: 'announcement', label: 'お知らせ' },
  { value: 'system', label: 'システム' },
  { value: 'general', label: '一般' },
  { value: 'facility', label: '設備' }
];

const importanceOptions = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' }
];

export default function EditBulletinPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    importance: '',
    pinned: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        
        setFormData({
          title: data.title,
          content: data.content,
          category: data.category || '',
          importance: data.importance || '',
          pinned: data.pinned || false,
        });
      } catch (err) {
        console.error('Error fetching bulletin:', err);
        setError(err instanceof Error ? err.message : 'Failed to load bulletin');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBulletin();
  }, [params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    // Validate form
    const newErrors: Record<string, string> = {};
    if (!formData.title) newErrors.title = 'タイトルを入力してください';
    if (!formData.content) newErrors.content = '内容を入力してください';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    // Call API to update bulletin
    try {
      const response = await fetch(`/api/bulletins/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update bulletin');
      }
      
      // Redirect to bulletin detail page on success
      router.push(`/bulletins/${params.id}`);
      router.refresh();
    } catch (error) {
      console.error('Failed to update bulletin:', error);
      setErrors({ submit: '掲示の更新に失敗しました。もう一度お試しください。' });
      setIsSubmitting(false);
    }
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

  return (
    <>
      <div className="mb-6">
        <Link href={`/bulletins/${params.id}`} className="inline-flex items-center text-indigo-600 hover:text-indigo-500">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          掲示詳細に戻る
        </Link>
      </div>

      <PageHeader
        title="掲示を編集"
        description="掲示の内容を更新します"
      />

      <Card>
        <form onSubmit={handleSubmit}>
          <CardBody className="space-y-6">
            {errors.submit && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                {errors.submit}
              </div>
            )}
            
            <div>
              <Input
                id="title"
                name="title"
                label="タイトル"
                placeholder="掲示のタイトルを入力"
                value={formData.title}
                onChange={handleChange}
                error={errors.title}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                内容
              </label>
              <textarea
                id="content"
                name="content"
                rows={6}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="掲示の内容を入力"
                value={formData.content}
                onChange={handleChange}
                required
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                id="category"
                label="カテゴリ"
                options={categoryOptions}
                value={formData.category}
                onChange={(value) => handleSelectChange('category', value)}
              />

              <Select
                id="importance"
                label="重要度"
                options={importanceOptions}
                value={formData.importance}
                onChange={(value) => handleSelectChange('importance', value)}
              />
            </div>

            <div className="flex items-center">
              <Switch
                id="pinned"
                checked={formData.pinned}
                onChange={(checked) => handleSwitchChange('pinned', checked)}
                label="この掲示を固定表示する"
              />
            </div>
          </CardBody>

          <CardFooter className="flex justify-end space-x-3">
            <Link href={`/bulletins/${params.id}`}>
              <Button type="button" variant="secondary">キャンセル</Button>
            </Link>
            <Button 
              type="submit" 
              isLoading={isSubmitting}
            >
              更新
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
} 