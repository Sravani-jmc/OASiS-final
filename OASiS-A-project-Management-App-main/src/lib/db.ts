/**
 * Simple localStorage-based database implementation
 * This provides data persistence between sessions
 */

// Models
export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // In a real app, this would be hashed
  role: string;
  avatar?: string;
  loginHistory: string[]; // Array of ISO date strings
  lastActive: string; // ISO date string
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'planning' | 'onHold';
  progress: number; // 0-100
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  lead: string; // User ID
  members: string[]; // Array of User IDs
  tags: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed' | 'review';
  priority: 'high' | 'medium' | 'low';
  progress: number; // 0-100
  project: string; // Project ID
  startDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  assignees: string[]; // Array of User IDs
  tags: string[];
}

export interface TimeLog {
  id: string;
  userId: string;
  taskId?: string;
  projectId?: string;
  startTime: string;
  endTime?: string;
  description?: string;
  createdAt: string;
}

// Database class
class Database {
  // Initial data for development
  private initialData = {
    users: [
      {
        id: '1',
        name: '田中 太郎',
        email: 'tanaka@example.com',
        password: 'password123',
        role: 'プロジェクトマネージャー',
        loginHistory: [],
        lastActive: new Date().toISOString()
      },
      {
        id: '2',
        name: '鈴木 花子',
        email: 'suzuki@example.com',
        password: 'password123',
        role: 'デザイナー',
        loginHistory: [],
        lastActive: new Date().toISOString()
      },
      {
        id: '3',
        name: '佐藤 次郎',
        email: 'sato@example.com',
        password: 'password123',
        role: 'デベロッパー',
        loginHistory: [],
        lastActive: new Date().toISOString()
      },
      {
        id: '4',
        name: '高橋 三郎',
        email: 'takahashi@example.com',
        password: 'password123',
        role: 'マーケター',
        loginHistory: [],
        lastActive: new Date().toISOString()
      }
    ] as User[],
    
    projects: [
      {
        id: '1',
        title: 'ウェブサイトリニューアル',
        description: '会社ウェブサイトの全面的なリニューアル',
        status: 'active',
        progress: 65,
        startDate: '2023-01-15',
        endDate: '2023-03-30',
        createdAt: '2023-01-10T09:00:00Z',
        updatedAt: '2023-01-10T09:00:00Z',
        lead: '1',
        members: ['1', '2', '3'],
        tags: ['ウェブ', 'デザイン', 'フロントエンド']
      },
      {
        id: '2',
        title: 'モバイルアプリ開発',
        description: 'iOS/Androidアプリの新規開発',
        status: 'planning',
        progress: 10,
        startDate: '2023-04-01',
        endDate: '2023-08-31',
        createdAt: '2023-02-20T14:30:00Z',
        updatedAt: '2023-02-20T14:30:00Z',
        lead: '3',
        members: ['1', '3', '4'],
        tags: ['モバイル', 'React Native', 'API']
      }
    ] as Project[],
    
    tasks: [
      {
        id: '1',
        title: 'ワイヤーフレーム作成',
        description: 'サイトの全ページのワイヤーフレームを作成',
        status: 'completed',
        priority: 'high',
        progress: 100,
        project: '1',
        startDate: '2023-01-15',
        dueDate: '2023-01-25',
        createdAt: '2023-01-15T10:00:00Z',
        updatedAt: '2023-01-25T16:00:00Z',
        assignees: ['2'],
        tags: ['デザイン', 'UX']
      },
      {
        id: '2',
        title: 'フロントエンド開発',
        description: 'React.jsを使用したフロントエンド実装',
        status: 'inProgress',
        priority: 'high',
        progress: 60,
        project: '1',
        startDate: '2023-01-26',
        dueDate: '2023-02-28',
        createdAt: '2023-01-25T09:00:00Z',
        updatedAt: '2023-02-15T11:30:00Z',
        assignees: ['3'],
        tags: ['コーディング', 'React']
      },
      {
        id: '3',
        title: 'コンテンツ作成',
        description: 'ウェブサイト用のコンテンツ作成と校正',
        status: 'notStarted',
        priority: 'medium',
        progress: 0,
        project: '1',
        startDate: '2023-02-01',
        dueDate: '2023-03-10',
        createdAt: '2023-01-25T09:30:00Z',
        updatedAt: '2023-01-25T09:30:00Z',
        assignees: ['4'],
        tags: ['コンテンツ', '校正']
      },
      {
        id: '4',
        title: 'アプリ要件定義',
        description: 'モバイルアプリの要件と仕様の定義',
        status: 'inProgress',
        priority: 'high',
        progress: 80,
        project: '2',
        startDate: '2023-04-01',
        dueDate: '2023-04-15',
        createdAt: '2023-03-25T13:00:00Z',
        updatedAt: '2023-04-10T15:45:00Z',
        assignees: ['1', '3'],
        tags: ['企画', '要件定義']
      }
    ] as Task[],
    
    timeLogs: [] as TimeLog[]
  };

