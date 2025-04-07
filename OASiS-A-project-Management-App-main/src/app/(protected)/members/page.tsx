'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { 
  PlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserCircleIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Input } from '@/components/ui';
import { Dialog, Transition } from '@headlessui/react';

interface Member {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  position: string | null;
  department: string | null;
  isAdmin: boolean;
  lastLogin: string | null;
  projects?: { id: string; name: string }[];
}

export default function MembersPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // New states for delete confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      
      const data = await response.json();
      setMembers(data);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('メンバーの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Handle delete member click
  const handleDeleteClick = (member: Member) => {
    setMemberToDelete(member);
    setIsDeleteModalOpen(true);
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/users/${memberToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete member');
      }
      
      // Remove the member from the local state
      setMembers(prev => prev.filter(member => member.id !== memberToDelete.id));
      
      // Close the delete modal
      setIsDeleteModalOpen(false);
      setMemberToDelete(null);
    } catch (error) {
      console.error('Error deleting member:', error);
      setError('メンバーの削除に失敗しました。もう一度お試しください。');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter members based on search query
  const filteredMembers = members.filter(member => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (member.fullName && member.fullName.toLowerCase().includes(query)) ||
      member.username.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      (member.position && member.position.toLowerCase().includes(query)) ||
      (member.department && member.department.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <PageHeader
        title="メンバー"
        description="チームメンバーを管理します"
        actions={
          <Link href="/members/invite">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              メンバー招待
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardBody>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="search"
              name="search"
              type="text"
              placeholder="名前、メール、職位などで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <Card key={member.id}>
            <CardBody>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <UserCircleIcon className="h-8 w-8 text-indigo-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <Link 
                      href={`/members/${member.id}`}
                      className="text-lg font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      {member.fullName || member.username}
                    </Link>
                    <Badge variant="success">在籍中</Badge>
                  </div>
                  <p className="text-sm text-ink-500">{member.position || '役職なし'}</p>
                  <p className="text-sm text-ink-500">{member.department || '部署なし'}</p>
                  
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center text-sm">
                      <EnvelopeIcon className="h-4 w-4 text-ink-400 mr-1" />
                      <a href={`mailto:${member.email}`} className="text-indigo-600 hover:text-indigo-500">
                        {member.email}
                      </a>
                    </div>
                  </div>

                  <div className="mt-3">
                    <h4 className="text-xs font-medium text-ink-500 mb-1">最終ログイン</h4>
                    <p className="text-xs text-ink-500">
                      {member.lastLogin ? new Date(member.lastLogin).toLocaleString('ja-JP') : 'なし'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <Link href={`/members/${member.id}`}>
                  <Button variant="outline" size="sm">詳細</Button>
                </Link>
                <Link href={`/members/${member.id}/edit`}>
                  <Button variant="secondary" size="sm">
                    <PencilIcon className="h-4 w-4 mr-1" />
                    編集
                  </Button>
                </Link>
                <Button 
                  variant="danger" 
                  size="sm" 
                  onClick={() => handleDeleteClick(member)}
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  削除
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}

        {filteredMembers.length === 0 && (
          <Card className="col-span-full">
            <CardBody className="text-center py-12">
              <p className="text-ink-600">
                {searchQuery ? '検索条件に一致するメンバーはありません' : 'メンバーがありません'}
              </p>
              <div className="mt-6">
                <Link href="/members/invite">
                  <Button>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    メンバー招待
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
      
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
                    メンバーの削除
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {memberToDelete?.fullName || memberToDelete?.username} を削除してもよろしいですか？この操作は元に戻せません。
                      このメンバーに関連するすべてのデータも削除されます。
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