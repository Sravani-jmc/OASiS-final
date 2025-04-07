'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { 
  UserIcon, 
  EnvelopeIcon, 
  IdentificationIcon,
  BuildingOfficeIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';

// User profile type
interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName?: string | null;
  department?: string | null;
  position?: string | null;
  isAdmin: boolean;
  lastLogin?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    department: '',
    position: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const fetchUserProfile = async () => {
        try {
          // In a real app, you would fetch this from an API
          // For now, let's simulate a fetch
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Create mock user profile data (in a real app this would come from the API)
          const profile: UserProfile = {
            id: session.user.id as string,
            username: session.user.username as string,
            email: session.user.email as string,
            fullName: session.user.name || null,
            department: 'エンジニアリング部',
            position: 'シニアデベロッパー',
            isAdmin: session.user.isAdmin as boolean,
            lastLogin: new Date().toISOString(),
            createdAt: '2023-01-15T00:00:00Z'
          };
          
          setUserProfile(profile);
          setFormData({
            fullName: profile.fullName || '',
            email: profile.email,
            department: profile.department || '',
            position: profile.position || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
          setLoading(false);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          setMessage({
            type: 'error',
            text: 'プロフィールの読み込みに失敗しました'
          });
          setLoading(false);
        }
      };

      fetchUserProfile();
    }
  }, [session, status]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setMessage({ type: '', text: '' });

    try {
      // In a real app, you would send this to an API
      // For demo, we'll simulate a successful update
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update local state to reflect changes
      if (userProfile) {
        const updatedProfile: UserProfile = {
          ...userProfile,
          fullName: formData.fullName || null,
          email: formData.email,
          department: formData.department || null,
          position: formData.position || null,
        };
        
        setUserProfile(updatedProfile);
        setMessage({
          type: 'success',
          text: 'プロフィールが更新されました'
        });
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setMessage({
        type: 'error',
        text: 'プロフィールの更新に失敗しました'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setMessage({ type: '', text: '' });

    // Password validation
    if (formData.newPassword.length < 8) {
      setMessage({
        type: 'error',
        text: 'パスワードは8文字以上である必要があります'
      });
      setUpdating(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({
        type: 'error',
        text: '新しいパスワードと確認用パスワードが一致しません'
      });
      setUpdating(false);
      return;
    }

    try {
      // In a real app, you would send this to an API
      // For demo, we'll simulate a successful update
      await new Promise(resolve => setTimeout(resolve, 1500));

      setMessage({
        type: 'success',
        text: 'パスワードが更新されました'
      });
      
      // Reset password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (error) {
      console.error('Failed to update password:', error);
      setMessage({
        type: 'error',
        text: 'パスワードの更新に失敗しました'
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!userProfile) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <p className="text-ink-600">プロフィール情報が見つかりませんでした</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title="プロフィール"
        description="アカウント情報とプロフィール設定"
      />
      
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'profile'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-ink-500 hover:text-ink-700'
          }`}
          onClick={() => setActiveTab('profile')}
        >
          プロフィール情報
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'password'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-ink-500 hover:text-ink-700'
          }`}
          onClick={() => setActiveTab('password')}
        >
          パスワード変更
        </button>
      </div>

      {message.text && (
        <div 
          className={`mb-6 px-4 py-3 rounded-md ${
            message.type === 'success' 
              ? 'bg-matcha-50 border border-matcha-400 text-matcha-800'
              : 'bg-sakura-50 border border-sakura-400 text-sakura-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {activeTab === 'profile' ? (
        <Card>
          <form onSubmit={handleProfileUpdate}>
            <CardHeader>
              <h3 className="text-lg font-medium text-ink-900">プロフィール情報</h3>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="col-span-1">
                  <div className="text-sm font-medium text-ink-500 mb-2">ユーザー名</div>
                  <div className="flex items-center">
                    <UserIcon className="h-5 w-5 text-ink-400 mr-2" />
                    <div className="text-ink-900">{userProfile.username}</div>
                  </div>
                </div>
                <div className="col-span-1">
                  <div className="text-sm font-medium text-ink-500 mb-2">アカウント作成日</div>
                  <div className="text-ink-900">
                    {new Date(userProfile.createdAt).toLocaleDateString('ja-JP')}
                  </div>
                </div>
                <div className="col-span-1">
                  <div className="text-sm font-medium text-ink-500 mb-2">最終ログイン</div>
                  <div className="text-ink-900">
                    {userProfile.lastLogin ? 
                      new Date(userProfile.lastLogin).toLocaleString('ja-JP') : 
                      '情報なし'}
                  </div>
                </div>
                <div className="col-span-1">
                  <div className="text-sm font-medium text-ink-500 mb-2">管理者権限</div>
                  <div className="text-ink-900">
                    {userProfile.isAdmin ? 'あり' : 'なし'}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-ink-700 mb-1">
                      氏名
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IdentificationIcon className="h-5 w-5 text-ink-400" />
                      </div>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.fullName}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-ink-700 mb-1">
                      メールアドレス
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <EnvelopeIcon className="h-5 w-5 text-ink-400" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-ink-700 mb-1">
                      部署
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <BuildingOfficeIcon className="h-5 w-5 text-ink-400" />
                      </div>
                      <input
                        id="department"
                        name="department"
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.department}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="position" className="block text-sm font-medium text-ink-700 mb-1">
                      役職
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserCircleIcon className="h-5 w-5 text-ink-400" />
                      </div>
                      <input
                        id="position"
                        name="position"
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.position}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
            <CardFooter className="flex justify-end">
              <Button 
                type="submit" 
                isLoading={updating}
              >
                プロフィールを更新
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handlePasswordChange}>
            <CardHeader>
              <h3 className="text-lg font-medium text-ink-900">パスワード変更</h3>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-ink-700 mb-1">
                  現在のパスワード
                </label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.currentPassword}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-ink-700 mb-1">
                  新しいパスワード
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.newPassword}
                  onChange={handleChange}
                />
                <p className="mt-1 text-sm text-gray-500">8文字以上の長さが必要です</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-700 mb-1">
                  新しいパスワード（確認用）
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </CardBody>
            <CardFooter className="flex justify-end">
              <Button 
                type="submit" 
                isLoading={updating}
              >
                パスワードを更新
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </>
  );
} 