  // Initialize the database
  initDB(): void {
    // Only initialize if data doesn't exist
    if (!localStorage.getItem('oasisDB_users')) {
      localStorage.setItem('oasisDB_users', JSON.stringify(this.initialData.users));
    }
    
    if (!localStorage.getItem('oasisDB_projects')) {
      localStorage.setItem('oasisDB_projects', JSON.stringify(this.initialData.projects));
    }
    
    if (!localStorage.getItem('oasisDB_tasks')) {
      localStorage.setItem('oasisDB_tasks', JSON.stringify(this.initialData.tasks));
    }
    
    if (!localStorage.getItem('oasisDB_timeLogs')) {
      localStorage.setItem('oasisDB_timeLogs', JSON.stringify(this.initialData.timeLogs));
    }
  }

  // User methods
  getUsers(): User[] {
    try {
      const users = localStorage.getItem('oasisDB_users');
      return users ? JSON.parse(users) : [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  getUserById(id: string): User | null {
    try {
      const users = this.getUsers();
      return users.find(user => user.id === id) || null;
    } catch (error) {
      console.error(`Error getting user ${id}:`, error);
      return null;
    }
  }

  getCurrentUser(): User | null {
    try {
      const currentUserId = localStorage.getItem('oasisCurrentUser');
      if (!currentUserId) return null;
      
      return this.getUserById(currentUserId);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  setCurrentUser(userId: string): void {
    localStorage.setItem('oasisCurrentUser', userId);
  }

  logUserLogin(userId: string): void {
    try {
      const users = this.getUsers();
      const userIndex = users.findIndex(user => user.id === userId);
      
      if (userIndex >= 0) {
        const now = new Date().toISOString();
        users[userIndex].loginHistory.push(now);
        users[userIndex].lastActive = now;
        
        localStorage.setItem('oasisDB_users', JSON.stringify(users));
      }
    } catch (error) {
      console.error(`Error logging login for user ${userId}:`, error);
    }
  }

  updateUserActivity(userId: string): void {
    try {
      const users = this.getUsers();
      const userIndex = users.findIndex(user => user.id === userId);
      
      if (userIndex >= 0) {
        users[userIndex].lastActive = new Date().toISOString();
        localStorage.setItem('oasisDB_users', JSON.stringify(users));
      }
    } catch (error) {
      console.error(`Error updating activity for user ${userId}:`, error);
    }
  }

  // Project methods
  getProjects(): Project[] {
    try {
      const projects = localStorage.getItem('oasisDB_projects');
      return projects ? JSON.parse(projects) : [];
    } catch (error) {
      console.error('Error getting projects:', error);
      return [];
    }
  }

  getProjectById(id: string): Project | null {
    try {
      const projects = this.getProjects();
      return projects.find(project => project.id === id) || null;
    } catch (error) {
      console.error(`Error getting project ${id}:`, error);
      return null;
    }
  }

  createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    try {
      const projects = this.getProjects();
      const now = new Date().toISOString();
      
      const newProject: Project = {
        ...projectData,
        id: `p-${Date.now()}`,
        createdAt: now,
        updatedAt: now
      };
      
      projects.push(newProject);
      localStorage.setItem('oasisDB_projects', JSON.stringify(projects));
      
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('プロジェクトの作成に失敗しました。');
    }
  }

  updateProject(id: string, projectData: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Project {
    try {
      const projects = this.getProjects();
      const projectIndex = projects.findIndex(project => project.id === id);
      
      if (projectIndex < 0) {
        throw new Error('プロジェクトが見つかりません。');
      }
      
      const updatedProject: Project = {
        ...projects[projectIndex],
        ...projectData,
        updatedAt: new Date().toISOString()
      };
      
      projects[projectIndex] = updatedProject;
      localStorage.setItem('oasisDB_projects', JSON.stringify(projects));
      
      return updatedProject;
    } catch (error) {
      console.error(`Error updating project ${id}:`, error);
      throw new Error('プロジェクトの更新に失敗しました。');
    }
  }

  updateProjectProgress(id: string): void {
    try {
      // Get all tasks for this project and calculate overall progress
      const tasks = this.getTasks().filter(task => task.project === id);
      
      if (tasks.length === 0) return;
      
      // Assign weights based on priority
      const getTaskWeight = (priority: string) => {
        switch (priority) {
          case 'high': return 3;
          case 'medium': return 2;
          case 'low': return 1;
          default: return 1;
        }
      };
      
      const totalWeight = tasks.reduce((sum, task) => sum + getTaskWeight(task.priority), 0);
      const completedWeight = tasks
        .filter(task => task.status === 'completed')
        .reduce((sum, task) => sum + getTaskWeight(task.priority), 0);
      
      const averageProgress = Math.round((completedWeight / totalWeight) * 100);
      
      // Update project progress
      this.updateProject(id, { progress: averageProgress });
      
      // If all tasks are complete, mark project as completed
      if (averageProgress === 100) {
        this.updateProject(id, { status: 'completed' });
      } else if (averageProgress > 0) {
        const project = this.getProjectById(id);
        if (project && project.status === 'planning') {
          this.updateProject(id, { status: 'active' });
        }
      }
    } catch (error) {
      console.error(`Error updating project progress ${id}:`, error);
    }
  }

  // Task methods
  getTasks(): Task[] {
    try {
      const tasks = localStorage.getItem('oasisDB_tasks');
      return tasks ? JSON.parse(tasks) : [];
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  getTaskById(id: string): Task | null {
    try {
      const tasks = this.getTasks();
      return tasks.find(task => task.id === id) || null;
    } catch (error) {
      console.error(`Error getting task ${id}:`, error);
      return null;
    }
  }

  getTasksByProject(projectId: string): Task[] {
    try {
      const tasks = this.getTasks();
      return tasks.filter(task => task.project === projectId);
    } catch (error) {
      console.error(`Error getting tasks for project ${projectId}:`, error);
      return [];
    }
  }

  getTasksByAssignee(userId: string): Task[] {
    try {
      const tasks = this.getTasks();
      return tasks.filter(task => task.assignees.includes(userId));
    } catch (error) {
      console.error(`Error getting tasks for user ${userId}:`, error);
      return [];
    }
  }

  createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    try {
      const tasks = this.getTasks();
      const now = new Date().toISOString();
      
      const newTask: Task = {
        ...taskData,
        id: `t-${Date.now()}`,
        createdAt: now,
        updatedAt: now
      };
      
      tasks.push(newTask);
      localStorage.setItem('oasisDB_tasks', JSON.stringify(tasks));
      
      // Update project progress after adding a task
      this.updateProjectProgress(newTask.project);
      
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error('タスクの作成に失敗しました。');
    }
  }

  updateTask(id: string, taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Task {
    try {
      const tasks = this.getTasks();
      const taskIndex = tasks.findIndex(task => task.id === id);
      
      if (taskIndex < 0) {
        throw new Error('タスクが見つかりません。');
      }
      
      const updatedTask: Task = {
        ...tasks[taskIndex],
        ...taskData,
        updatedAt: new Date().toISOString()
      };
      
      tasks[taskIndex] = updatedTask;
      localStorage.setItem('oasisDB_tasks', JSON.stringify(tasks));
      
      // Update project progress after updating a task
      this.updateProjectProgress(updatedTask.project);
      
      return updatedTask;
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      throw new Error('タスクの更新に失敗しました。');
    }
  }

  // Time log methods
  createTimeLog(logData: Omit<TimeLog, 'id' | 'createdAt'>): TimeLog {
    try {
      const timeLogs = this.getTimeLogs();
      const now = new Date().toISOString();
      
      const newLog: TimeLog = {
        ...logData,
        id: `log-${Date.now()}`,
        createdAt: now
      };
      
      timeLogs.push(newLog);
      localStorage.setItem('oasisDB_timeLogs', JSON.stringify(timeLogs));
      
      return newLog;
    } catch (error) {
      console.error('Error creating time log:', error);
      throw new Error('タイムログの作成に失敗しました。');
    }
  }

  updateTimeLog(id: string, endTime: string): TimeLog {
    try {
      const timeLogs = this.getTimeLogs();
      const logIndex = timeLogs.findIndex(log => log.id === id);
      
      if (logIndex < 0) {
        throw new Error('タイムログが見つかりません。');
      }
      
      timeLogs[logIndex].endTime = endTime;
      localStorage.setItem('oasisDB_timeLogs', JSON.stringify(timeLogs));
      
      return timeLogs[logIndex];
    } catch (error) {
      console.error(`Error updating time log ${id}:`, error);
      throw new Error('タイムログの更新に失敗しました。');
    }
  }

  getTimeLogs(): TimeLog[] {
    try {
      const timeLogs = localStorage.getItem('oasisDB_timeLogs');
      return timeLogs ? JSON.parse(timeLogs) : [];
    } catch (error) {
      console.error('Error getting time logs:', error);
      return [];
    }
  }

  getTimeLogsByUser(userId: string): TimeLog[] {
    try {
      const timeLogs = this.getTimeLogs();
      return timeLogs.filter(log => log.userId === userId);
    } catch (error) {
      console.error(`Error getting time logs for user ${userId}:`, error);
      return [];
    }
  }

  getTimeLogsByTask(taskId: string): TimeLog[] {
    try {
      const timeLogs = this.getTimeLogs();
      return timeLogs.filter(log => log.taskId === taskId);
    } catch (error) {
      console.error(`Error getting time logs for task ${taskId}:`, error);
      return [];
    }
  }

  getActiveTimeLog(userId: string): TimeLog | null {
    try {
      const timeLogs = this.getTimeLogs();
      return timeLogs.find(log => log.userId === userId && !log.endTime) || null;
    } catch (error) {
      console.error(`Error getting active time log for user ${userId}:`, error);
      return null;
    }
  }
}

// Create a singleton instance
const db = new Database();

// Export methods
export const initDB = () => db.initDB();
export const getUsers = () => db.getUsers();
export const getUserById = (id: string) => db.getUserById(id);
export const getCurrentUser = () => db.getCurrentUser();
export const setCurrentUser = (userId: string) => db.setCurrentUser(userId);
export const logUserLogin = (userId: string) => db.logUserLogin(userId);
export const updateUserActivity = (userId: string) => db.updateUserActivity(userId);

export const getProjects = () => db.getProjects();
export const getProjectById = (id: string) => db.getProjectById(id);
export const createProject = (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => db.createProject(data);
export const updateProject = (id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => db.updateProject(id, data);
export const updateProjectProgress = (id: string) => db.updateProjectProgress(id);

export const getTasks = () => db.getTasks();
export const getTaskById = (id: string) => db.getTaskById(id);
export const getTasksByProject = (projectId: string) => db.getTasksByProject(projectId);
export const getTasksByAssignee = (userId: string) => db.getTasksByAssignee(userId);
export const createTask = (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => db.createTask(data);
export const updateTask = (id: string, data: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>) => db.updateTask(id, data);

export const createTimeLog = (data: Omit<TimeLog, 'id' | 'createdAt'>) => db.createTimeLog(data);
export const updateTimeLog = (id: string, endTime: string) => db.updateTimeLog(id, endTime);
export const getTimeLogs = () => db.getTimeLogs();
export const getTimeLogsByUser = (userId: string) => db.getTimeLogsByUser(userId);
export const getTimeLogsByTask = (taskId: string) => db.getTimeLogsByTask(taskId);
export const getActiveTimeLog = (userId: string) => db.getActiveTimeLog(userId); 