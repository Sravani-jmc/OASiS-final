'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { toast } from 'react-hot-toast';

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

export default function NewTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    projectId: searchParams?.get('projectId') || '',
    assigneeId: '',
    assigneeIds: [] as string[],
    progress: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch users and projects on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch projects
        const projectsResponse = await fetch('/api/projects');
        let projectsData: any[] = [];
        
        if (projectsResponse.ok) {
          projectsData = await projectsResponse.json();
          setProjects(projectsData);
          
          // If projectId is in the URL parameters, use it
          const projectIdFromUrl = searchParams?.get('projectId');
          if (projectIdFromUrl && projectsData.some(p => p.id === projectIdFromUrl)) {
            setFormData(prev => ({ ...prev, projectId: projectIdFromUrl }));
          } 
          // Otherwise set first project as default if available
          else if (projectsData.length > 0 && !formData.projectId) {
            setFormData(prev => ({ ...prev, projectId: projectsData[0].id }));
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session, searchParams]);

  // Fetch project members when project is selected
  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (!formData.projectId) {
        setProjectMembers([]);
        setFormData(prev => ({ ...prev, assigneeId: '', assigneeIds: [] }));
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
            
            // Set current user as default assignee if they're a member of the project
            if (session?.user?.id && projectData.members.some((member: any) => member.id === session.user.id)) {
              setFormData(prev => ({ 
                ...prev, 
                assigneeId: session.user.id,
                assigneeIds: [session.user.id]
              }));
            } 
            // Otherwise set the project manager as the assignee
            else if (projectData.manager) {
              setFormData(prev => ({ 
                ...prev, 
                assigneeId: projectData.manager.id,
                assigneeIds: [projectData.manager.id] 
              }));
            }
            // If neither, set the first member if available
            else if (projectData.members.length > 0) {
              setFormData(prev => ({ 
                ...prev, 
                assigneeId: projectData.members[0].id,
                assigneeIds: [projectData.members[0].id]
              }));
            }
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
  }, [formData.projectId, session?.user?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
    const progress = parseInt(e.target.value);
    
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

    // Validate required fields
    const newErrors: Record<string, string> = {};
    if (!formData.title) newErrors.title = 'タスク名は必須です';
    if (!formData.projectId) newErrors.projectId = 'プロジェクトは必須です';
    if (!formData.status) newErrors.status = 'ステータスは必須です';
    if (formData.assigneeIds.length === 0) newErrors.assigneeIds = '少なくとも一人の担当者を選択してください';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      // Set progress based on status
      let progress = formData.progress;
      switch (formData.status) {
        case 'completed':
          progress = 100;
          break;
        case 'in_progress':
          progress = 50;
          break;
        case 'review':
          progress = 75;
          break;
        case 'todo':
          progress = 0;
          break;
      }

      const taskData = {
        ...formData,
        progress,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      };

      console.log('Submitting task data:', taskData);

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.message || t('tasks.createError'));
      }

      const data = await response.json();
      console.log('Task created successfully:', data);
      
      toast.success('タスクが作成されました');
      router.push(`/tasks/${data.id}`);
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error(error instanceof Error ? error.message : t('tasks.createError'));
      setErrors({ submit: error instanceof Error ? error.message : t('tasks.createError') });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-60">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // If no projects are available after loading, show a message
  if (projects.length === 0) {
    return (
      <>
        <PageHeader
          title="新規タスク作成"
          description="新しいタスクの詳細を入力してください"
        />
        <Card>
          <CardBody className="p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                プロジェクトが見つかりません
              </h3>
              <p className="text-gray-600 mb-4">
                タスクを作成するには、まずプロジェクトを作成してください。
              </p>
              {session?.user?.isAdmin ? (
                <Link href="/projects/new">
                  <Button type="button">
                    新規プロジェクト作成
                  </Button>
                </Link>
              ) : (
                <p className="text-sm text-gray-500 mt-2">
                  プロジェクトを作成するには管理者権限が必要です。管理者に連絡してください。
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="新規タスク作成"
        description="新しいタスクの詳細を入力してください"
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
                onChange={handleChange}
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
                  onChange={handleChange}
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
                onChange={handleChange}
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
                  step="5"
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
              disabled={isSubmitting || isLoading || isLoadingMembers}
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