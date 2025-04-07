'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';

// Status options
const statusOptions = [
  { value: 'notStarted', label: '未開始' },
  { value: 'inProgress', label: '進行中' },
  { value: 'onHold', label: '一時停止' },
  { value: 'completed', label: '完了' },
];

// Priority options
const priorityOptions = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

// Mock users for fallback when API fails
const mockUsers = [
  { id: '1', username: 'tanaka', fullName: '田中 太郎' },
  { id: '2', username: 'suzuki', fullName: '鈴木 花子' },
  { id: '3', username: 'sato', fullName: '佐藤 次郎' },
];

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'notStarted',
    priority: 'medium',
    teamId: '',
    memberIds: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect non-admin users and fetch project data
  useEffect(() => {
    const fetchProjectAndSupportingData = async () => {
      try {
        // Fetch project data first
        const projectResponse = await fetch(`/api/projects/${projectId}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        
        if (!projectResponse.ok) {
          if (projectResponse.status === 404) {
            setErrors({ submit: 'プロジェクトが見つかりませんでした' });
          } else {
            throw new Error('Failed to fetch project');
          }
          setIsLoading(false);
          return;
        }
        
        const projectData = await projectResponse.json();
        
        // Check if user has permission to edit
        if (!session?.user?.isAdmin && projectData.managerId !== session?.user?.id) {
          router.push(`/projects/${projectId}`);
          return;
        }
        
        // Format dates for form inputs
        const formatDate = (dateString: string | null) => {
          if (!dateString) return '';
          return new Date(dateString).toISOString().split('T')[0];
        };
        
        // Set form data from project
        setFormData({
          name: projectData.name || '',
          description: projectData.description || '',
          startDate: formatDate(projectData.startDate),
          endDate: formatDate(projectData.endDate),
          status: projectData.status || 'notStarted',
          priority: projectData.priority || 'medium',
          teamId: projectData.teamId || '',
          memberIds: projectData.members?.map((member: any) => member.id) || [],
        });

        // Continue with fetching users and teams
        await fetchUsersAndTeams();
      } catch (error) {
        console.error('Error fetching project data:', error);
        setErrors({ submit: 'プロジェクトデータの読み込みに失敗しました' });
        setIsLoading(false);
      }
    };

    // Fetch users and teams
    const fetchUsersAndTeams = async () => {
      try {
        // Fetch users
        const usersResponse = await fetch('/api/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          if (usersData && usersData.length > 0) {
            setUsers(usersData);
          } else {
            // Fallback to mock users if no users returned
            setUsers(mockUsers);
          }
        } else {
          // Fallback to mock users if API fails
          setUsers(mockUsers);
        }

        // Fetch teams
        const teamsResponse = await fetch('/api/teams');
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          if (teamsData && Array.isArray(teamsData)) {
            setTeams(teamsData);
          }
        }
      } catch (error) {
        console.error('Error fetching users and teams:', error);
        // Fallback to mock users if API fails
        setUsers(mockUsers);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchProjectAndSupportingData();
    }
  }, [session, projectId, router]);

  // Fetch team members when team is selected
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!formData.teamId) {
        setTeamMembers([]);
        setFormData(prev => ({ ...prev, memberIds: [] }));
        return;
      }

      setIsLoadingMembers(true);
      try {
        const response = await fetch(`/api/teams/${formData.teamId}/members`);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data)) {
            setTeamMembers(data);
          } else {
            setTeamMembers([]);
          }
        } else {
          setTeamMembers([]);
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
        setTeamMembers([]);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchTeamMembers();
  }, [formData.teamId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (name: string, value: string[]) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate form
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'プロジェクト名を入力してください';
    if (!formData.startDate) newErrors.startDate = '開始日を入力してください';
    if (!formData.teamId) newErrors.teamId = 'チームを選択してください';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    // Prepare data for submission - ensure memberIds is properly formatted
    const dataToSubmit = {
      ...formData,
      memberIds: formData.memberIds.length > 0 ? formData.memberIds : []
    };

    // Call API to update project
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update project');
      }
      
      // Get the updated project data
      const projectData = await response.json();
      
      // Use router.push instead of router.replace to avoid DOM issues
      router.push('/projects');
    } catch (error) {
      console.error('Failed to update project:', error);
      setErrors({ submit: 'プロジェクトの更新に失敗しました。もう一度お試しください。' });
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

  return (
    <>
      <div className="mb-6">
        <Link href={`/projects/${projectId}`} className="inline-flex items-center text-indigo-600 hover:text-indigo-500">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          プロジェクト詳細に戻る
        </Link>
      </div>

      <PageHeader
        title="プロジェクト編集"
        description="プロジェクトの詳細を更新します"
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
                id="name"
                name="name"
                label="プロジェクト名"
                placeholder="プロジェクト名を入力"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
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

              <div className="sm:col-span-2">
                <Input
                  id="description"
                  name="description"
                  label="説明"
                  placeholder="プロジェクトの説明を入力"
                  value={formData.description}
                  onChange={handleChange}
                  error={errors.description}
                />
              </div>

              <Input
                id="startDate"
                name="startDate"
                type="date"
                label="開始日"
                value={formData.startDate}
                onChange={handleChange}
                error={errors.startDate}
                required
              />

              <Input
                id="endDate"
                name="endDate"
                type="date"
                label="終了日"
                value={formData.endDate}
                onChange={handleChange}
                error={errors.endDate}
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

              <Select
                id="teamId"
                name="teamId"
                label="チーム"
                options={teams.map(team => ({ value: team.id, label: team.name }))}
                value={formData.teamId}
                onChange={(value) => handleSelectChange('teamId', value)}
                error={errors.teamId}
                required
                emptyOptionLabel="チームを選択"
              />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">メンバー</h3>
              {isLoadingMembers ? (
                <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
              ) : teamMembers.length > 0 ? (
                <div className="bg-white p-4 border border-gray-200 rounded-md space-y-2 max-h-60 overflow-y-auto">
                  {teamMembers.map((member, index) => (
                    <div key={`edit-project-member-${member.id}-${index}`} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`edit-project-member-${member.id}`}
                        value={member.id}
                        checked={formData.memberIds.includes(member.id)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            memberIds: isChecked
                              ? [...prev.memberIds, member.id]
                              : prev.memberIds.filter(id => id !== member.id)
                          }));
                        }}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <label htmlFor={`edit-project-member-${member.id}`} className="text-sm font-medium text-ink-700">
                        {member.fullName || member.username}
                      </label>
                    </div>
                  ))}
                </div>
              ) : formData.teamId ? (
                <div className="text-sm text-gray-500">このチームにはメンバーがいません</div>
              ) : (
                <div className="text-sm text-gray-500">メンバーを表示するにはチームを選択してください</div>
              )}
              {errors.memberIds && (
                <p className="mt-1 text-sm text-sakura-600">{errors.memberIds}</p>
              )}
            </div>
          </CardBody>

          <CardFooter className="flex justify-between">
            <Link href="/projects">
              <Button type="button" variant="secondary">キャンセル</Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '更新中...' : 'プロジェクトを更新'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
} 