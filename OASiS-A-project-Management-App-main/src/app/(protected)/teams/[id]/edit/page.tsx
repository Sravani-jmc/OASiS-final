'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowLeftIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';

// Define types for team and users
interface Team {
  id: string;
  name: string;
  description: string | null;
  userRole?: string;
  members?: TeamMember[];
}

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  user: User;
}

interface User {
  id: string;
  username: string;
  fullName: string | null;
  email: string;
  position?: string | null;
  department?: string | null;
}

export default function EditTeamPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Team>({
    id: '',
    name: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<{[key: string]: string}>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [removedUserIds, setRemovedUserIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/teams/${params.id}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch team');
        }
        
        const data = await response.json();
        
        setFormData({
          id: data.team.id,
          name: data.team.name,
          description: data.team.description,
          userRole: data.userRole,
          members: data.team.members
        });
        
        // Initialize team members
        if (data.team.members && Array.isArray(data.team.members)) {
          setTeamMembers(data.team.members);
          
          // Initialize user roles from existing members
          const roles: {[key: string]: string} = {};
          data.team.members.forEach((member: TeamMember) => {
            roles[member.user.id] = member.role;
          });
          setUserRoles(roles);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch team:', err);
        setError('チームの取得に失敗しました');
        setLoading(false);
      }
    };

    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const response = await fetch('/api/users', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setAllUsers(data);
        setUsersLoading(false);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setUsersLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchTeam();
      fetchUsers();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [params.id, router, status]);

  // Update available users when team members or all users change
  useEffect(() => {
    // Extract existing team member IDs
    const memberIds = teamMembers.map(member => member.user.id);
    
    // Filter out users who are already team members
    const available = allUsers.filter(user => 
      !memberIds.includes(user.id) &&
      !selectedUsers.some(selected => selected.id === user.id)
    );
    
    setAvailableUsers(available);
  }, [teamMembers, allUsers, selectedUsers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUserSelect = (user: User) => {
    setSelectedUsers(prev => {
      // Check if user is already selected
      if (prev.some(u => u.id === user.id)) {
        return prev;
      }
      return [...prev, user];
    });

    // Set default role to 'member'
    setUserRoles(prev => ({
      ...prev,
      [user.id]: 'member'
    }));
  };

  const handleRemoveUser = (userId: string) => {
    // Remove from selected users
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
    
    // Track removed users
    setRemovedUserIds(prev => [...prev, userId]);
    
    // Remove user role
    setUserRoles(prev => {
      const newRoles = {...prev};
      delete newRoles[userId];
      return newRoles;
    });
  };

  const handleRoleChange = (userId: string, role: string) => {
    setUserRoles(prev => ({
      ...prev,
      [userId]: role
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.name.trim()) {
        throw new Error('チーム名は必須です');
      }

      // Prepare data for submission
      const updateData = {
        name: formData.name,
        description: formData.description,
        addedMembers: selectedUsers.map(user => ({
          userId: user.id,
          role: userRoles[user.id] || 'member'
        })),
        updatedRoles: teamMembers
          .filter(member => !removedUserIds.includes(member.user.id))
          .map(member => ({
            userId: member.user.id,
            role: userRoles[member.user.id] || member.role
          })),
        removedUserIds
      };

      // Send request to update the team
      const response = await fetch(`/api/teams/${params.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update team');
      }

      setSuccess('チームが正常に更新されました');

      // Redirect to the team details page after a short delay
      setTimeout(() => {
        router.push(`/teams/${params.id}`);
      }, 1500);
    } catch (error) {
      console.error('Failed to update team:', error);
      setError(error instanceof Error ? error.message : 'チームの更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter users for search
  const filteredUsers = availableUsers.filter(user => 
    (user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <div className="mb-6">
        <Link href={`/teams/${params.id}`} className="inline-flex items-center text-indigo-600 hover:text-indigo-500">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          チーム詳細に戻る
        </Link>
      </div>

      <PageHeader
        title="チーム編集"
        description="チーム情報を更新する"
      />

      <Card>
        <form onSubmit={handleSubmit}>
          <CardBody className="space-y-6">
            {error && (
              <div className="bg-sakura-50 border border-sakura-400 text-sakura-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-matcha-50 border border-matcha-400 text-matcha-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{success}</span>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ink-700 mb-1">
                チーム名 *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-ink-700 mb-1">
                説明
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="チームの説明（任意）"
                value={formData.description || ''}
                onChange={handleChange}
              />
              <p className="mt-1 text-sm text-gray-500">
                プロジェクトの目的や、チームの役割などを記載してください。
              </p>
            </div>

            {/* Current Team Members Section */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-ink-900 mb-3">現在のチームメンバー</h3>
              
              {teamMembers.length > 0 ? (
                <div className="mb-4">
                  <ul className="space-y-2">
                    {teamMembers
                      .filter(member => !removedUserIds.includes(member.user.id))
                      .map(member => (
                        <li key={member.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-700">{member.user.fullName || member.user.username}</p>
                              <p className="text-xs text-gray-500">{member.user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <select
                              className="text-sm border-gray-300 rounded-md mr-2"
                              value={userRoles[member.user.id] || member.role}
                              onChange={(e) => handleRoleChange(member.user.id, e.target.value)}
                            >
                              <option value="member">メンバー</option>
                              <option value="admin">管理者</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(member.user.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-4">現在メンバーはいません</p>
              )}
            </div>

            {/* New Team Members Section */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-ink-900 mb-3">新しいメンバーを追加</h3>
              
              {selectedUsers.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">追加するメンバー:</h4>
                  <ul className="space-y-2">
                    {selectedUsers.map(user => (
                      <li key={user.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-700">{user.fullName || user.username}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <select
                            className="text-sm border-gray-300 rounded-md mr-2"
                            value={userRoles[user.id] || 'member'}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          >
                            <option value="member">メンバー</option>
                            <option value="admin">管理者</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveUser(user.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowUserSelection(!showUserSelection)}
                  className="mb-4"
                >
                  {showUserSelection ? 'メンバー選択を閉じる' : 'メンバーを追加'}
                </Button>
                
                {showUserSelection && (
                  <div className="border border-gray-200 rounded-md p-4">
                    <div className="mb-4">
                      <label htmlFor="search-users" className="block text-sm font-medium text-gray-700">
                        ユーザーを検索
                      </label>
                      <input
                        type="text"
                        id="search-users"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="名前、ユーザー名、メールで検索"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    {usersLoading ? (
                      <div className="text-center py-4">
                        <div className="spinner"></div>
                        <p className="text-sm text-gray-500 mt-2">読み込み中...</p>
                      </div>
                    ) : filteredUsers.length > 0 ? (
                      <ul className="max-h-60 overflow-y-auto space-y-2">
                        {filteredUsers.map(user => (
                          <li key={user.id}>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 flex items-center"
                              onClick={() => handleUserSelect(user)}
                            >
                              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-indigo-600" />
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-700">{user.fullName || user.username}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 py-4 text-center">
                        {searchTerm ? '該当するユーザーが見つかりません' : 'ユーザーが見つかりません'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardBody>

          <CardFooter className="flex justify-end space-x-3">
            <Link href={`/teams/${params.id}`}>
              <Button type="button" variant="secondary">キャンセル</Button>
            </Link>
            <Button type="submit" isLoading={isSubmitting}>保存</Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
} 