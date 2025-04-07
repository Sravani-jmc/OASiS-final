'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui';
import Link from 'next/link';
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

export default function NewProjectPage() {
  const router = useRouter();
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

  // Redirect non-admin users
  useEffect(() => {
    if (session && !session.user.isAdmin) {
      router.push('/projects');
    }
  }, [session, router]);

  // Fetch users and teams on component mount
  useEffect(() => {
    const fetchData = async () => {
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
        console.error('Error fetching data:', error);
        // Fallback to mock users if API fails
        setUsers(mockUsers);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session]);

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

    // Call API to create project
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }
      
      // Get the created project data
      const projectData = await response.json();
      
      // Use router.push instead of router.replace to avoid DOM issues
      router.push('/projects');
    } catch (error) {
      console.error('Failed to create project:', error);
      setErrors({ submit: 'プロジェクトの作成に失敗しました。もう一度お試しください。' });
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
      <PageHeader
        title="新規プロジェクト作成"
        description="新しいプロジェクトの詳細を入力してください"
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
                label="終了予定日"
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

              {teams.length > 0 ? (
                <Select
                  id="teamId"
                  name="teamId"
                  label="チーム"
                  options={teams.map(team => ({ value: team.id, label: team.name }))}
                  value={formData.teamId}
                  onChange={(value) => handleSelectChange('teamId', value)}
                  error={errors.teamId}
                  required
                />
              ) : (
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">チーム <span className="text-red-500">*</span></label>
                  <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-500">チームがありません。先にチームを作成してください。</p>
                    <Link href="/teams/new" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium mt-1 inline-block">
                      チームを作成する
                    </Link>
                  </div>
                  {errors.teamId && <p className="mt-1 text-sm text-red-600">{errors.teamId}</p>}
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">メンバー</label>
                {isLoadingMembers ? (
                  <div className="mt-1 p-4 bg-white border border-gray-300 rounded-md flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-t-2 border-b-2 border-indigo-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-500">チームメンバーを読み込み中...</span>
                  </div>
                ) : formData.teamId ? (
                  teamMembers.length > 0 ? (
                    <div className="mt-1 p-4 bg-white border border-gray-300 rounded-md">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {teamMembers.map((member, index) => (
                          <div key={`new-project-member-${member.id}-${index}`} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`new-project-member-${member.id}`}
                              value={member.id}
                              checked={formData.memberIds.includes(member.id)}
                              onChange={(e) => {
                                const memberId = e.target.value;
                                const isChecked = e.target.checked;
                                
                                setFormData(prev => ({
                                  ...prev,
                                  memberIds: isChecked
                                    ? [...prev.memberIds, memberId]
                                    : prev.memberIds.filter(id => id !== memberId)
                                }));
                              }}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`new-project-member-${member.id}`} className="ml-2 block text-sm text-gray-900">
                              {member.fullName || member.username}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-sm text-gray-500">選択したチームにメンバーがいません。チームにメンバーを追加してください。</p>
                    </div>
                  )
                ) : (
                  <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-500">先にチームを選択すると、メンバーが表示されます。</p>
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
              disabled={isSubmitting}
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