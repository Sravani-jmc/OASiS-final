'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserCircleIcon,
  PencilIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';

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

interface Task {
  id: number;
  title: string;
  dueDate: string;
  priority: string;
  status: string;
  project: string;
}

interface DeadlineItem {
  id: number | string;
  title: string;
  dueDate: string;
  daysRemaining: number;
  type: 'project' | 'task';
  priority?: string;
  status?: string;
}

export default function MemberDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemberDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch member details
        const memberResponse = await fetch(`/api/users/${params.id}`, {
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        
        if (!memberResponse.ok) {
          throw new Error('Failed to fetch member details');
        }
        
        const memberData = await memberResponse.json();
        setMember(memberData);
        
        // Fetch tasks assigned to this member
        const tasksResponse = await fetch(`/api/tasks?assignee=${params.id}`, {
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          setTasks(tasksData.map((task: any) => ({
            id: task.id,
            title: task.title,
            dueDate: new Date(task.dueDate).toLocaleDateString('ja-JP'),
            priority: task.priority,
            status: task.status,
            project: task.projectName || 'プロジェクトなし',
          })));
          
          // Calculate task deadlines
          const today = new Date();
          const taskDeadlines = tasksData
            .filter((t: any) => {
              const dueDate = new Date(t.dueDate);
              return t.status !== 'completed' && 
                    dueDate >= new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
            })
            .map((t: any) => {
              const dueDate = new Date(t.dueDate);
              const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
              
              return {
                id: t.id,
                title: t.title,
                dueDate: dueDate.toLocaleDateString('ja-JP'),
                daysRemaining,
                type: 'task' as const,
                priority: t.priority,
                status: t.status
              };
            });
            
          // Fetch projects data for this member
          const projectsResponse = await fetch(`/api/projects?member=${params.id}`, {
            headers: {
              'Cache-Control': 'no-cache',
            },
          });
          
          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            
            // Calculate project deadlines
            const projectDeadlines = projectsData
              .filter((p: any) => {
                const endDate = new Date(p.endDate);
                return p.status !== 'completed' && 
                      endDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
              })
              .map((p: any) => {
                const endDate = new Date(p.endDate);
                const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
                
                return {
                  id: p.id,
                  title: p.name || p.title,
                  dueDate: endDate.toLocaleDateString('ja-JP'),
                  daysRemaining,
                  type: 'project' as const,
                  status: p.status
                };
              });
              
            // Combine and sort all deadlines
            const allDeadlines = [...projectDeadlines, ...taskDeadlines]
              .sort((a, b) => a.daysRemaining - b.daysRemaining);
              
            setDeadlines(allDeadlines);
          }
        }
      } catch (err) {
        console.error('Error fetching member details:', err);
        setError('メンバー情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMemberDetails();
  }, [params.id]);

  if (loading) {
    return <Loading />;
  }
  
  if (error || !member) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">エラーが発生しました</h3>
          <p className="text-gray-600 mb-6">{error || 'メンバーが見つかりません'}</p>
          <Link href="/members">
            <Button>メンバー一覧に戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={member.fullName || member.username}
        description={member.position || '役職なし'}
        actions={
          <>
            <Link href="/members" className="mr-2">
              <Button variant="outline">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                戻る
              </Button>
            </Link>
            <Link href={`/members/${member.id}/edit`}>
              <Button>
                <PencilIcon className="h-4 w-4 mr-2" />
                編集
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member Profile */}
        <Card className="lg:col-span-1">
          <CardHeader>プロフィール</CardHeader>
          <CardBody>
            <div className="flex flex-col items-center mb-6">
              <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <UserCircleIcon className="h-16 w-16 text-indigo-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{member.fullName || member.username}</h3>
              <p className="text-gray-600">{member.position || '役職なし'}</p>
              {member.isAdmin && (
                <Badge variant="info" className="mt-2">管理者</Badge>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">部署</h4>
                <p className="text-gray-900">{member.department || '部署なし'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">メールアドレス</h4>
                <div className="flex items-center">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <a href={`mailto:${member.email}`} className="text-indigo-600 hover:text-indigo-500">
                    {member.email}
                  </a>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">最終ログイン</h4>
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span>{member.lastLogin ? new Date(member.lastLogin).toLocaleString('ja-JP') : 'なし'}</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Tasks and Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deadlines */}
          {deadlines.length > 0 && (
            <Card>
              <CardHeader>締め切り一覧</CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-gray-100">
                  {deadlines.map((deadline) => (
                    <div 
                      key={`${deadline.type}-${deadline.id}`} 
                      className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(
                        deadline.type === 'project' 
                          ? `/projects/${deadline.id}` 
                          : `/tasks/${deadline.id}`
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">
                          {deadline.title}
                          <span className="ml-2 text-xs text-gray-500">
                            ({deadline.type === 'project' ? 'プロジェクト' : 'タスク'})
                          </span>
                        </h3>
                        
                        {deadline.type === 'task' && deadline.priority && (
                          <span className={`
                            mr-2 px-2 py-1 text-xs rounded-full 
                            ${deadline.priority === 'high' ? 'bg-sakura-100 text-sakura-800' : 
                              deadline.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'}
                          `}>
                            {deadline.priority === 'high' ? '高' : 
                              deadline.priority === 'medium' ? '中' : '低'}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex items-center text-xs text-gray-500">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          <span>{deadline.dueDate}</span>
                        </div>
                        
                        <div className={`
                          flex items-center text-xs font-medium rounded-full px-2 py-1
                          ${deadline.daysRemaining < 0 ? 'bg-red-100 text-red-800' : 
                            deadline.daysRemaining === 0 ? 'bg-red-100 text-red-800' :
                            deadline.daysRemaining <= 3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'}
                        `}>
                          {deadline.daysRemaining < 0 ? (
                            <>
                              <ExclamationCircleIcon className="h-3 w-3 mr-1" />
                              {Math.abs(deadline.daysRemaining)}日遅延
                            </>
                          ) : deadline.daysRemaining === 0 ? (
                            <>
                              <ExclamationCircleIcon className="h-3 w-3 mr-1" />
                              本日期限
                            </>
                          ) : (
                            <>
                              <ClockIcon className="h-3 w-3 mr-1" />
                              残り{deadline.daysRemaining}日
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Assigned Tasks */}
          <Card>
            <CardHeader>担当タスク</CardHeader>
            <CardBody className="p-0">
              {tasks.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/tasks/${task.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                        <Badge 
                          variant={
                            task.priority === 'high' ? 'danger' : 
                            task.priority === 'medium' ? 'warning' : 
                            'success'
                          }
                        >
                          {task.priority === 'high' ? '高' : 
                           task.priority === 'medium' ? '中' : '低'}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center text-xs text-gray-500">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        <span className="mr-3">{task.dueDate}</span>
                        <Badge 
                          variant={
                            task.status === 'completed' ? 'success' : 
                            task.status === 'inProgress' ? 'info' : 
                            task.status === 'onHold' ? 'warning' : 
                            'default'
                          }
                          size="sm"
                        >
                          {task.status === 'completed' ? '完了' : 
                           task.status === 'inProgress' ? '進行中' : 
                           task.status === 'onHold' ? '保留中' : '未着手'}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        プロジェクト: {task.project}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  担当タスクはありません
                </div>
              )}
              <div className="p-3 bg-gray-50 border-t border-gray-100">
                <Link 
                  href={`/tasks?assignee=${member.id}`} 
                  className="text-sm text-indigo-600 font-medium flex items-center justify-center hover:text-indigo-500"
                >
                  すべてのタスクを表示
                </Link>
              </div>
            </CardBody>
          </Card>
          
          {/* Projects */}
          {member.projects && member.projects.length > 0 && (
            <Card>
              <CardHeader>参加プロジェクト</CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-gray-100">
                  {member.projects.map((project) => (
                    <Link 
                      key={project.id} 
                      href={`/projects/${project.id}`}
                      className="block p-4 hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-sm font-medium text-gray-900">{project.name}</h3>
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
} 