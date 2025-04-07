'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  UserGroupIcon, 
  PlusCircleIcon, 
  CalendarIcon, 
  UserIcon, 
  ArrowTopRightOnSquareIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Dialog, Transition } from '@headlessui/react';

// Types
interface Team {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  userRole: string;
  owner: {
    id: string;
    username: string;
    fullName: string | null;
  };
  _count: {
    members: number;
    projects: number;
  };
}

interface Invitation {
  id: string;
  teamId: string;
  teamName: string;
  inviterId: string;
  inviterName: string;
  status: string;
  createdAt: string;
}

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  
  // New states for delete confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams?getAll=true', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      
      const data = await response.json();
      setTeams(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      setError('チームの取得に失敗しました');
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/invitations?status=pending');
      
      if (response.ok) {
        const data = await response.json();
        setPendingInvitations(data);
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    }
  };

  // Function to manually refresh data
  const refreshTeamsData = () => {
    setLoading(true);
    // Fetch both teams and invitations
    Promise.all([fetchTeams(), fetchInvitations()])
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTeams();
      fetchInvitations();
      
      // Remove automatic refresh interval to prevent page refreshing
      // Users can manually refresh using the refresh button
      
      // Clean up any resources when the component unmounts
      return () => {};
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);
  
  // Handle edit team
  const handleEditTeam = (e: React.MouseEvent, teamId: string) => {
    e.preventDefault(); // Prevent the default link behavior
    e.stopPropagation(); // Prevent the card click event
    router.push(`/teams/${teamId}/edit`);
  };
  
  // Handle delete team click
  const handleDeleteClick = (e: React.MouseEvent, team: Team) => {
    e.preventDefault(); // Prevent the default link behavior
    e.stopPropagation(); // Prevent the card click event
    setTeamToDelete(team);
    setIsDeleteModalOpen(true);
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/teams/${teamToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete team');
      }
      
      // Remove the team from the local state
      setTeams(prev => prev.filter(team => team.id !== teamToDelete.id));
      
      // Close the delete modal
      setIsDeleteModalOpen(false);
      setTeamToDelete(null);
    } catch (error) {
      console.error('Error deleting team:', error);
      setError('チームの削除に失敗しました。もう一度お試しください。');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <PageHeader
        title="チーム"
        description="チームにはプロジェクトとメンバーを含めることができます"
        actions={
          <div className="flex gap-2">
            <button
              onClick={refreshTeamsData}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  更新中...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  チーム情報を更新
                </>
              )}
            </button>
            <Link href="/teams/new">
              <Button>
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                新規チーム作成
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="bg-sakura-50 border border-sakura-400 text-sakura-700 px-4 py-3 rounded-md mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Always show Invitations section, whether there are pending invitations or not */}
      <div className="mt-0 mb-6 bg-sora-50 border border-sora-200 rounded-md p-4">
        <h3 className="font-medium text-ink-900 mb-3">チーム招待</h3>
        <div className="flex justify-between items-center">
          <p className="text-ink-600">
            {pendingInvitations.length > 0 
              ? `${pendingInvitations.length}件の未処理のチーム招待があります。` 
              : "新しい招待はありません。"}
          </p>
          <div className="flex space-x-3">
            <Link href="/invitations">
              <Button variant="primary" size="sm">
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                招待を確認
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-ink-900 mb-2">チームがありません</h3>
            <p className="text-ink-600 mb-6">
              チームを作成するか、他のユーザーからの招待を待ちましょう。
            </p>
            <Link href="/teams/new">
              <Button>
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                最初のチームを作成
              </Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card key={team.id} className="h-full flex flex-col">
              <CardHeader className="flex items-start justify-between pb-2">
                <div>
                  <h3 className="text-lg font-medium text-ink-900">
                    {team.name}
                  </h3>
                  <Badge
                    variant={
                      team.userRole === 'owner'
                        ? 'success'
                        : team.userRole === 'admin'
                        ? 'info'
                        : 'default'
                    }
                    className="mt-2"
                  >
                    {team.userRole === 'owner'
                      ? 'オーナー'
                      : team.userRole === 'admin'
                      ? '管理者'
                      : 'メンバー'}
                  </Badge>
                </div>
                <Link
                  href={`/teams/${team.id}`}
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                </Link>
              </CardHeader>

              <CardBody className="flex-grow">
                <p className="text-ink-600 text-sm mb-4 line-clamp-2">
                  {team.description || 'チームの説明はありません'}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-ink-500">
                    <UserIcon className="h-4 w-4 mr-2" />
                    <span>
                      {team._count.members} {team._count.members === 1 ? 'メンバー' : 'メンバー'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-ink-500">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>
                      作成: {new Date(team.createdAt).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </div>
              </CardBody>

              <CardFooter className="bg-gray-50 border-t border-gray-200 flex justify-between">
                <Link href={`/teams/${team.id}`} className="flex-1 mr-2">
                  <Button variant="secondary" className="w-full">
                    詳細を見る
                  </Button>
                </Link>
                
                {/* Only show edit/delete buttons for owners and admins */}
                {(team.userRole === 'owner' || team.userRole === 'admin') && (
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => handleEditTeam(e, team.id)}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded"
                      aria-label="Edit team"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    
                    {/* Only owners can delete teams */}
                    {team.userRole === 'owner' && (
                      <button
                        onClick={(e) => handleDeleteClick(e, team)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
                        aria-label="Delete team"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
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
                    チームの削除
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {teamToDelete?.name} を削除してもよろしいですか？この操作は元に戻せません。
                      チームに関連するすべてのプロジェクトとタスクも削除されます。
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
    </>
  );
} 