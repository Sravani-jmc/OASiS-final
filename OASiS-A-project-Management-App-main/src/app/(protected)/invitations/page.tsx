'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  EnvelopeIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  ClockIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';

interface Invitation {
  id: string;
  teamId: string;
  teamName: string;
  inviterId: string;
  inviterName: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  role?: string;
  email?: string;
  expiresAt?: string;
}

export default function InvitationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingInvitations, setProcessingInvitations] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, { type: string; text: string }>>({});

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        // Fetch invitations from the API
        const response = await fetch('/api/invitations');
        
        if (!response.ok) {
          throw new Error('Failed to fetch invitations');
        }
        
        const data = await response.json();
        setInvitations(data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch invitations:', err);
        setError('招待の取得に失敗しました');
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchInvitations();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [router, status]);

  const handleInvitationAction = async (invitationId: string, action: 'accept' | 'reject') => {
    setProcessingInvitations(prev => ({ ...prev, [invitationId]: true }));
    setMessages(prev => ({ ...prev, [invitationId]: { type: '', text: '' } }));
    
    try {
      // Send request to the API
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error('Failed to process invitation');
      }

      const data = await response.json();

      // Update UI based on action
      if (action === 'accept') {
        setMessages(prev => ({
          ...prev,
          [invitationId]: {
            type: 'success',
            text: data.message || 'チームに参加しました'
          }
        }));
        
        // Redirect to the team page if provided in response
        if (data.teamId) {
          setTimeout(() => {
            router.push(`/teams/${data.teamId}`);
          }, 2000);
        }
      } else {
        setMessages(prev => ({
          ...prev,
          [invitationId]: {
            type: 'info',
            text: data.message || '招待を拒否しました'
          }
        }));
        
        // Remove invitation from list after a delay
        setTimeout(() => {
          setInvitations(prev => prev.filter(i => i.id !== invitationId));
        }, 2000);
      }
    } catch (err) {
      console.error(`Failed to ${action} invitation:`, err);
      setMessages(prev => ({
        ...prev,
        [invitationId]: {
          type: 'error',
          text: `招待の${action === 'accept' ? '承認' : '拒否'}に失敗しました`
        }
      }));
    } finally {
      setProcessingInvitations(prev => ({ ...prev, [invitationId]: false }));
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

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center text-indigo-600 hover:text-indigo-500">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          ダッシュボードに戻る
        </Link>
      </div>

      <PageHeader
        title="チーム招待"
        description="他のユーザーからの招待を確認して、チームに参加しましょう"
      />

      {error && (
        <div className="bg-sakura-50 border border-sakura-400 text-sakura-700 px-4 py-3 rounded-md mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {invitations.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <EnvelopeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-ink-900 mb-2">招待はありません</h3>
            <p className="text-ink-600 mb-6">
              現在、保留中のチーム招待はありません。
            </p>
            <Link href="/teams">
              <Button variant="secondary">
                <UserGroupIcon className="h-5 w-5 mr-2" />
                チーム一覧を見る
              </Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {invitations.map((invitation) => (
            <Card key={invitation.id}>
              <CardBody>
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="mb-4 md:mb-0">
                    <div className="flex items-center mb-2">
                      <UserGroupIcon className="h-5 w-5 text-indigo-600 mr-2" />
                      <h3 className="text-lg font-medium text-ink-900">
                        {invitation.teamName}
                      </h3>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-ink-600">
                        <Badge variant={getRoleBadgeVariant(invitation.role || '')}>
                          {getRoleLabel(invitation.role || '')}
                        </Badge>
                        <span className="ml-2">として招待されています</span>
                      </p>
                      
                      <div className="flex items-center text-sm text-ink-500">
                        <UserCircleIcon className="h-4 w-4 mr-2" />
                        <span>
                          招待者: {invitation.inviterName}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-ink-500">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        <span>
                          有効期限: {invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString('ja-JP') : 'なし'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    {messages[invitation.id] ? (
                      <div 
                        className={`px-4 py-2 rounded-md ${
                          messages[invitation.id].type === 'success' 
                            ? 'bg-matcha-50 text-matcha-800'
                            : messages[invitation.id].type === 'error'
                            ? 'bg-sakura-50 text-sakura-800'
                            : 'bg-sora-50 text-sora-800'
                        }`}
                      >
                        {messages[invitation.id].text}
                      </div>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleInvitationAction(invitation.id, 'accept')}
                          isLoading={processingInvitations[invitation.id]}
                          disabled={processingInvitations[invitation.id]}
                        >
                          承諾
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleInvitationAction(invitation.id, 'reject')}
                          disabled={processingInvitations[invitation.id]}
                        >
                          拒否
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
} 