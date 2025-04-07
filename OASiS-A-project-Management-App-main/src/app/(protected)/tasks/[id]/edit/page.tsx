'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui';
import { Loading } from '@/components/ui/Loading';
import { useSession } from 'next-auth/react';

// Status options
const statusOptions = [
  { value: 'todo', label: '未着手' },
  { value: 'in_progress', label: '進行中' },
  { value: 'review', label: 'レビュー中' },
  { value: 'completed', label: '完了' },
];

// Priority options
const priorityOptions = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

export default function EditTaskPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const taskId = params.id;
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    dueDate: '',
    projectId: '',
    assigneeId: '',
    assigneeIds: [] as string[],
    progress: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch task and related data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch task data
        const taskResponse = await fetch(`/api/tasks/${taskId}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        
        if (!taskResponse.ok) {
          if (taskResponse.status === 404) {
            setErrors({ submit: 'タスクが見つかりませんでした' });
          } else {
            throw new Error('Failed to fetch task');
          }
          setLoading(false);
          return;
        }
        
        const taskData = await taskResponse.json();
        
        // Format date for form input
        const formatDate = (dateString: string | null) => {
          if (!dateString) return '';
          return new Date(dateString).toISOString().split('T')[0];
        };
        
        // Set form data from task
        setFormData({
          title: taskData.title || '',
          description: taskData.description || '',
          status: taskData.status || 'todo',
          priority: taskData.priority || 'medium',
          dueDate: formatDate(taskData.dueDate),
          projectId: taskData.projectId || '',
          assigneeId: taskData.assigneeId || '',
          assigneeIds: taskData.assigneeIds || (taskData.assigneeId ? [taskData.assigneeId] : []),
          progress: taskData.progress || 0,
        });

        // Fetch projects
        const projectsResponse = await fetch('/api/projects');
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          if (projectsData && Array.isArray(projectsData)) {
            setProjects(projectsData);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setErrors({ submit: 'データの読み込みに失敗しました' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [taskId]);

  // Fetch project members when project is selected or changed
  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (!formData.projectId) {
        setProjectMembers([]);
        return;
      }

      setIsLoadingMembers(true);
      try {
        // Fetch the project details which includes members
        const response = await fetch(`/api/projects/${formData.projectId}`);
        if (response.ok) {
          const projectData = await response.json();
          if (projectData && projectData.members && Array.isArray(projectData.members)) {
            setProjectMembers(projectData.members);
          }
        }
      } catch (error) {
        console.error('Error fetching project members:', error);
        setProjectMembers([]);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchProjectMembers();
  }, [formData.projectId]);

  const handleSelectChange = (name: string, value: string) => {
    // If status is changed to completed, set progress to 100
    if (name === 'status' && value === 'completed') {
      setFormData((prev) => ({ ...prev, [name]: value, progress: 100 }));
    } else if (name === 'status' && value === 'todo') {
      // If status is changed to todo, set progress to 0
      setFormData((prev) => ({ ...prev, [name]: value, progress: 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get the exact progress value directly from the input
    const progress = parseInt(e.target.value, 10);
    
    // Update status based on progress
    let status = formData.status;
    if (progress === 0) {
      status = 'todo';
    } else if (progress === 100) {
      status = 'completed';
    } else if (progress > 0) {
      status = 'in_progress';
    }
    
    setFormData((prev) => ({ 
      ...prev, 
      progress, 
      status 
    }));
  };

  // Add a handler for checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    setFormData(prev => {
      // Update the assigneeIds array
      const newAssigneeIds = checked
        ? [...prev.assigneeIds, value]
        : prev.assigneeIds.filter(id => id !== value);
      
      // Also update assigneeId (for backward compatibility) with the first selected ID or empty
      const newAssigneeId = newAssigneeIds.length > 0 ? newAssigneeIds[0] : '';
      
      return {
        ...prev,
        assigneeIds: newAssigneeIds,
        assigneeId: newAssigneeId
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate form
    const newErrors: Record<string, string> = {};
    if (!formData.title) newErrors.title = 'タスク名を入力してください';
    if (!formData.projectId) newErrors.projectId = 'プロジェクトを選択してください';
    if (formData.assigneeIds.length === 0) newErrors.assigneeIds = '少なくとも一人の担当者を選択してください';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    // Call API to update task
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task');
      }
      
      // Redirect to task detail page on success
      router.push(`/tasks/${taskId}`);
    } catch (error) {
      console.error('Failed to update task:', error);
      setErrors({ submit: 'タスクの更新に失敗しました。もう一度お試しください。' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <div className="mb-6">
        <Link href={`/tasks/${taskId}`} className="inline-flex items-center text-indigo-600 hover:text-indigo-500">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          タスク詳細に戻る
        </Link>
      </div>

      <PageHeader
        title="タスク編集"
        description="タスクの詳細を更新します"
      />

      <Card>
        <form onSubmit={handleSubmit}>
          <CardBody className="space-y-6">
            {errors.submit && (
              <div className="bg-sakura-50 border border-sakura-400 text-sakura-700 px-4 py-3 rounded relative">
                {errors.submit}
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                id="title"
                name="title"
                label="タスク名"
                placeholder="タスク名を入力"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                error={errors.title}
                required
                className="sm:col-span-2"
              />

              <div className="sm:col-span-2">
                <Input
                  id="description"
                  name="description"
                  label="説明"
                  placeholder="タスクの説明を入力"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  error={errors.description}
                />
              </div>

              <Select
                id="projectId"
                name="projectId"
                label="プロジェクト"
                options={projects.map(project => ({ value: project.id, label: project.name }))}
                value={formData.projectId}
                onChange={(value) => handleSelectChange('projectId', value)}
                error={errors.projectId}
                required
              />

              <Select
                id="status"
                name="status"
                label="ステータス"
                options={statusOptions}
                value={formData.status}
                onChange={(value) => handleSelectChange('status', value)}
                error={errors.status}
              />

              <Select
                id="priority"
                name="priority"
                label="優先度"
                options={priorityOptions}
                value={formData.priority}
                onChange={(value) => handleSelectChange('priority', value)}
                error={errors.priority}
              />

              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                label="期限"
                value={formData.dueDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                error={errors.dueDate}
              />

              <div className="sm:col-span-2">
                <label htmlFor="progress" className="block text-sm font-medium text-gray-700 mb-1">
                  進捗 ({formData.progress}%)
                </label>
                <input
                  type="range"
                  id="progress"
                  name="progress"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.progress}
                  onChange={handleProgressChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer max-w-md mx-auto"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
                {isLoadingMembers ? (
                  <div className="mt-1 p-4 bg-white border border-gray-300 rounded-md flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-indigo-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-500">プロジェクトメンバーを読み込み中...</span>
                  </div>
                ) : formData.projectId ? (
                  projectMembers.length > 0 ? (
                    <div className="mt-1 p-4 bg-white border border-gray-300 rounded-md">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {projectMembers.map(member => (
                          <div key={member.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`member-${member.id}`}
                              name="assigneeIds"
                              value={member.id}
                              checked={formData.assigneeIds.includes(member.id)}
                              onChange={handleCheckboxChange}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`member-${member.id}`} className="ml-2 block text-sm text-gray-900">
                              {member.fullName || member.username}
                            </label>
                          </div>
                        ))}
                      </div>
                      {errors.assigneeIds && <p className="mt-1 text-sm text-red-600">{errors.assigneeIds}</p>}
                    </div>
                  ) : (
                    <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-sm text-gray-500">選択したプロジェクトにメンバーがいません。まずプロジェクトにメンバーを追加してください。</p>
                    </div>
                  )
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-500">先にプロジェクトを選択すると、担当者を選択できます。</p>
                  </div>
                )}
              </div>
            </div>
          </CardBody>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || loading || isLoadingMembers}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                  保存中...
                </>
              ) : '保存'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
} 