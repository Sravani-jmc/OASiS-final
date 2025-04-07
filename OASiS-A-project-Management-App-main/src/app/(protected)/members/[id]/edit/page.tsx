'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui';
import { Label } from '../../../../../components/ui/Label';
import { Loading } from '@/components/ui/Loading';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';

const memberSchema = z.object({
  fullName: z.string().min(1, '名前は必須です'),
  position: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email('有効なメールアドレスを入力してください'),
});

type MemberFormData = {
  fullName: string;
  position?: string;
  department?: string;
  email: string;
};

export default function EditMemberPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [member, setMember] = useState<MemberFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
  });

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const response = await fetch(`/api/users/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch member');
        }
        const data = await response.json();
        setMember(data);
      } catch (error) {
        console.error('Error fetching member:', error);
        toast.error('メンバー情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [params.id]);

  const onSubmit = async (data: MemberFormData) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/users/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update member');
      }

      toast.success('メンバー情報を更新しました');
      router.push('/members');
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('メンバー情報の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-600">メンバーが見つかりません</p>
        <Button onClick={() => router.push('/members')} className="mt-4">
          メンバー一覧に戻る
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="メンバー編集"
        description="メンバー情報を編集します"
        actions={
          <Button onClick={() => router.push('/members')} variant="outline">
            キャンセル
          </Button>
        }
      />

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="fullName">名前</Label>
              <Input
                id="fullName"
                {...register('fullName')}
                defaultValue={member.fullName || ''}
                error={errors.fullName?.message}
              />
            </div>

            <div>
              <Label htmlFor="position">役職</Label>
              <Input
                id="position"
                {...register('position')}
                defaultValue={member.position || ''}
                error={errors.position?.message}
              />
            </div>

            <div>
              <Label htmlFor="department">部署</Label>
              <Input
                id="department"
                {...register('department')}
                defaultValue={member.department || ''}
                error={errors.department?.message}
              />
            </div>

            <div>
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                defaultValue={member.email}
                error={errors.email?.message}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/members')}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
} 