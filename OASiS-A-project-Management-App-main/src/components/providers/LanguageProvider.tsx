'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'ja' | 'en';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  translations: Record<string, string>;
  t: (key: string) => string;
};

// Translation dictionary - expanded with more UI elements
const translationDict: Record<Language, Record<string, string>> = {
  ja: {
    // Common
    'app.name': 'OASiS',
    'app.tagline': 'プロジェクト管理システム',
    'app.language': '言語',
    'app.loading': '読み込み中...',
    'app.description': 'オープンソースのプロジェクト管理システム',
    'app.error': 'エラーが発生しました',
    'app.retry': '再試行',
    
    // Auth
    'auth.login': 'ログイン',
    'auth.login.processing': 'ログイン中...',
    'auth.login.welcome': 'ようこそ',
    'auth.username': 'ユーザー名',
    'auth.password': 'パスワード',
    'auth.register': '新規登録',
    'auth.logout': 'ログアウト',
    'auth.error.required': 'ユーザー名とパスワードを入力してください',
    'auth.error.invalid': 'ユーザー名またはパスワードが正しくありません',
    'auth.error.general': 'ログイン中にエラーが発生しました',
    'auth.noAccount': 'アカウントをお持ちでないですか？',
    'auth.or': 'または',
    'auth.forgotPassword': 'パスワードをお忘れですか？',
    'auth.resetPassword': 'パスワードをリセット',
    'auth.emailAddress': 'メールアドレス',
    'auth.sendResetLink': 'リセットリンクを送信',
    'auth.sendOtp': 'OTPを送信',
    'auth.enterOtp': 'OTPを入力',
    'auth.verifyOtp': 'OTPを確認',
    'auth.backToEmail': 'メールアドレス入力に戻る',
    'auth.invalidOtp': 'OTPが無効です',
    'auth.otpVerified': '確認が完了しました。新しい認証情報をメールで送信しました。',
    'auth.otpInstructions': 'メールアドレスにOTPを送信しました。6桁のコードを入力して確認してください。',
    'auth.backToLogin': 'ログインに戻る',
    'auth.resetSuccess': 'パスワードリセットのリンクが送信されました',
    'auth.resetError': 'パスワードリセットに失敗しました',
    'auth.rememberMe': 'ログイン情報を保存',
    'auth.signup': 'アカウント作成',
    'auth.email': 'メールアドレス',
    'auth.resetPasswordInstructions': 'パスワードをリセットするためのリンクを送信します。',
    'auth.resetPasswordSuccess': 'パスワードリセット用のメールを送信しました。メールをご確認ください。',
    'auth.confirmPassword': 'パスワードを確認',
    'auth.have-account': 'すでにアカウントをお持ちですか？',
    'form.required': '必須項目です',
    'form.emailInvalid': '有効なメールアドレスを入力してください',
    'form.passwordLength': 'パスワードは8文字以上である必要があります',
    'form.passwordMismatch': 'パスワードが一致しません',
    
    // Navigation
    'nav.dashboard': 'ダッシュボード',
    'nav.projects': 'プロジェクト',
    'nav.tasks': 'タスク',
    'nav.teams': 'チーム',
    'nav.members': 'メンバー',
    'nav.reports': 'レポート',
    'nav.bulletins': '掲示板',
    'nav.dailyLog': '日次ログ',
    'nav.invitations': '招待',
    'nav.settings': '設定',
    'nav.profile': 'プロフィール',
    'nav.help': 'ヘルプ',
    'language.english': '英語',
    'language.japanese': '日本語',
    
    // Dashboard
    'dashboard.welcome': 'ようこそ、OASiSへ',
    'dashboard.summary': '概要',
    'dashboard.recentActivity': '最近のアクティビティ',
    'dashboard.upcomingTasks': '今後のタスク',
    'dashboard.projectProgress': 'プロジェクト進捗',
    'dashboard.teamPerformance': 'チームパフォーマンス',
    'dashboard.notifications': '通知',
    'dashboard.quickActions': 'クイックアクション',
    'dashboard.tasksCompleted': '完了したタスク',
    'dashboard.activeProjects': '進行中のプロジェクト',
    'dashboard.teamMembers': 'チームメンバー',
    'dashboard.taskCompletion': 'タスク完了率',
    'dashboard.fromLastWeek': '先週より',
    'dashboard.fromLastMonth': '先月より',
    'dashboard.newThisMonth': '今月の新規',
    'dashboard.newMembers': '新しいメンバー',
    'dashboard.progress': '進捗',
    'dashboard.taskStatus': 'タスクのステータス',
    'dashboard.weeklyActivity': '週間アクティビティ',
    'dashboard.viewAllActivity': 'すべてのアクティビティを表示',
    'dashboard.viewAllTasks': 'すべてのタスクを表示',
    'dashboard.completedTask': 'がタスクを完了しました',
    'dashboard.createdProject': 'がプロジェクトを作成しました',
    'dashboard.commentedOn': 'がコメントしました',
    'dashboard.addedTeamMember': 'がチームメンバーを追加しました',
    'dashboard.updatedDocument': 'が書類を更新しました',
    'dashboard.scheduledMeeting': 'が会議を予定しました',
    'dashboard.extendedDeadline': 'が締め切りを延長しました',
    'dashboard.welcomeToOasis': 'OASiSプロジェクト管理へようこそ',
    'dashboard.allActivity': 'すべてのアクティビティ',
    'dashboard.noRecentActivity': '最近のアクティビティはありません',
    'dashboard.projectManagementDesc': '効率的なプロジェクト管理と円滑なチームコラボレーションのための完全なソリューション',
    'dashboard.createProject': '新規プロジェクト作成',
    'dashboard.learnMore': '詳細を見る',
    'dashboard.completionRate': 'タスク完了率',
    'dashboard.avgCompletionTime': '平均完了時間',
    'dashboard.perTask': 'タスクあたり',
    'dashboard.topContributor': 'トップ貢献者',
    'dashboard.outOf': '合計',
    'dashboard.totalTasks': 'タスク中',
    'dashboard.noData': 'データなし',
    
    // Filters
    'filter.all': 'すべて',
    'filter.tasks': 'タスク',
    'filter.projects': 'プロジェクト',
    'filter.documents': '書類',
    'filter.team': 'チーム',
    
    // Project status
    'status.notStarted': '未開始',
    'status.inProgress': '進行中',
    'status.completed': '完了',
    'status.onHold': '保留中',
    
    // Priority levels
    'priority.low': '低',
    'priority.medium': '中',
    'priority.high': '高',
    
    // Actions
    'action.create': '作成',
    'action.edit': '編集',
    'action.delete': '削除',
    'action.save': '保存',
    'action.cancel': 'キャンセル',
    'action.confirm': '確認',
    'action.submit': '提出',
    'action.back': '戻る',
    'action.next': '次へ',
    'action.search': '検索',
    'action.filter': 'フィルター',
    'action.view': '表示',
    'action.download': 'ダウンロード',
    
    // Reports
    'reports.taskCompletionReport': 'タスク完了レポート',
    'reports.tasksCompletedByDay': '曜日別タスク完了数',
    'reports.tasksByCategory': 'カテゴリ別タスク',
    'reports.tasksByUser': 'ユーザー別タスク',
    'reports.recentlyCompletedTasks': '最近完了したタスク',
    
    // Time ranges
    'timeRange.week': '週間',
    'timeRange.month': '月間',
    'timeRange.quarter': '四半期',
    'timeRange.year': '年間',
  },
  en: {
    // Common
    'app.name': 'OASiS',
    'app.tagline': 'Project Management System',
    'app.language': 'Language',
    'app.loading': 'Loading...',
    'app.description': 'Open Source Project Management System',
    
    // Auth
    'auth.login': 'Login',
    'auth.login.processing': 'Logging in...',
    'auth.login.welcome': 'Welcome',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.register': 'Register',
    'auth.logout': 'Logout',
    'auth.error.required': 'Please enter username and password',
    'auth.error.invalid': 'Username or password is incorrect',
    'auth.error.general': 'An error occurred during login',
    'auth.noAccount': 'Don\'t have an account?',
    'auth.or': 'or',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.resetPassword': 'Reset Password',
    'auth.emailAddress': 'Email Address',
    'auth.sendResetLink': 'Send Reset Link',
    'auth.sendOtp': 'Send OTP',
    'auth.enterOtp': 'Enter OTP',
    'auth.verifyOtp': 'Verify OTP',
    'auth.backToEmail': 'Back to Email',
    'auth.invalidOtp': 'Invalid OTP',
    'auth.otpVerified': 'Verified! New credentials have been sent to your email.',
    'auth.otpInstructions': 'We sent an OTP to your email address. Enter the 6-digit code to verify.',
    'auth.backToLogin': 'Back to Login',
    'auth.resetSuccess': 'Password reset link has been sent',
    'auth.resetError': 'Failed to reset password',
    'auth.rememberMe': 'Remember me',
    'auth.signup': 'Sign Up',
    'auth.email': 'Email',
    'auth.resetPasswordInstructions': 'We\'ll send you a link to reset your password.',
    'auth.resetPasswordSuccess': 'Password reset email sent. Please check your inbox.',
    'auth.confirmPassword': 'Confirm Password',
    'auth.have-account': 'Already have an account?',
    'form.required': 'Required',
    'form.emailInvalid': 'Enter a valid email',
    'form.passwordLength': 'Password must be at least 8 characters',
    'form.passwordMismatch': 'Passwords do not match',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.tasks': 'Tasks',
    'nav.teams': 'Teams',
    'nav.members': 'Members',
    'nav.reports': 'Reports',
    'nav.bulletins': 'Bulletin Board',
    'nav.dailyLog': 'Daily Log',
    'nav.invitations': 'Invitations',
    'nav.settings': 'Settings',
    'nav.profile': 'Profile',
    'nav.help': 'Help',
    'language.english': 'English',
    'language.japanese': 'Japanese',
    
    // Dashboard
    'dashboard.welcome': 'Welcome to OASiS',
    'dashboard.summary': 'Summary',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.upcomingTasks': 'Upcoming Tasks',
    'dashboard.projectProgress': 'Project Progress',
    'dashboard.teamPerformance': 'Team Performance',
    'dashboard.notifications': 'Notifications',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.tasksCompleted': 'Tasks Completed',
    'dashboard.activeProjects': 'Active Projects',
    'dashboard.teamMembers': 'Team Members',
    'dashboard.taskCompletion': 'Task Completion',
    'dashboard.fromLastWeek': 'from last week',
    'dashboard.fromLastMonth': 'from last month',
    'dashboard.newThisMonth': 'new this month',
    'dashboard.newMembers': 'new members',
    'dashboard.progress': 'Progress',
    'dashboard.taskStatus': 'Task Status',
    'dashboard.weeklyActivity': 'Weekly Activity',
    'dashboard.viewAllActivity': 'View all activity',
    'dashboard.viewAllTasks': 'View all tasks',
    'dashboard.completedTask': 'completed task',
    'dashboard.createdProject': 'created project',
    'dashboard.commentedOn': 'commented on',
    'dashboard.addedTeamMember': 'added team member to',
    'dashboard.updatedDocument': 'updated document',
    'dashboard.scheduledMeeting': 'scheduled meeting',
    'dashboard.extendedDeadline': 'extended deadline for',
    'dashboard.welcomeToOasis': 'Welcome to OASiS Project Management',
    'dashboard.allActivity': 'All Activity',
    'dashboard.noRecentActivity': 'No recent activity',
    'dashboard.projectManagementDesc': 'A complete solution for efficient project management and seamless team collaboration',
    'dashboard.createProject': 'Create New Project',
    'dashboard.learnMore': 'Learn More',
    'dashboard.completionRate': 'Completion Rate',
    'dashboard.avgCompletionTime': 'Average Completion Time',
    'dashboard.perTask': 'per task',
    'dashboard.topContributor': 'Top Contributor',
    'dashboard.outOf': 'out of',
    'dashboard.totalTasks': 'total tasks',
    'dashboard.noData': 'No data',
    
    // Filters
    'filter.all': 'All',
    'filter.tasks': 'Tasks',
    'filter.projects': 'Projects',
    'filter.documents': 'Documents',
    'filter.team': 'Team',
    
    // Project status
    'status.notStarted': 'Not Started',
    'status.inProgress': 'In Progress',
    'status.completed': 'Completed',
    'status.onHold': 'On Hold',
    
    // Priority levels
    'priority.low': 'Low',
    'priority.medium': 'Medium',
    'priority.high': 'High',
    
    // Actions
    'action.create': 'Create',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.confirm': 'Confirm',
    'action.submit': 'Submit',
    'action.back': 'Back',
    'action.next': 'Next',
    'action.search': 'Search',
    'action.filter': 'Filter',
    'action.view': 'View',
    'action.download': 'Download',
    
    // Reports
    'reports.taskCompletionReport': 'Task Completion Report',
    'reports.tasksCompletedByDay': 'Tasks Completed by Day',
    'reports.tasksByCategory': 'Tasks by Category',
    'reports.tasksByUser': 'Tasks by User',
    'reports.recentlyCompletedTasks': 'Recently Completed Tasks',
    
    // Time ranges
    'timeRange.week': 'Week',
    'timeRange.month': 'Month',
    'timeRange.quarter': 'Quarter',
    'timeRange.year': 'Year',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('ja');
  const [translations, setTranslations] = useState<Record<string, string>>(translationDict.ja);

  // Load language preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Always use Japanese as default
      setLanguageState('ja');
      setTranslations(translationDict['ja']);
      // Set localStorage to Japanese as well
      localStorage.setItem('language', 'ja');
      // Update the html lang attribute for accessibility
      document.documentElement.lang = 'ja';
    }
  }, []);

  // Function to set language and update localStorage
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setTranslations(translationDict[lang]);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
      // Also update the html lang attribute for accessibility
      document.documentElement.lang = lang;
    }
  };

  // Add a shorter alias for translations
  const t = (key: string): string => {
    return translations[key] || key;
  };

  const value = { language, setLanguage, translations, t };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageProvider; 