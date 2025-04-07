import { prisma } from '@/lib/prisma';

// Helper function to create automatic logs for user actions
export async function createActivityLogHelper(userId: string, action: string, category: string, details?: any) {
  try {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    
    // Create description based on action type
    let description = '';
    switch (action) {
      case 'login':
        description = 'システムにログインしました';
        break;
      case 'logout':
        description = 'システムからログアウトしました';
        break;
      case 'project_create':
        description = `プロジェクト「${details?.name || ''}」を作成しました`;
        break;
      case 'project_update':
        description = `プロジェクト「${details?.name || ''}」を更新しました`;
        break;
      case 'project_delete':
        description = `プロジェクト「${details?.name || ''}」を削除しました`;
        break;
      case 'task_create':
        description = `タスク「${details?.title || ''}」を作成しました`;
        if (details?.projectName) {
          description += `（プロジェクト：${details.projectName}）`;
        }
        break;
      case 'task_update':
        description = `タスク「${details?.title || ''}」を更新しました`;
        if (details?.projectName) {
          description += `（プロジェクト：${details.projectName}）`;
        }
        if (details?.status) {
          const statusMap: Record<string, string> = {
            'todo': '未着手',
            'in_progress': '進行中',
            'review': 'レビュー中',
            'completed': '完了'
          };
          const statusText = statusMap[details.status] || details.status;
          description += `（ステータス：${statusText}）`;
        }
        break;
      case 'task_complete':
        description = `タスク「${details?.title || ''}」を完了しました`;
        if (details?.projectName) {
          description += `（プロジェクト：${details.projectName}）`;
        }
        break;
      case 'task_delete':
        description = `タスク「${details?.title || ''}」を削除しました`;
        if (details?.projectName) {
          description += `（プロジェクト：${details.projectName}）`;
        }
        break;
      case 'report_submit':
        description = `日報を提出しました`;
        break;
      case 'team_join':
        description = `チーム「${details?.teamName || ''}」に参加しました`;
        break;
      case 'team_invite_reject':
        description = `チーム「${details?.teamName || ''}」への招待を拒否しました`;
        break;
      case 'team_create':
        description = `チーム「${details?.teamName || ''}」を作成しました`;
        break;
      case 'team_invite_send':
        description = `${details?.email || 'ユーザー'}をチーム「${details?.teamName || ''}」に招待しました`;
        break;
      default:
        description = action;
    }
    
    // Create the log entry
    const log = await prisma.dailyLog.create({
      data: {
        date: now,
        startTime: timeString,
        endTime: timeString,
        description,
        category,
        completed: true,
        userId,
      }
    });
    
    return log;
  } catch (error) {
    console.error('Error creating automatic log:', error);
    return null;
  }
} 