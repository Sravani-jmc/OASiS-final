'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowLeftIcon,
  FolderPlusIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  startDate: string;
  endDate: string | null;
  managerId: string;
  manager: {
    id: string;
    username: string;
    fullName: string | null;
  };
  memberCount: number;
  taskCount: number;
}

interface TeamProjects {
  team: {
    id: string;
    name: string;
  };
  projects: Project[];
}

export default function TeamProjectsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TeamProjects | null>(null);

  useEffect(() => {
    const fetchTeamProjects = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/teams/${params.id}/projects`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch team projects');
        }

        const responseData = await response.json();
        setData(responseData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching team projects:', err);
        setError(err instanceof Error ? err.message : 'プロジェクトの取得に失敗しました');
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchTeamProjects();
    }
  }, [params.id, status]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">進行中</Badge>;
      case 'completed':
        return <Badge variant="default">完了</Badge>;
      case 'paused':
        return <Badge variant="warning">一時停止</Badge>;
      case 'cancelled':
        return <Badge variant="danger">キャンセル</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="danger">高</Badge>;
      case 'medium':
        return <Badge variant="warning">中</Badge>;
      case 'low':
        return <Badge variant="info">低</Badge>;
      default:
        return <Badge variant="default">{priority}</Badge>;
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <>
        <div className="mb-6">
          <Link href={`/teams/${params.id}`} className="inline-flex items-center text-indigo-600 hover:text-indigo-500">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            チーム詳細に戻る
          </Link>
        </div>
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-sakura-600 mb-4">{error}</p>
            <Link href={`/teams/${params.id}`}>
              <Button>
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                チーム詳細に戻る
              </Button>
            </Link>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <div className="mb-6">
          <Link href={`/teams/${params.id}`} className="inline-flex items-center text-indigo-600 hover:text-indigo-500">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            チーム詳細に戻る
          </Link>
        </div>
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-ink-600">データが見つかりませんでした</p>
            <div className="mt-6">
              <Link href={`/teams/${params.id}`}>
                <Button>
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  チーム詳細に戻る
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </>
    );
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
        title={`${data.team.name}のプロジェクト`}
        description="チームに関連するプロジェクトの一覧"
        actions={
          <Link href="/projects/new">
            <Button>
              <FolderPlusIcon className="h-5 w-5 mr-2" />
              新規プロジェクト作成
            </Button>
          </Link>
        }
      />

      {data.projects.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <FolderPlusIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-ink-900 mb-2">プロジェクトはありません</h3>
            <p className="text-ink-600 mb-6">
              このチームにはまだプロジェクトがありません。新しいプロジェクトを作成しましょう。
            </p>
            <Link href="/projects/new">
              <Button>
                <FolderPlusIcon className="h-5 w-5 mr-2" />
                最初のプロジェクトを作成
              </Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.projects.map((project) => (
            <Card key={project.id} className="h-full flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-ink-900 mb-1">
                    {project.name}
                  </h3>
                  <div>
                    {getStatusBadge(project.status)}
                  </div>
                </div>
                <div>
                  {getPriorityBadge(project.priority)}
                </div>
              </CardHeader>

              <CardBody className="flex-grow">
                <p className="text-ink-600 text-sm mb-4 line-clamp-2">
                  {project.description || 'プロジェクトの説明はありません'}
                </p>

                <div className="mt-2 space-y-3">
                  <div className="flex items-center text-sm text-ink-500">
                    <ChartBarIcon className="h-4 w-4 mr-2" />
                    <span>進捗: {project.progress}%</span>
                    <div className="ml-2 flex-grow bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center text-sm text-ink-500">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    <span>期間: {new Date(project.startDate).toLocaleDateString('ja-JP')} 
                      {project.endDate ? ` 〜 ${new Date(project.endDate).toLocaleDateString('ja-JP')}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-ink-500">
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    <span>メンバー: {project.memberCount}人</span>
                  </div>
                </div>
              </CardBody>

              <CardFooter className="bg-gray-50 border-t border-gray-200">
                <Link href={`/projects/${project.id}`} className="w-full">
                  <Button variant="secondary" className="w-full">
                    詳細を見る
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
} 