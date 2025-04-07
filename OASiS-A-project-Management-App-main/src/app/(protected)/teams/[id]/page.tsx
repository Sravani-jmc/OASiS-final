'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  UserCircleIcon,
  EnvelopeIcon,
  FolderIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { useSession } from 'next-auth/react';
import { Tab } from '@headlessui/react';
import TeamChat from '@/components/chat/TeamChat';

// Types for team and members
interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    fullName?: string | null;
    department?: string | null;
    position?: string | null;
  };
}

interface Team {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  owner: {
    id: string;
    username: string;
    fullName?: string | null;
  };
  members?: TeamMember[];
  _count: {
    members: number;
    projects: number;
  };
  userRole?: string;
}

export default function TeamDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [error, setError] = useState<string | null>(null);

  // Function to fetch team data
  const fetchTeamData = async () => {
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
        throw new Error('Failed to fetch team details');
      }
      
      const data = await response.json();
      setTeam(data.team);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching team details:', err);
      setError('Failed to load team details. Please try again later.');
      setLoading(false);
    }
    };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTeamData();
    }
  }, [params.id, status]);

  // New function to handle joining a team
  const handleJoinTeamRequest = async () => {
    try {
      setIsSubmitting(true);
      setMessage({ type: '', text: '' });

      const response = await fetch(`/api/teams/${params.id}/join-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'チームへの参加リクエストに失敗しました');
      }

      setMessage({
        type: 'success',
        text: `チームへの参加リクエストを送信しました。管理者の承認をお待ちください。`
      });
    } catch (error) {
      console.error('Failed to request joining team:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'チームへの参加リクエストに失敗しました'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!team) return;

    try {
      // Send request to API to update member role
      const response = await fetch(`/api/teams/${params.id}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update member role');
      }
      
      // Update the UI
      setTeam({
        ...team,
        members: team.members?.map(member => 
          member.id === memberId 
            ? { ...member, role: newRole } 
            : member
        )
      });

      setMessage({
        type: 'success',
        text: 'メンバーのロールを更新しました'
      });
    } catch (error) {
      console.error('Failed to update member role:', error);
      setMessage({
        type: 'error',
        text: 'ロールの更新に失敗しました'
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team) return;

    try {
      // Confirm before removing
      if (!confirm('このメンバーをチームから削除しますか？')) {
        return;
      }
      
      // Send request to API to remove member
      const response = await fetch(`/api/teams/${params.id}/members/${memberId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove team member');
      }

      // Update the UI
      setTeam({
        ...team,
        members: team.members?.filter(member => member.id !== memberId),
        _count: {
          ...team._count,
          members: (team._count.members || 0) - 1
        }
      });

      setMessage({
        type: 'success',
        text: 'メンバーをチームから削除しました'
      });
    } catch (error) {
      console.error('Failed to remove team member:', error);
      setMessage({
        type: 'error',
        text: 'メンバーの削除に失敗しました'
      });
    }
  };

  const handleDeleteTeam = async () => {
    if (!isDeleteModalOpen) {
      setIsDeleteModalOpen(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // In a real app, you would send a request to delete the team
      // For demo, we'll simulate an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      router.push('/teams');
    } catch (error) {
      console.error('Failed to delete team:', error);
      setMessage({
        type: 'error',
        text: 'チームの削除に失敗しました'
      });
      setIsSubmitting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'success';
      case 'admin':
        return 'info';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'オーナー';
      case 'admin':
        return '管理者';
      default:
        return 'メンバー';
    }
  };

  // Add a Join Team button in the team header
  const renderTeamHeaderActions = () => {
    // If user is not a member (has viewer role), show join button
    if (team?.userRole === 'viewer') {
      return (
        <Button
          onClick={handleJoinTeamRequest}
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          チームに参加する
        </Button>
      );
    }
    
    // For team owners and admins, show invite button
    if (team?.userRole === 'owner' || team?.userRole === 'admin') {
      return (
        <Link href={`/teams/${team.id}/invite`}>
          <Button>
            <UserPlusIcon className="h-5 w-5 mr-2" />
            メンバーを招待
          </Button>
        </Link>
      );
    }
    
    return null;
  };

  if (loading) {
    return <Loading />;
  }

  if (!team) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <p className="text-ink-600">チームが見つかりませんでした</p>
          <div className="mt-6">
            <Link href="/teams">
              <Button>
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                チーム一覧に戻る
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
        <Link href="/teams" className="inline-flex items-center text-indigo-600 hover:text-indigo-500">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          チーム一覧に戻る
        </Link>
      </div>

      {error && (
        <div className="bg-sakura-50 border border-sakura-400 text-sakura-700 px-4 py-3 rounded-md mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {message.text && (
        <div
          className={`px-4 py-3 rounded-md mb-6 ${
            message.type === 'success' ? 'bg-matcha-50 text-matcha-700 border border-matcha-400' :
            message.type === 'error' ? 'bg-sakura-50 text-sakura-700 border border-sakura-400' :
            'bg-sora-50 text-sora-700 border border-sora-400'
          }`}
          role="alert"
        >
          <p>{message.text}</p>
        </div>
      )}

      <PageHeader
        title={team.name}
        description={team.description || 'チームの説明はありません'}
        actions={
          <>
            {team.userRole === 'owner' || team.userRole === 'admin' && (
              <Link href={`/teams/${team.id}/edit`}>
                <Button variant="secondary" className="mr-2">
                  <PencilIcon className="h-5 w-5 mr-2" />
                  チームを編集
                </Button>
              </Link>
            )}
            <Link href="/teams">
              <Button variant="outline">
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                チーム一覧に戻る
              </Button>
            </Link>
          </>
        }
      />

      <div className="space-y-6">
        <Tab.Group onChange={(index) => setActiveTab(['overview', 'members', 'chat'][index])}>
          <Tab.List className="border-b border-gray-200">
            <div className="flex">
              <Tab 
                className={({ selected }) => 
                  `py-3 px-6 text-sm font-medium ${
                    selected 
                      ? 'text-indigo-600 border-b-2 border-indigo-600' 
                      : 'text-gray-500 hover:text-indigo-500 hover:border-indigo-500'
                  }`
                }
              >
                概要
              </Tab>
              <Tab 
                className={({ selected }) => 
                  `py-3 px-6 text-sm font-medium ${
                    selected 
                      ? 'text-indigo-600 border-b-2 border-indigo-600' 
                      : 'text-gray-500 hover:text-indigo-500 hover:border-indigo-500'
                  }`
                }
              >
                メンバー
              </Tab>
              <Tab 
                className={({ selected }) => 
                  `py-3 px-6 text-sm font-medium ${
                    selected 
                      ? 'text-indigo-600 border-b-2 border-indigo-600' 
                      : 'text-gray-500 hover:text-indigo-500 hover:border-indigo-500'
                  }`
                }
              >
                チャット
              </Tab>
            </div>
          </Tab.List>
          <Tab.Panels className="p-6">
            <Tab.Panel>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-medium text-ink-900">
                        チーム情報
                      </h3>
                    </CardHeader>
                    <CardBody>
                      <dl className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">チーム名</dt>
                          <dd className="mt-1 text-sm text-ink-900">{team.name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">説明</dt>
                          <dd className="mt-1 text-sm text-ink-900">{team.description || '説明なし'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">作成日</dt>
                          <dd className="mt-1 text-sm text-ink-900">
                            {new Date(team.createdAt).toLocaleDateString('ja-JP')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">オーナー</dt>
                          <dd className="mt-1 text-sm text-ink-900">
                            {team.owner?.fullName || team.owner?.username || '不明'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">あなたの役割</dt>
                          <dd className="mt-1">
                            <Badge
                              variant={
                                team.userRole === 'owner'
                                  ? 'success'
                                  : team.userRole === 'admin'
                                  ? 'info'
                                  : 'default'
                              }
                            >
                              {team.userRole === 'owner'
                                ? 'オーナー'
                                : team.userRole === 'admin'
                                ? '管理者'
                                : 'メンバー'}
                            </Badge>
                          </dd>
                        </div>
                      </dl>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-medium text-ink-900">
                        統計
                      </h3>
                    </CardHeader>
                    <CardBody>
                      <dl className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">メンバー数</dt>
                          <dd className="mt-1 text-sm text-ink-900">
                            {team._count?.members || 0} 人
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">プロジェクト数</dt>
                          <dd className="mt-1 text-sm text-ink-900">
                            {team._count?.projects || 0} 個
                          </dd>
                        </div>
                      </dl>
                    </CardBody>
                    <CardFooter className="bg-gray-50 border-t border-gray-200">
                      <div className="space-x-2">
                        {team._count?.projects > 0 ? (
                          <Link href={`/projects?teamId=${params.id}`}>
                            <Button variant="outline" size="sm">
                              <FolderIcon className="h-4 w-4 mr-1" />
                              プロジェクト一覧
                            </Button>
                          </Link>
                        ) : (
                          <Link href="/projects/new">
                            <Button variant="outline" size="sm">
                              <FolderIcon className="h-4 w-4 mr-1" />
                              新規プロジェクト作成
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                </div>

                {team.userRole === 'owner' && (
                  <div className="pt-4">
                    <Card className="border-sakura-300">
                      <CardHeader className="text-sakura-700">
                        <h3 className="text-lg font-medium">危険ゾーン</h3>
                      </CardHeader>
                      <CardBody>
                        <p className="text-sm text-gray-600 mb-4">
                          チームを削除すると、すべてのメンバーシップ、プロジェクト、タスクも削除されます。この操作は元に戻せません。
                        </p>
                        <Button
                          variant="danger"
                          onClick={() => {
                            if (confirm('本当にこのチームを削除しますか？この操作は元に戻せません。')) {
                              handleDeleteTeam();
                            }
                          }}
                        >
                          <TrashIcon className="h-5 w-5 mr-2" />
                          チームを削除
                        </Button>
                      </CardBody>
                    </Card>
                  </div>
                )}
              </div>
            </Tab.Panel>

            <Tab.Panel>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-ink-900">
                    チームメンバー ({team.members?.length || 0}人)
                  </h3>
                  {renderTeamHeaderActions()}
                </div>

                {team.members && team.members.length > 0 ? (
                  <div className="bg-white shadow overflow-hidden rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            ユーザー
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            役割
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            参加日
                          </th>
                          {(team.userRole === 'owner' || team.userRole === 'admin') && (
                            <th scope="col" className="relative px-6 py-3">
                              <span className="sr-only">アクション</span>
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {team.members.map((member) => (
                          <tr key={member.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-indigo-100 rounded-full">
                                  <UserCircleIcon className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-ink-900">
                                    {member.user.fullName || member.user.username}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {member.user.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {member.id === team.owner.id ? (
                                <Badge variant="success">オーナー</Badge>
                              ) : (
                                <>
                                  {(team.userRole === 'owner' || team.userRole === 'admin') &&
                                  member.id !== team.owner.id ? (
                                    <select
                                      value={member.role}
                                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                      className="rounded-md text-sm border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    >
                                      <option value="member">メンバー</option>
                                      <option value="admin">管理者</option>
                                    </select>
                                  ) : (
                                    <Badge
                                      variant={member.role === 'admin' ? 'info' : 'default'}
                                    >
                                      {member.role === 'admin' ? '管理者' : 'メンバー'}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(member.joinedAt).toLocaleDateString('ja-JP')}
                            </td>
                            {(team.userRole === 'owner' || team.userRole === 'admin') && (
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {member.id !== team.owner.id && (
                                  <button
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="text-sakura-600 hover:text-sakura-900"
                                  >
                                    削除
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Card>
                    <CardBody className="py-8 text-center">
                      <UserCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-ink-900 mb-2">
                        メンバーはまだいません
                      </h3>
                      <p className="text-ink-600 mb-4">
                        チームに他のメンバーを招待して協力して作業しましょう。
                      </p>
                      {renderTeamHeaderActions()}
                    </CardBody>
                  </Card>
                )}
              </div>
            </Tab.Panel>

            <Tab.Panel>
              <TeamChat teamId={params.id} teamName={team.name} />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </>
  );
} 