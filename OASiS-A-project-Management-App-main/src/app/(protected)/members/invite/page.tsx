'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, UserPlusIcon, EnvelopeIcon, UserGroupIcon, UserCircleIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui';

interface Team {
  id: string;
  name: string;
}

export default function InviteMemberPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    teamId: '',
    role: 'member',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch teams on component mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/teams');
        
        if (response.ok) {
          const data = await response.json();
          setTeams(data);
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user selects
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    // Validate form
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = '名前を入力してください';
    if (!formData.email) newErrors.email = 'メールアドレスを入力してください';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = '有効なメールアドレスを入力してください';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    // Call API to invite member
    try {
      const endpoint = formData.teamId 
        ? `/api/teams/${formData.teamId}/members` 
        : '/api/users';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check for specific error messages
        if (errorData.error) {
          setErrors({ submit: errorData.error });
        } else {
          setErrors({ submit: 'メンバーの招待に失敗しました。もう一度お試しください。' });
        }
        
        setIsSubmitting(false);
        return;
      }
      
      // Redirect to members page on success
      router.push('/members');
      router.refresh();
    } catch (error) {
      console.error('Failed to invite member:', error);
      setErrors({ submit: 'メンバーの招待に失敗しました。もう一度お試しください。' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <Link href="/members" className="inline-flex items-center text-indigo-600 hover:text-indigo-500">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          メンバー一覧に戻る
        </Link>
      </div>

      <PageHeader
        title="メンバー招待"
        description="新しいメンバーをチームに招待します"
      />

      <div className="max-w-3xl mx-auto">
        <Card>
          <form onSubmit={handleSubmit}>
            <CardBody className="space-y-6">
              {errors.submit && (
                <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                  {errors.submit}
                </div>
              )}
              
              <div className="bg-indigo-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-medium text-indigo-800 mb-2 flex items-center">
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  新しいメンバー情報
                </h3>
                <p className="text-sm text-indigo-700">
                  新しいメンバーの基本情報を入力してください。招待メールが送信されます。
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    label="名前"
                    placeholder="メンバーの名前"
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                    required
                    className="w-full"
                    icon={<UserCircleIcon className="h-5 w-5 text-gray-400" />}
                  />
                </div>

                <div className="md:col-span-2">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    label="メールアドレス"
                    placeholder="招待するメンバーのメールアドレス"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    required
                    className="w-full"
                    icon={<EnvelopeIcon className="h-5 w-5 text-gray-400" />}
                  />
                </div>

                <div className="md:col-span-2">
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    label="電話番号 (任意)"
                    placeholder="メンバーの電話番号"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    className="w-full"
                    icon={<PhoneIcon className="h-5 w-5 text-gray-400" />}
                  />
                </div>

                <div>
                  <Select
                    id="teamId"
                    name="teamId"
                    label="チーム (任意)"
                    options={[
                      { value: '', label: 'チームを選択' },
                      ...teams.map(team => ({ value: team.id, label: team.name }))
                    ]}
                    value={formData.teamId}
                    onChange={(value) => handleSelectChange('teamId', value)}
                    error={errors.teamId}
                    className="w-full"
                    icon={<UserGroupIcon className="h-5 w-5 text-gray-400" />}
                  />
                </div>

                <div>
                  <Select
                    id="role"
                    name="role"
                    label="ロール"
                    options={[
                      { value: 'member', label: 'メンバー' },
                      { value: 'admin', label: '管理者' },
                    ]}
                    value={formData.role}
                    onChange={(value) => handleSelectChange('role', value)}
                    error={errors.role}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-6">
                <h3 className="text-sm font-medium text-ink-900 mb-3">招待について：</h3>
                <ul className="list-disc pl-5 text-sm text-ink-600">
                  <li className="mb-1">招待メールが送信されます</li>
                  <li className="mb-1">招待の有効期限は7日間です</li>
                  <li>招待を受け入れるとチームに参加できます</li>
                </ul>
              </div>
            </CardBody>

            <CardFooter className="flex justify-end space-x-3 bg-gray-50">
              <Link href="/members">
                <Button type="button" variant="secondary">キャンセル</Button>
              </Link>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="px-6"
              >
                {isSubmitting ? '招待中...' : '招待を送信'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );
} 