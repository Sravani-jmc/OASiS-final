'use client';

import { useState, useEffect, Fragment } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Dialog, Transition, Menu } from '@headlessui/react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon,
  FolderIcon,
  ChatBubbleLeftRightIcon,
  ChevronDoubleLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleRightIcon,
  XMarkIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PencilIcon,
  PlusCircleIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';

// Define interfaces for type safety
interface DailyReport {
  completed: string[];
  inProgress: string[];
  issues: string[];
  tomorrow: string[];
  project: string;
  status: 'completed' | 'pending' | 'overdue';
  userId: string; // Add userId to track report ownership
  projectId: string; // Add projectId for dynamic project linking
  taskIds: string[]; // Add taskIds for dynamic task linking
  userFeedback: string | null; // Add userFeedback for daily activities
  adminFeedback: string | null; // Add adminFeedback for admin review
  adminReviewed: boolean; // Track if an admin has reviewed the report
  reportIndex?: number; // Add reportIndex to support multiple reports per day
}

interface MemberReports {
  [date: string]: DailyReport | DailyReport[]; // Update to support array of reports for a day
}

interface DailyReportsData {
  [member: string]: MemberReports;
}

interface Member {
  id: string;
  name: string;
}

interface ReportStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string; // Add status property to match usage in updateDashboardData
  priority?: string;
  managerId?: string;
  teamId?: string;
  team?: any;
  members?: any[];
  tasks?: any[];
}

interface Task {
  id: string;
  title: string;
  projectId: string;
  assigneeId: string | null;
  status: string;
  completedAt?: string | null;
  createdAt: string;
}

// Dashboard data structures - initialized with zeroes to avoid reference errors
const projectStatusData = {
  total: 0,
  active: 0,
  completed: 0,
  onHold: 0,
  overdue: 0
};

// Task completion data - initialized with zeroes
const taskCompletionData = {
  total: 0,
  completed: 0,
  inProgress: 0,
  notStarted: 0,
  completionRate: 0
};

// Team productivity data - initialized with zeroes
const teamProductivityData = [
  { name: '開発チーム', tasksCompleted: 0, membersCount: 0 },
  { name: 'デザインチーム', tasksCompleted: 0, membersCount: 0 },
  { name: 'マーケティングチーム', tasksCompleted: 0, membersCount: 0 }
];

// Timeline data - initialized with zeroes
const timelineData = {
  onSchedule: 0,
  delayed: 0,
  ahead: 0
};

// Monthly trends data - initialized with zeroes
const monthlyTaskTrends = [
  { month: 'Jan', completed: 0 },
  { month: 'Feb', completed: 0 },
  { month: 'Mar', completed: 0 },
  { month: 'Apr', completed: 0 },
  { month: 'May', completed: 0 },
  { month: 'Jun', completed: 0 }
];

export default function ReportsPage() {
  const [timeframe, setTimeframe] = useState('month');
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState('overview');
  
  // Current user information - in a real app, this would come from authentication
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  
  // State for viewing reports
  const [viewMode, setViewMode] = useState<'single' | 'team'>('single');
  const [selectedMember, setSelectedMember] = useState<string>('');
  
  // New state variables for daily reports
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<DailyReport | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [reportStats, setReportStats] = useState<ReportStats>({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0
  });
  
  // State for calendar
  const [selectedCell, setSelectedCell] = useState<HTMLTableCellElement | null>(null);

  // State variables for daily reports - initialize with empty object to avoid undefined errors
  const [dailyReports, setDailyReports] = useState<DailyReportsData>({});

  // New state variables for new report
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
  const [newReportDate, setNewReportDate] = useState('');
  const [newReportData, setNewReportData] = useState<Omit<DailyReport, 'status' | 'projectId' | 'taskIds' | 'userFeedback' | 'adminFeedback' | 'adminReviewed'>>({
    completed: [],
    inProgress: [],
    issues: [],
    tomorrow: [],
    project: '',
    userId: ''
  });
  const [completedTask, setCompletedTask] = useState('');
  const [inProgressTask, setInProgressTask] = useState('');
  const [issueItem, setIssueItem] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');

  // State for edit mode
  const [isEditMode, setIsEditMode] = useState(false);

  // State for projects and tasks
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  
  // State for user feedback
  const [userFeedbackText, setUserFeedbackText] = useState('');
  
  // State for admin feedback
  const [adminFeedbackText, setAdminFeedbackText] = useState('');
  const [isAdmin, setIsAdmin] = useState(false); // In a real app, this would come from authentication
  
  // State for members
  const [members, setMembers] = useState<Member[]>([]);

  // Function to fetch members from the database
  const fetchMembers = async () => {
    try {
      console.log('Fetching members from database');
      
      // Get session info from API
      const sessionResponse = await fetch('/api/auth/session');
      if (!sessionResponse.ok) {
        throw new Error('Failed to fetch session');
      }
      
      const sessionData = await sessionResponse.json();
      
      if (!sessionData.user) {
        throw new Error('No authenticated user found');
      }
      
      // Set admin status from session data
      setIsAdmin(sessionData.user.isAdmin || false);
      
      // Fetch all members
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      
      const data = await response.json();
      
      // Map to Member format
      const formattedMembers = data.map((user: any) => ({
        id: user.id,
        name: user.fullName || user.username,
      }));
      
      // Set current user
      const currentUserData = formattedMembers.find((member: Member) => member.id === sessionData.user.id) || formattedMembers[0];
      setCurrentUser(currentUserData);
      
      console.log('Fetched members:', formattedMembers);
      return formattedMembers;
    } catch (error) {
      console.error('Error fetching members:', error);
      return [];
    }
  };

  // Function to fetch projects from the database
  const fetchProjects = async () => {
    try {
      console.log('Fetching projects from database');
      
      // Fetch actual projects from the API
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const projects = await response.json();
      
      // If no projects, return a default one to avoid errors
      if (!projects || projects.length === 0) {
        return [{ id: 'default-project', name: 'Default Project', description: 'Default project' }];
      }
      
      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Return a default project to avoid errors
      return [{ id: 'default-project', name: 'Default Project', description: 'Default project' }];
    }
  };

  // Function to fetch tasks from the database
  const fetchTasks = async () => {
    try {
      console.log('Fetching tasks from database');
      
      // Fetch actual tasks from the API
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const tasks = await response.json();
      
      // If no tasks, return an empty array
      if (!tasks) {
        return [];
      }
      
      return tasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  };

  // Function to fetch reports from the database
  const fetchReports = async () => {
    try {
      console.log('Fetching reports from database');
      
      // Get session user ID
      const sessionResponse = await fetch('/api/auth/session');
      const sessionData = await sessionResponse.json();
      
      if (!sessionData?.user?.id) {
        console.error('No user ID available for fetching reports');
        return { };
      }
      
      const userId = sessionData.user.id;
      const isUserAdmin = sessionData.user.isAdmin || false;
      console.log('Fetching reports for user:', userId, 'Admin:', isUserAdmin);
      
      // Add timestamp to prevent browser/API caching
      const timestamp = Date.now();
      
      // Check for cached reports data (only if not refreshing)
      const now = Date.now();
      const cachedData = sessionStorage.getItem('reportsCache');
      
      if (cachedData) {
        const { timestamp: cacheTime, data, admin } = JSON.parse(cachedData);
        // Only use cache if it's less than 1 minute old and admin status matches
        if (now - cacheTime < 1 * 60 * 1000 && admin === isUserAdmin) {
          console.log('Using cached reports data');
          return data;
        }
      }
      
      let allReports = {};
      
      // Fetch current user's reports with cache busting
      const response = await fetch(`/api/reports?userId=${userId}&_=${timestamp}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      
      const data = await response.json();
      console.log('Fetched reports data for current user:', data);
      
      // Merge the data into allReports
      allReports = { ...allReports, ...data };
      
      // If admin, fetch reports for all users
      if (isUserAdmin) {
        console.log('User is admin, fetching all reports');
        
        // Fetch all members if not already fetched
        const membersList = members.length > 0 ? members : await fetchMembers();
        
        // Create an array of members to fetch (excluding current user)
        const filterMember = (member: Member) => member.id !== userId;
        const membersToFetch = membersList.filter(filterMember);
        
        if (membersToFetch.length > 0) {
          // Use Promise.all to fetch all member reports in parallel
          const memberPromises = membersToFetch.map((member: Member) => {
            return fetch(`/api/reports?userId=${member.id}&_=${timestamp}`)
              .then(response => {
                if (!response.ok) {
                  console.error(`Failed to fetch reports for member ${member.id}`);
                  return null;
                }
                return response.json();
              })
              .catch(error => {
                console.error(`Error fetching reports for member ${member.id}:`, error);
                return null;
              });
          });
          
          // Wait for all requests to complete
          const memberResults = await Promise.all(memberPromises);
          
          // Merge results into allReports
          memberResults.forEach(result => {
            if (result) {
              allReports = { ...allReports, ...result };
            }
          });
        }
      }
      
      console.log('All reports after merging:', allReports);
      
      // Ensure we return a properly structured object even if the API returns empty data
      if (!allReports || Object.keys(allReports).length === 0) {
        console.log('No reports data returned from API, initializing empty structure');
        // Initialize with current user ID
        allReports = { [userId]: {} };
      }
      
      // Cache the reports data with a shorter expiry time
      sessionStorage.setItem('reportsCache', JSON.stringify({
        timestamp: now,
        data: allReports,
        admin: isUserAdmin
      }));
      
      return allReports;
    } catch (error) {
      console.error('Error fetching reports:', error);
      // Return empty object to prevent undefined errors
      if (currentUser?.id) {
        return { [currentUser.id]: {} };
      }
      return { };
    }
  };

  // Function to refresh reports
  const refreshReports = async () => {
    try {
      setLoading(true);
      console.log('Refreshing reports...');
      
      // Clear the reports cache to force fresh data
      sessionStorage.removeItem('reportsCache');
      
      // Fetch members, projects, and tasks (needed for displaying report details)
      if (members.length === 0) {
        const fetchedMembers = await fetchMembers();
        if (fetchedMembers) setMembers(fetchedMembers);
      }
      
      if (projects.length === 0) {
        const fetchedProjects = await fetchProjects();
        if (fetchedProjects) setProjects(fetchedProjects);
      }
      
      if (tasks.length === 0) {
        const fetchedTasks = await fetchTasks();
        if (fetchedTasks) setTasks(fetchedTasks);
      }
      
      // Update dashboard data
      updateDashboardData();
      
      // Fetch reports with cache bypass
      const timestamp = Date.now();
      const fetchedReports = await fetchReports();
      console.log('Refreshed reports:', fetchedReports);
      
      if (fetchedReports && Object.keys(fetchedReports).length > 0) {
        setDailyReports(fetchedReports);
      } else {
        // If no reports were fetched, initialize with empty object
        if (currentUser?.id) {
          setDailyReports({ [currentUser.id]: {} });
        } else {
          setDailyReports({});
        }
      }
      
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Error refreshing reports:', error);
      setLoading(false);
      
      // Return false to indicate failure
      return false;
    }
  };

  // useEffect to load data on component mount
  useEffect(() => {
    // Load data
    const loadData = async () => {
      setLoading(true);
      
      try {
        // First get session to check admin status - this is required for everything else
        const sessionResponse = await fetch('/api/auth/session');
        let userId = '';
        let isUserAdmin = false;
        
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData?.user) {
            // Set admin status from session data
            userId = sessionData.user.id;
            isUserAdmin = sessionData.user.isAdmin || false;
            setIsAdmin(isUserAdmin);
            
            console.log('User session:', sessionData.user);
            console.log('Admin status:', isUserAdmin);
          }
        }
        
        // Only continue if we have a valid user
        if (!userId) {
          console.error('No valid user found in session');
          setLoading(false);
          return;
        }
        
        // Use Promise.all to fetch members, projects, and tasks in parallel
        const [fetchedMembers, fetchedProjects, fetchedTasks] = await Promise.all([
          fetchMembers(),
          fetchProjects(),
          fetchTasks()
        ]);
        
        // Process members immediately to set current user
        if (fetchedMembers && fetchedMembers.length > 0) {
          setMembers(fetchedMembers);
          // Set current user
          const currentUserData = fetchedMembers.find((member: Member) => member.id === userId) || fetchedMembers[0];
          setCurrentUser(currentUserData);
          setSelectedMember(currentUserData.id);
          setNewReportData(prev => ({ ...prev, userId: currentUserData.id }));
        }
        
        // Set projects and tasks
        if (fetchedProjects) setProjects(fetchedProjects);
        if (fetchedTasks) setTasks(fetchedTasks);
        
        // Update dashboard data with the fetched projects and tasks
        updateDashboardData();
        
        // Fetch reports in the final step
        const fetchedReports = await fetchReports();
        console.log('Setting daily reports to:', fetchedReports);
        
        if (fetchedReports && Object.keys(fetchedReports).length > 0) {
          setDailyReports(fetchedReports);
        } else {
          // Initialize with empty reports if none fetched
          if (currentUser?.id) {
            setDailyReports({ [currentUser.id]: {} });
          } else {
            setDailyReports({});
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // For a real application, this would fetch data based on the selected timeframe
  useEffect(() => {
    // Refresh reports when timeframe changes
    console.log(`Fetching data for timeframe: ${timeframe}`);
    refreshReports();
  }, [timeframe]);

  // Add a useEffect to refresh reports periodically
  useEffect(() => {
    // Set up an interval to refresh reports every 5 minutes
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing reports data');
      refreshReports();
    }, 5 * 60 * 1000); // 5 minutes in milliseconds
    
    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Calculate report statistics when selected member changes
  useEffect(() => {
    if (dailyReports[selectedMember]) {
      const memberReports = dailyReports[selectedMember];
      const stats = {
        total: Object.keys(memberReports).length,
        completed: Object.values(memberReports).filter(report => {
          try {
            return getReportStatusFromObject(report) === 'completed';
          } catch (e) {
            return false;
          }
        }).length,
        pending: Object.values(memberReports).filter(report => {
          try {
            return getReportStatusFromObject(report) === 'pending';
          } catch (e) {
            return false;
          }
        }).length,
        overdue: Object.values(memberReports).filter(report => {
          try {
            return getReportStatusFromObject(report) === 'overdue';
          } catch (e) {
            return false;
          }
        }).length
      };
      setReportStats(stats);
    } else {
      setReportStats({ total: 0, completed: 0, pending: 0, overdue: 0 });
    }
  }, [selectedMember, dailyReports]);
  
  // Filter tasks based on selected project
  useEffect(() => {
    if (selectedProject) {
      // Filter tasks that belong to the selected project
      const filtered = tasks.filter(task => task.projectId === selectedProject);
      console.log('Filtered tasks for project', selectedProject, ':', filtered);
      setFilteredTasks(filtered);
    } else {
      // If no project selected, clear filtered tasks
      setFilteredTasks([]);
    }
  }, [selectedProject, tasks]);
  
  // Add the dashboard data update to the useEffect
  useEffect(() => {
    // Load data
    const loadData = async () => {
      setLoading(true);
      
      try {
        // First get session to check admin status
        const sessionResponse = await fetch('/api/auth/session');
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData?.user) {
            // Set admin status from session data
            setIsAdmin(sessionData.user.isAdmin || false);
            
            console.log('User session:', sessionData.user);
            console.log('Admin status:', sessionData.user.isAdmin);
          }
        }
        
        // Fetch members, projects, tasks, and reports
        const fetchedMembers = await fetchMembers();
        const fetchedProjects = await fetchProjects();
        const fetchedTasks = await fetchTasks();
        
        // Set current user and members
        if (fetchedMembers && fetchedMembers.length > 0) {
          setMembers(fetchedMembers);
          // Current user is already set in fetchMembers
          if (currentUser) {
            setSelectedMember(currentUser.id);
            setNewReportData(prev => ({ ...prev, userId: currentUser.id }));
          }
        }
        
        if (fetchedProjects) setProjects(fetchedProjects);
        if (fetchedTasks) setTasks(fetchedTasks);
        
        // Fetch reports after setting current user
        const fetchedReports = await fetchReports();
        console.log('Setting daily reports to:', fetchedReports);
        
        if (fetchedReports && Object.keys(fetchedReports).length > 0) {
        setDailyReports(fetchedReports);
        } else {
          // Initialize with empty reports if none fetched
          if (currentUser?.id) {
            setDailyReports({ [currentUser.id]: {} });
          } else {
            setDailyReports({});
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
        
        // Initialize with empty reports on error
        if (currentUser?.id) {
          setDailyReports({ [currentUser.id]: {} });
        } else {
          setDailyReports({});
        }
      }
    };
    
    loadData();
  }, []);

  // Function to format date as YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Function to show report modal
  const showReportModal = (dateString: string, memberId?: string) => {
    try {
      console.log(`Showing report modal for date ${dateString} with member ID:`, memberId);
      
      setTimeout(() => {
        try {
          // Set the selectedDay state
          setSelectedDay(dateString);
          
          // If no member ID is provided, use the current user's ID
          const userId = memberId || (currentUser ? currentUser.id : '');
          
          // Make sure we have a user ID
          if (!userId) {
            console.error('Cannot show report: No user ID provided');
            alert('ユーザー情報が見つかりません');
            return;
          }
          
          // Set selectedMember
          setSelectedMember(userId);
          
          // Check if the user has reports
          if (dailyReports[userId]) {
            // Get the report data for this date
            const reportForDate = dailyReports[userId][dateString];
            
            // If there are multiple reports for this date
            if (Array.isArray(reportForDate)) {
              // If there's at least one report
              if (reportForDate.length > 0) {
                // Create a custom modal for report selection
                const reportSelectionModal = document.createElement('div');
                reportSelectionModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                reportSelectionModal.innerHTML = `
                  <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div class="text-lg font-semibold mb-4">複数のレポートが見つかりました</div>
                    <p class="text-gray-600 mb-4">${new Date(dateString).toLocaleDateString('ja-JP')}には${reportForDate.length}件のレポートがあります。表示するレポートを選択してください：</p>
                    <div class="space-y-2 mb-6">
                      ${reportForDate.map((report, index) => `
                        <button 
                          class="w-full text-left p-3 border rounded-md hover:bg-gray-50 flex items-center transition duration-150 report-select-btn"
                          data-index="${index}"
                        >
                          <div class="w-3 h-8 ${['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500'][index % 4]} rounded-sm mr-3"></div>
                          <div class="flex-grow">
                            <div class="font-medium">${report.project}</div>
                            <div class="text-sm text-gray-500">
                              ${report.completed.length} 完了タスク / ${report.inProgress.length} 進行中タスク
                            </div>
                          </div>
                          <div class="ml-2">
                            ${(report as DailyReport).adminReviewed ? 
                              '<span class="text-green-600 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>レビュー済</span>' : 
                              '<span class="text-amber-600 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16z" clip-rule="evenodd" /></svg>レビュー待ち</span>'}
                          </div>
                        </button>
                      `).join('')}
                    </div>
                    <div class="flex justify-between mt-4">
                      <div class="text-sm text-gray-600">
                        ${reportForDate.filter((r: DailyReport) => r.adminReviewed).length}/${reportForDate.length} レポートがレビュー済み
                      </div>
                      <div class="flex">
                        <button class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md mr-2 close-modal-btn">キャンセル</button>
                        <button class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 create-new-report-btn">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clip-rule="evenodd" />
                          </svg>
                          新規レポート作成
                        </button>
                      </div>
                    </div>
                  </div>
                `;
                
                document.body.appendChild(reportSelectionModal);
                
                // Add event listeners for report selection
                const reportButtons = reportSelectionModal.querySelectorAll('.report-select-btn');
                reportButtons.forEach(button => {
                  button.addEventListener('click', () => {
                    const selectedIndex = parseInt(button.getAttribute('data-index') || '0');
                    
                    if (selectedIndex >= 0 && selectedIndex < reportForDate.length) {
                      // Set the data for the selected report
                      const selectedReport = reportForDate[selectedIndex];
                      setReportData(selectedReport);
                      
                      // Update the project and task selection
                      if (selectedReport.projectId) {
                        setSelectedProject(selectedReport.projectId);
                        
                        // Update filtered tasks based on the project
                        const projectTasks = tasks.filter(task => task.projectId === selectedReport.projectId);
                        setFilteredTasks(projectTasks);
                        
                        // Set selected tasks
                        if (selectedReport.taskIds && Array.isArray(selectedReport.taskIds)) {
                          setSelectedTasks(selectedReport.taskIds);
                        } else {
                          // If taskIds is not available or not an array, set empty array
                          setSelectedTasks([]);
                        }
                      } else {
                        // If no projectId is available, clear filtered tasks and selected tasks
                        setFilteredTasks([]);
                        setSelectedTasks([]);
                      }
                      
                      // Open the modal
                      setIsReportModalOpen(true);
                    }
                    
                    // Remove the modal
                    document.body.removeChild(reportSelectionModal);
                  });
                });
                
                // Add event listener for close button
                const closeButton = reportSelectionModal.querySelector('.close-modal-btn');
                closeButton?.addEventListener('click', () => {
                  document.body.removeChild(reportSelectionModal);
                });
                
                // Add event listener for create new report button
                const createNewButton = reportSelectionModal.querySelector('.create-new-report-btn');
                createNewButton?.addEventListener('click', () => {
                  document.body.removeChild(reportSelectionModal);
                  // Call the function to open a new report modal
                  setNewReportDate(dateString);
                  setIsNewReportModalOpen(true);
                });
              } else {
                alert(`${dateString}のレポートはありません。`);
              }
            } else if (reportForDate) {
              // Single report for this date - use it directly
              setReportData(reportForDate);
              
              // Update the project and task selection
              if (reportForDate.projectId) {
                setSelectedProject(reportForDate.projectId);
                
                // Update filtered tasks based on the project
                const projectTasks = tasks.filter(task => task.projectId === reportForDate.projectId);
                setFilteredTasks(projectTasks);
                
                // Set selected tasks
                if (reportForDate.taskIds && Array.isArray(reportForDate.taskIds)) {
                  setSelectedTasks(reportForDate.taskIds);
                } else {
                  // If taskIds is not available or not an array, set empty array
                  setSelectedTasks([]);
                }
              } else {
                // If no projectId is available, clear filtered tasks and selected tasks
                setFilteredTasks([]);
                setSelectedTasks([]);
              }
              
              // Open the modal
              setIsReportModalOpen(true);
            } else {
              alert(`${dateString}のレポートはありません。`);
            }
          }
        } catch (err) {
          console.error('Error showing report modal:', err);
          alert('レポートの表示中にエラーが発生しました。');
        }
      }, 50);
    } catch (err) {
      console.error('Error showing report modal:', err);
      alert('レポートの表示中にエラーが発生しました。');
    }
  };

  // Show a modal to select which member's report to view
  const showReportSelectionModal = (dateString: string, memberIds: string[]) => {
    try {
      console.log(`Showing report selection modal for date ${dateString} with members:`, memberIds);
      
      // For this implementation, we'll use a simple confirm dialog
      // In a real app, you would use a proper modal UI component
      const memberOptions = memberIds.map(userId => {
        const memberName = members.find(m => m.id === userId)?.name || userId;
        return `${memberName}`;
      }).join('\n');
      
      const message = `以下のメンバーの日報が利用可能です。どのメンバーの日報を表示しますか？\n\n${memberOptions}`;
      
      // Use a simple prompt to select a member index
      const selectedIndex = prompt(`${message}\n\n表示するメンバーの番号を入力してください (1-${memberIds.length}):`);
      
      if (selectedIndex === null) {
        // User cancelled
        return;
      }
      
      const index = parseInt(selectedIndex, 10) - 1;
      if (isNaN(index) || index < 0 || index >= memberIds.length) {
        alert('無効な選択です。もう一度お試しください。');
        return;
      }
      
      const selectedMemberId = memberIds[index];
      showReportModal(dateString, selectedMemberId);
    } catch (error) {
      console.error('Error showing report selection modal:', error);
      alert('メンバー選択中にエラーが発生しました');
    }
  };
  
  // Function to open the new report modal
  const openNewReportModal = (date: string) => {
    if (!currentUser) {
      console.error('Cannot open report modal: No current user');
      return;
    }
    
    // Format the date to the expected format
    const formattedDate = new Date(date).toISOString().split('T')[0];
    console.log('Opening new report modal for date:', formattedDate);
    
    // Check if the selected date is valid
    if (!formattedDate) {
      alert('有効な日付を選択してください');
      return;
    }
    
    // Set the new report date
    setNewReportDate(formattedDate);
    
    // Reset the new report data
    setNewReportData({
      completed: [],
      inProgress: [],
      issues: [],
      tomorrow: [],
      project: '',
      userId: currentUser.id,
      reportIndex: 0 // Default to 0, will be calculated properly below
    });
    
    // Calculate the correct reportIndex for this new report (if multiple reports exist for the same day)
    if (dailyReports && dailyReports[currentUser.id] && dailyReports[currentUser.id][formattedDate]) {
      const existingReportsForDate = dailyReports[currentUser.id][formattedDate];
      
      if (Array.isArray(existingReportsForDate)) {
        // Find the highest reportIndex among existing reports
        const highestIndex = Math.max(...existingReportsForDate.map(report => 
          report.reportIndex !== undefined ? report.reportIndex : -1
        ));
        
        // Set the new report's index to be one more than the highest
        setNewReportData(prev => ({
          ...prev,
          reportIndex: highestIndex + 1
        }));
        console.log('Setting reportIndex to', highestIndex + 1, 'for new report');
      } else if (existingReportsForDate.reportIndex !== undefined) {
        // If there's a single report with an index, set this one to index + 1
        setNewReportData(prev => ({
          ...prev,
          reportIndex: (existingReportsForDate.reportIndex || 0) + 1
        }));
        console.log('Setting reportIndex to', (existingReportsForDate.reportIndex || 0) + 1, 'for new report');
      } else {
        // If there's a single report without an index, set this one to index 1
        setNewReportData(prev => ({
          ...prev,
          reportIndex: 1
        }));
        console.log('Setting reportIndex to 1 for new report (existing report has no index)');
      }
    } else {
      // No existing reports for this date, set index to 0
      setNewReportData(prev => ({
        ...prev,
        reportIndex: 0
      }));
      console.log('Setting reportIndex to 0 for new report (no existing reports)');
    }
    
    // Reset individual form inputs
    setCompletedTask('');
    setInProgressTask('');
    setIssueItem('');
    setTomorrowPlan('');
    setSelectedProject('');
    setSelectedTasks([]);
    setUserFeedbackText('');
    
    // Open the modal
    setIsNewReportModalOpen(true);
  };

  // Function to generate calendar
  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of month and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start day of week (0 = Sunday, 1 = Monday, etc.)
    const startDayOfWeek = firstDay.getDay();
    
    // Create calendar rows
    const rows = [];
    let day = 1;
    const today = new Date();
    
    // Create weeks
    for (let i = 0; i < 6; i++) {
      // Stop if we've gone beyond the last day
      if (day > lastDay.getDate()) break;
      
      const cells = [];
      
      // Create days in the week
      for (let j = 0; j < 7; j++) {
        if ((i === 0 && j < startDayOfWeek) || day > lastDay.getDate()) {
          // Empty cells before start of month or after end of month
          cells.push(<td key={`empty-${i}-${j}`}></td>);
        } else {
          // Date cells
          const currentDay = day;
          const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
          
          // Check if this date has reports based on view mode
          let hasReport = false;
          let reportOwners: string[] = [];
          let hasAdminFeedback = false;
          
          // Safely check for reports
          if (viewMode === 'single' && selectedMember && dailyReports[selectedMember]) {
            hasReport = Boolean(dailyReports[selectedMember][dateString]);
            hasAdminFeedback = hasReport && (
              Array.isArray(dailyReports[selectedMember][dateString])
                ? dailyReports[selectedMember][dateString].every(report => report.adminReviewed)
                : Boolean(dailyReports[selectedMember][dateString]?.adminReviewed)
            );
          } else {
            // Check all members for reports on this date
            Object.keys(dailyReports).forEach(memberId => {
              if (dailyReports[memberId] && dailyReports[memberId][dateString]) {
                hasReport = true;
                reportOwners.push(memberId);
              }
            });
          }
          
          // Check if current day
          const isCurrentDay = 
            currentDay === today.getDate() && 
            month === today.getMonth() && 
            year === today.getFullYear();
          
          // Check if weekend
          const isWeekend = j === 0 || j === 6;
          
          cells.push(
            <td 
              key={`day-${currentDay}`}
              className={`
                p-2 text-center border border-gray-200 h-20 align-top transition cursor-pointer
                ${isCurrentDay ? 'bg-blue-50' : ''}
                ${selectedDay === dateString ? 'bg-indigo-100' : ''}
                hover:bg-gray-50
              `}
              onClick={(event) => {
                if (selectedCell) {
                  selectedCell.classList.remove('bg-indigo-100');
                }
                const target = event.target as HTMLTableCellElement;
                target.classList.add('bg-indigo-100');
                setSelectedCell(target);
                setSelectedDay(dateString);
                
                try {
                  // If this date has reports, show the report modal
                  if (hasReport) {
                    if (viewMode === 'single' && selectedMember) {
                      showReportModal(dateString, selectedMember);
                    } else if (reportOwners.length === 1) {
                      showReportModal(dateString, reportOwners[0]);
                    } else if (reportOwners.length > 1) {
                      showReportModal(dateString);
                    }
                  } else if (!isAdmin && dateString <= formatDateString(new Date())) {
                    // Only allow regular users (not admins) to create new reports
                    openNewReportModal(dateString);
                  } else if (isAdmin) {
                    // Admins cannot create new reports
                    alert('管理者は閲覧のみ可能です。新規レポートの作成はできません。');
                  } else {
                    alert('将来の日付の日報は作成できません');
                  }
                } catch (error) {
                  console.error('Error handling calendar day click:', error);
                  alert('日報の表示または作成中にエラーが発生しました');
                }
              }}
            >
              <span className={`
                block mb-1 font-medium
                ${isWeekend ? 'text-red-500' : ''}
              `}>
                {currentDay}
              </span>
              
              {/* Report indicator with admin feedback status */}
              {hasReport && (
                <div className="flex flex-col items-center mt-1">
                  {viewMode === 'single' && selectedMember ? (
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full mx-auto"></div>
                      {hasReportForDate(selectedMember, dateString) && (
                        <div className="mt-1 text-xs">
                          {isReportReviewed(selectedMember, dateString) ? (
                            <span className="text-green-600">✓ レビュー済</span>
                          ) : (
                            <span className="text-amber-600">● レビュー待ち</span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center mt-1">
                      {/* Stacked Reports View */}
                      <div className="flex flex-col space-y-1 w-full px-1">
                        {reportOwners.map((owner, idx) => {
                          const member = members.find(m => m.id === owner);
                          const isReviewed = isReportReviewed(owner, dateString);
                          
                          return (
                            <div 
                              key={idx}
                              className="group relative w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                showReportModal(dateString, owner);
                              }}
                            >
                              {/* Report Bar */}
                              <div className={`
                                w-full h-4 rounded-full cursor-pointer transition-all duration-200
                                hover:scale-105 hover:shadow-md
                                ${owner === members[0]?.id ? 'bg-green-500' : 
                                  owner === members[1]?.id ? 'bg-blue-500' : 
                                  owner === members[2]?.id ? 'bg-purple-500' : 
                                  owner === members[3]?.id ? 'bg-yellow-500' : 
                                  'bg-gray-500'}
                              `}>
                                {/* Status Indicator */}
                                <div className={`
                                  absolute -right-1 -top-1 w-2 h-2 rounded-full
                                  ${isReviewed ? 'bg-green-600' : 'bg-amber-500'}
                                  border border-white
                                `}></div>
                              </div>
                              
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-white p-2 rounded-lg shadow-lg text-xs whitespace-nowrap z-50">
                                <div className="font-medium">{member?.name || owner}</div>
                                <div className="text-gray-600">{getReportProject(owner, dateString) || 'プロジェクトなし'}</div>
                                <div className={`${isReviewed ? 'text-green-600' : 'text-amber-600'}`}>
                                  {isReviewed ? '✓ レビュー済' : '● レビュー待ち'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Report Summary */}
                      {reportOwners.length > 0 && (
                        <div className="mt-1 text-xs flex flex-col items-center">
                          <span className={(() => {
                            const reviewedCount = countReviewedReports(reportOwners, dateString);
                            return reviewedCount > 0 ? 
                              (reviewedCount === countTotalReports(reportOwners, dateString) ? "text-green-600" : "text-amber-600") :
                              "text-gray-500";
                          })()}>
                            {(() => {
                              const reviewedCount = countReviewedReports(reportOwners, dateString);
                              const totalReports = countTotalReports(reportOwners, dateString);
                              return reviewedCount > 0 ? 
                                `${reviewedCount}/${totalReports} レビュー済` :
                                `${totalReports}件のレポート`;
                            })()}
                          </span>
                          {reportOwners.some(owner => 
                            dailyReports[owner] && 
                            dailyReports[owner][dateString] && 
                            Array.isArray(dailyReports[owner][dateString]) && 
                            (dailyReports[owner][dateString] as DailyReport[]).length > 1
                          ) && (
                            <div className="flex mt-1 space-x-1">
                              {reportOwners.map((owner, idx) => {
                                if (!dailyReports[owner] || !dailyReports[owner][dateString]) return null;
                                
                                const reports = Array.isArray(dailyReports[owner][dateString]) 
                                  ? dailyReports[owner][dateString] as DailyReport[]
                                  : [dailyReports[owner][dateString] as DailyReport];
                                
                                if (reports.length <= 1) return null;
                                
                                const reviewedCount = reports.filter(r => r.adminReviewed).length;
                                const color = owner === members[0]?.id ? 'bg-green-500' : 
                                  owner === members[1]?.id ? 'bg-blue-500' : 
                                  owner === members[2]?.id ? 'bg-purple-500' : 
                                  owner === members[3]?.id ? 'bg-yellow-500' : 
                                  'bg-gray-500';
                                
                                return (
                                  <div key={idx} className="relative inline-flex items-center">
                                    <span className={`inline-block w-2 h-2 ${color} rounded-full`}></span>
                                    <span className="ml-1 text-xs">{reviewedCount}/{reports.length}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <button 
                            className="text-blue-600 hover:text-blue-800 mt-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              showReportHistory(dateString);
                            }}
                          >
                            履歴
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </td>
          );
          
          day++;
        }
      }
      
      rows.push(<tr key={`week-${i}`}>{cells}</tr>);
    }
    
    return rows;
  };

  // Function to handle report update
  const handleReportUpdate = async () => {
    try {
      // Check if required fields are filled
      if (!selectedProject) {
        alert('プロジェクトを選択してください');
        return;
      }
      
      if (!currentUser) {
        console.error('Current user is not set');
        alert('ユーザー情報が見つかりません');
        return;
      }
      
      // Create report object
      const reportObj = {
        completed: filteredTasks.filter(t => t.status === 'completed').map(t => t.title),
        inProgress: filteredTasks.filter(t => t.status === 'in-progress').map(t => t.title),
        issues: [],
        tomorrow: [],
        project: projects.find(p => p.id === selectedProject)?.name || '',
        userId: currentUser.id,
        status: 'completed' as 'completed' | 'pending' | 'overdue',
        taskIds: filteredTasks.map(t => t.id),
        userFeedback: userFeedbackText || null,
        adminFeedback: null,
        adminReviewed: false
      };
      
      console.log('Creating report with userId:', currentUser.id);
      console.log('Report data:', reportObj);
      
      // Update the report in state
      const updatedReports = { ...dailyReports };
      
      // Make sure selectedMember and selectedDay are defined before using them as indexes
      if (!selectedMember || !selectedDay) {
        console.error('Selected member or day is missing');
        alert('レポートの更新に必要な情報が不足しています');
        return;
      }
      
      // Check if selected member exists in reports
      if (!updatedReports[selectedMember]) {
        updatedReports[selectedMember] = {};
      }

      // Update the report with new data
      if (reportData) {
        updatedReports[selectedMember][selectedDay] = {
          ...reportData,
          userFeedback: feedbackText || null,
          status: reportData.status
        };

        setDailyReports(updatedReports);

        // Save to database
        const saved = await saveReportsToDatabase(updatedReports);

        if (saved) {
          // Refresh reports to get latest data
          await refreshReports();
          setIsReportModalOpen(false);
        } else {
          alert('日報の更新中にエラーが発生しました');
        }
      }
    } catch (error) {
      console.error('Error updating report:', error);
      alert('日報の更新中にエラーが発生しました');
    }
  };

  // Function to save reports to database
  const saveReportsToDatabase = async (reports: any) => {
    if (!currentUser?.id) {
      console.error('Cannot save reports: No current user');
      return false;
    }
    
    try {
      console.log('Saving reports to database:', reports);
      
      if (!reports || !Object.keys(reports).length) {
        console.warn('No reports to save');
        return false;
      }
      
      // Check if there's any data to save
      let hasReportData = false;
      let saveSuccessful = true;
      
      // Try to save each report
      for (const userId in reports) {
        const userReports = reports[userId];
        if (!userReports) continue;
        
        for (const date in userReports) {
          const report = userReports[date];
          if (!report) continue;
          
          hasReportData = true;
          
          try {
            // Create the API request body
            const requestBody = {
              userId,
              date,
              report
            };
            
            console.log('Saving report:', requestBody);
            
            // Make API call to save report
            const response = await fetch('/api/reports', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });
            
            if (!response.ok) {
              console.error('Failed to save report:', response.statusText);
              saveSuccessful = false;
            } else {
              const result = await response.json();
              console.log('Report saved successfully:', result);
            }
            
          } catch (error) {
            console.error('Error saving report:', error);
            saveSuccessful = false;
          }
        }
      }
      
      if (!hasReportData) {
        console.warn('No report data found to save');
        return false;
      }
      
      // If everything was saved successfully, refresh reports to get the latest data
      if (saveSuccessful) {
        // Clear the reports cache to ensure fresh data on next fetch
        sessionStorage.removeItem('reportsCache');
        
        // Schedule a refresh after a short delay to allow the server to process the changes
        setTimeout(() => {
          refreshReports();
        }, 500);
      }
      
      return saveSuccessful;
    } catch (error) {
      console.error('Error in saveReportsToDatabase:', error);
      return false;
    }
  };

  // Function to handle new report submission
  const handleNewReportSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    try {
      if (!newReportDate) {
        alert('日付を選択してください');
        return;
      }
      
      if (!selectedProject) {
        alert('プロジェクトを選択してください');
        return;
      }
      
      if (!currentUser) {
        console.error('Cannot create report: No current user');
        alert('ユーザー情報が見つかりません');
        return;
      }
      
      const userId = currentUser.id;
      console.log('Creating report for user:', userId, 'on date:', newReportDate);
      
      // Find the selected project name from the projects array
      const selectedProjectName = projects.find(p => p.id === selectedProject)?.name || '';
      
      // Create the base report object with all required fields
      const report: {
        userId: string;
        date: string;
        reportIndex?: number;
        report: Partial<DailyReport>;
      } = {
        userId: userId,
        date: newReportDate,
        reportIndex: newReportData.reportIndex,
        report: {
          ...newReportData,
          status: 'completed' as const,
          userId: userId,
          projectId: selectedProject,
          project: selectedProjectName, // Use the project name from the projects array
          taskIds: selectedTasks || [],
          adminFeedback: null,
          adminReviewed: false,
          userFeedback: isAdmin ? (userFeedbackText || null) : null,
          reportIndex: newReportData.reportIndex
        }
      };

      console.log('New report data:', report);
      
      // First close the modal to prevent DOM issues
      setIsNewReportModalOpen(false);
      
      // Make API call to save the report directly
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });
      
      if (!response.ok) {
        console.error('Failed to save report:', response.statusText);
        alert('日報の保存に失敗しました');
        return;
      }
      
      const result = await response.json();
      console.log('Report saved successfully:', result);
      
      // Clear form inputs
      setNewReportData({
        completed: [],
        inProgress: [],
        issues: [],
        tomorrow: [],
        project: '',
        userId: userId
      });
      
      // Reset individual form inputs
      setCompletedTask('');
      setInProgressTask('');
      setIssueItem('');
      setTomorrowPlan('');
      setSelectedTasks([]);
      setUserFeedbackText('');
      
      // Show success message
      alert('日報が正常に保存されました');
      
      // Ensure state is updated by clearing cache and forcing a complete refresh
      sessionStorage.removeItem('reportsCache');
      
      // Refresh reports to get latest data
      await refreshReports();
      
    } catch (error) {
      console.error('Error creating report:', error);
      alert('日報の保存中にエラーが発生しました');
    }
  };

  // Function to delete a report
  const deleteReport = async (date: string) => {
    if (!currentUser || !reportData) {
      console.error('Cannot delete report: No current user or report data');
      return;
    }
    
    const confirmation = confirm('この日報を削除してもよろしいですか？');
    
    if (confirmation) {
      try {
        // Get the reportIndex and userId for the specific report to delete
        const userId = currentUser.id;
        const reportIndex = reportData.reportIndex;
        
        console.log('Deleting report for user:', userId, 'on date:', date, 'with reportIndex:', reportIndex);
        
        // Make the API call to delete the specific report
        const url = new URL('/api/reports', window.location.origin);
        
        // Add parameters to uniquely identify the report
        url.searchParams.append('userId', userId);
        url.searchParams.append('date', date);
        
        // Only append reportIndex if it exists
        if (reportIndex !== undefined) {
          url.searchParams.append('reportIndex', reportIndex.toString());
        }
        
        const response = await fetch(url.toString(), {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error deleting report:', errorData);
          alert('日報の削除中にエラーが発生しました');
          return;
        }
        
        const result = await response.json();
        console.log('Report deletion result:', result);
        
        // Update local state by removing the deleted report
        const updatedReports = { ...dailyReports };
        
        if (updatedReports[currentUser.id] && updatedReports[currentUser.id][date]) {
          const currentReports = updatedReports[currentUser.id][date];
          
          // Handle multiple reports for a day
          if (Array.isArray(currentReports)) {
            // Find the specific report that matches the currently viewed report
            const reportIdx = currentReports.findIndex(report => 
              report.reportIndex === reportData.reportIndex
            );
            
            if (reportIdx !== -1) {
              // Remove only this specific report from the array
              const newReportsArray = [
                ...currentReports.slice(0, reportIdx),
                ...currentReports.slice(reportIdx + 1)
              ];
              
              if (newReportsArray.length > 0) {
                // If there are still other reports, keep the array
                updatedReports[currentUser.id][date] = newReportsArray;
              } else {
                // If this was the last report for this date, delete the entire date entry
                delete updatedReports[currentUser.id][date];
              }
            }
          } else {
            // For a single report, delete the entire date entry
            delete updatedReports[currentUser.id][date];
          }
          
          setDailyReports(updatedReports);
          alert('日報が削除されました');
          setIsReportModalOpen(false);
          
          // Refresh reports to get latest data
          await refreshReports();
        }
      } catch (error) {
        console.error('Error deleting report:', error);
        alert('日報の削除中にエラーが発生しました');
      }
    }
  };

  // Function to enter edit mode
  const enterEditMode = () => {
    // First check if currentUser exists
    if (!currentUser) {
      console.error('Cannot edit report: No current user');
      alert('ユーザー情報が見つかりません');
      return;
    }
    
    // Only allow editing your own reports
    if (reportData?.userId !== currentUser.id) {
      alert('他のユーザーの日報は編集できません');
      return;
    }
    
    // Enter edit mode if the report exists
    if (reportData) {
      setSelectedProject(reportData.projectId || '');
      setSelectedTasks(reportData.taskIds || []);
      
      setNewReportData({
        completed: reportData.completed,
        inProgress: reportData.inProgress,
        issues: reportData.issues,
        tomorrow: reportData.tomorrow,
        project: reportData.project,
        userId: currentUser.id
      });
      setIsEditMode(true);
    }
  };
  
  // Function to save edited report
  const saveEditedReport = () => {
    if (!selectedDay || !currentUser || !reportData) {
      alert('日付またはユーザー情報がありません');
      return;
    }
    
    try {
      // Get the project name from the selected project ID
      const selectedProjectName = projects.find(p => p.id === selectedProject)?.name || '';
      
      // Update dailyReports state
      const updatedReports = { ...dailyReports };
      
      // Check if current user has reports
      if (!updatedReports[currentUser.id]) {
        updatedReports[currentUser.id] = {};
      }
      
      // Check if edited report for this day exists
      if (updatedReports[currentUser.id][selectedDay]) {
        const existingReports = updatedReports[currentUser.id][selectedDay];
        
        // Check if we have multiple reports for this day (array)
        if (Array.isArray(existingReports)) {
          // Find the specific report we're editing
          const reportIndex = existingReports.findIndex(report => 
            report.reportIndex === reportData.reportIndex
          );
          
          if (reportIndex !== -1) {
            // Update only this specific report in the array
            const updatedReport = {
              ...existingReports[reportIndex],
              completed: newReportData.completed,
              inProgress: newReportData.inProgress,
              issues: newReportData.issues,
              tomorrow: newReportData.tomorrow,
              project: selectedProjectName,
              projectId: selectedProject,
              taskIds: selectedTasks || []
            };
            
            // Create a new array with the updated report
            updatedReports[currentUser.id][selectedDay] = [
              ...existingReports.slice(0, reportIndex),
              updatedReport,
              ...existingReports.slice(reportIndex + 1)
            ];
          }
        } else {
          // Single report case
          updatedReports[currentUser.id][selectedDay] = {
            ...existingReports,
            completed: newReportData.completed,
            inProgress: newReportData.inProgress,
            issues: newReportData.issues,
            tomorrow: newReportData.tomorrow,
            project: selectedProjectName,
            projectId: selectedProject,
            taskIds: selectedTasks || []
          };
        }
      }
      
      setDailyReports(updatedReports);
      
      // Save to the database
      saveReportsToDatabase(updatedReports);
      
      // Update the current report data
      setReportData({
        ...reportData,
        ...newReportData,
        project: selectedProjectName,
        projectId: selectedProject,
        taskIds: selectedTasks || []
      });
      
      setIsEditMode(false);
      alert('日報が更新されました');
    } catch (error) {
      console.error('Error saving edited report:', error);
      alert('日報の更新中にエラーが発生しました');
    }
  };

  // Function to export reports as CSV
  const exportReportsAsCSV = () => {
    if (!currentUser) {
      console.error('Cannot export reports: No current user');
      return;
    }
    
      // Get the reports for the current view
      let reportsToExport: { date: string; member: string; project: string; status: string }[] = [];
      
      if (viewMode === 'single') {
        // Export only the selected member's reports
        if (dailyReports[selectedMember]) {
          Object.entries(dailyReports[selectedMember]).forEach(([date, report]) => {
            reportsToExport.push({
              date,
              member: members.find(m => m.id === selectedMember)?.name || selectedMember,
              project: getReportProjectFromObject(report),
              status: getReportStatusFromObject(report) === 'completed' ? '完了' : 
                     getReportStatusFromObject(report) === 'pending' ? '保留中' : '期限切れ'
            });
          });
        }
      } else {
        // Export all members' reports
        Object.entries(dailyReports).forEach(([memberId, memberReports]) => {
          Object.entries(memberReports).forEach(([date, report]) => {
            reportsToExport.push({
              date,
              member: members.find(m => m.id === memberId)?.name || memberId,
              project: getReportProjectFromObject(report),
              status: getReportStatusFromObject(report) === 'completed' ? '完了' : 
                     getReportStatusFromObject(report) === 'pending' ? '保留中' : '期限切れ'
            });
          });
        });
      }
      
      // Sort by date
      reportsToExport.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Create CSV content
      const headers = ['日付', 'メンバー', 'プロジェクト', 'ステータス'];
      const csvContent = [
        headers.join(','),
        ...reportsToExport.map(report => 
          [report.date, report.member, report.project, report.status].join(',')
        )
      ].join('\n');
      
      // Create a download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `reports_${formatDateString(new Date())}.csv`);
      link.style.visibility = 'hidden';
      
      try {
        document.body.appendChild(link);
        link.click();
        
        // Safely remove the link if it exists in the document
        if (link.parentNode === document.body) {
          document.body.removeChild(link);
        }
      } catch (error) {
        console.error('Error exporting CSV:', error);
      }
      
      alert('レポートがエクスポートされました');
  };

  // Function to save report feedback
  const saveReportFeedback = async () => {
    if (!currentUser || !selectedDay || !selectedMember) {
      console.error('Missing data for saving feedback', {
        currentUser: currentUser ? 'exists' : 'missing',
        selectedDay: selectedDay ? 'exists' : 'missing',
        selectedMember: selectedMember ? 'exists' : 'missing'
      });
      alert('フィードバック保存に必要な情報が不足しています');
      return;
    }
    
      try {
        const updatedReports = { ...dailyReports };
      
      // Check if reports object structure exists
      if (!updatedReports[selectedMember]) {
        updatedReports[selectedMember] = {};
      }
      
      if (updatedReports[selectedMember][selectedDay]) {
          updatedReports[selectedMember][selectedDay] = {
            ...updatedReports[selectedMember][selectedDay],
            userFeedback: feedbackText
          };
          setDailyReports(updatedReports);
          
          // Save to database
          const saved = await saveReportsToDatabase(updatedReports);
          
          if (saved) {
            alert('フィードバックが保存されました');
          } else {
            alert('フィードバックの保存に失敗しました');
          }
        }
      } catch (error) {
        console.error('Error saving feedback:', error);
        alert('フィードバックの保存中にエラーが発生しました');
    }
  };

  // Function to get month and year display
  const getMonthYearDisplay = () => {
    const year = currentDate.getFullYear();
    const monthNames = [
      '1月', '2月', '3月', '4月', '5月', '6月',
      '7月', '8月', '9月', '10月', '11月', '12月'
    ];
    const month = monthNames[currentDate.getMonth()];
    return `${year}年${month}`;
  };

  // Function to handle admin review submission
  const submitAdminReview = () => {
    if (!selectedDay || !selectedMember) {
      console.error('Missing data for admin review', {
        selectedDay: selectedDay ? 'exists' : 'missing',
        selectedMember: selectedMember ? 'exists' : 'missing'
      });
      alert('レビュー送信に必要な情報が不足しています');
      return;
    }

    try {
      console.log(`Submitting admin review for ${selectedMember} on ${selectedDay}`);
      console.log("Admin feedback text:", adminFeedbackText);
      
      // Use the saveAdminFeedback function which correctly handles multiple reports
      saveAdminFeedback(selectedMember, selectedDay, adminFeedbackText)
        .then(success => {
          if (success) {
            alert('レビューが送信されました');
            
            // Create a notification for the user
            const formattedDate = new Date(selectedDay).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            
            fetch('/api/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: selectedMember,
                type: 'report_feedback',
                title: 'レポートにフィードバックが届きました',
                message: `${formattedDate}のレポートに管理者からフィードバックがありました。`,
                linkUrl: `/reports?date=${selectedDay}`,
                data: JSON.stringify({
                  reportDate: selectedDay,
                }),
              }),
            }).then(response => {
              if (!response.ok) {
                console.error('Failed to create notification');
              } else {
                console.log('Notification created successfully');
              }
            }).catch(error => {
              console.error('Error creating notification:', error);
            });
            
            refreshReports();  // Refresh to get latest data
          } else {
            alert('レビューの送信に失敗しました');
          }
        })
        .catch(error => {
          console.error('Error saving admin review:', error);
          alert('レビューの送信中にエラーが発生しました');
        });
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('レビューの送信中にエラーが発生しました');
    }
  };

  // Admin feedback section
  const renderAdminFeedbackSection = () => {
    if (isAdmin) {
      return (
        <div className="mt-4 border-t pt-4">
          <h3 className="text-lg font-semibold mb-2">管理者フィードバック</h3>
          <div className="mb-4">
            <textarea
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="管理者からのフィードバックを入力してください"
              value={adminFeedbackText}
              onChange={(e) => setAdminFeedbackText(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={submitAdminReview}
            >
              フィードバックを送信
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  // Add a function to navigate to the daily log page
  const navigateToDailyLog = () => {
    // Use window.location to navigate to the daily log page
    window.location.href = '/daily-log';
  };

  // Function to save admin feedback to the API
  const saveAdminFeedback = async (userId: string, dateString: string, feedback: string) => {
    try {
      console.log(`Saving admin feedback for user ${userId} on ${dateString}`);
      
      // Determine if we need to include reportIndex
      let reportIndex;
      if (reportData && dailyReports[userId] && dailyReports[userId][dateString]) {
        const userReports = dailyReports[userId][dateString];
        // If it's an array of reports, find the matching report by comparing with reportData
        if (Array.isArray(userReports)) {
          // Try to find the index of the current report by matching properties
          reportIndex = userReports.findIndex(report => 
            // Match based on project and completed tasks since id may not be accessible
            report.project === reportData.project && 
            JSON.stringify(report.completed) === JSON.stringify(reportData.completed)
          );
          if (reportIndex === -1) reportIndex = undefined;
        }
      }
      
      // Call the API to save admin feedback
      const response = await fetch(`/api/reports/${userId}/${dateString}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminFeedback: feedback,
          adminReviewed: true,
          reportIndex: reportIndex
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save admin feedback');
      }

      // Update local state
      const updatedReports = { ...dailyReports };
      if (updatedReports[userId] && updatedReports[userId][dateString]) {
        const reportToUpdate = updatedReports[userId][dateString];
        
        // Handle both single report and array of reports
        if (Array.isArray(reportToUpdate) && reportIndex !== undefined) {
          // Update the specific report in the array
          reportToUpdate[reportIndex] = {
            ...reportToUpdate[reportIndex],
            adminFeedback: feedback,
            adminReviewed: true
          };
        } else {
          // Update the single report
          updatedReports[userId][dateString] = {
            ...reportToUpdate,
            adminFeedback: feedback,
            adminReviewed: true
          };
        }
        
        setDailyReports(updatedReports);
        
        // If this is the currently displayed report, update reportData
        if (reportData && reportData.userId === userId) {
          console.log('Updating reportData with admin feedback:', feedback);
          setReportData({
            ...reportData,
            adminFeedback: feedback,
            adminReviewed: true
          });
        }
        
        // Refresh reports to get latest data
        await refreshReports();
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving admin feedback:', error);
      return false;
    }
  };

  // Function to handle calendar cell click
  const handleCalendarCellClick = (date: string) => {
    try {
      // If this date has reports, show the report modal
      if (viewMode === 'single' && selectedMember && dailyReports[selectedMember]) {
        const hasReport = Boolean(dailyReports[selectedMember][date]);
        
        if (hasReport) {
          showReportModal(date, selectedMember);
        } else {
          // Regular users can create new reports
          if (!isAdmin && date <= formatDateString(new Date())) {
            openNewReportModal(date);
          }
        }
      } else {
        const reportOwners: string[] = [];
        
        Object.keys(dailyReports).forEach(memberId => {
          if (dailyReports[memberId] && dailyReports[memberId][date]) {
            reportOwners.push(memberId);
          }
        });
        
        if (reportOwners.length === 1) {
          showReportModal(date, reportOwners[0]);
        } else if (reportOwners.length > 1) {
          // Show report selection modal when multiple members have reports
          showReportSelectionModal(date, reportOwners);
        } else {
          // Only allow regular users (not admins) to create new reports
          if (!isAdmin && date <= formatDateString(new Date())) {
            openNewReportModal(date);
          } else if (isAdmin) {
            alert('管理者は閲覧のみ可能です。新規レポートの作成はできません。');
          } else {
      alert('将来の日付の日報は作成できません');
          }
        }
      }
    } catch (error) {
      console.error('Error handling calendar day click:', error);
      alert('日報の表示または作成中にエラーが発生しました');
    }
  };

  // Function to check if this date has reports for a user
  const hasReportForDate = (userId: string, dateString: string): boolean => {
    try {
      return Boolean(dailyReports[userId] && dailyReports[userId][dateString]);
    } catch (error) {
      console.error('Error checking reports:', error);
      return false;
    }
  };

  // Function to get report status for calendar cells
  const getReportStatus = (userId: string, dateString: string): string | null => {
    try {
      if (dailyReports[userId] && dailyReports[userId][dateString]) {
        const reportData = dailyReports[userId][dateString];
        
        // Handle both single report and array of reports
        if (Array.isArray(reportData)) {
          // For multiple reports, use the status of the most recent one
          return reportData.length > 0 ? reportData[reportData.length - 1].status : null;
      } else {
          // Single report
          return reportData.status;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting report status:', error);
      return null;
    }
  };

  // Function to check if a report has been reviewed by admin
  const isReportReviewed = (userId: string, dateString: string): boolean => {
    try {
      if (dailyReports[userId] && dailyReports[userId][dateString]) {
        const reportData = dailyReports[userId][dateString];
        
        // Handle both single report and array of reports
        if (Array.isArray(reportData)) {
          // Only return true if ALL reports have been reviewed
          return reportData.every((report: DailyReport) => report.adminReviewed);
        } else {
          // Single report
          return (reportData as DailyReport).adminReviewed;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking report review status:', error);
      return false;
    }
  };

  // Function to get a report's project name
  const getReportProject = (userId: string, dateString: string): string => {
    try {
      if (dailyReports[userId] && dailyReports[userId][dateString]) {
        const reportData = dailyReports[userId][dateString];
        
        // Handle both single report and array of reports
        if (Array.isArray(reportData)) {
          // For multiple reports, use the project of the most recent one
          return reportData.length > 0 ? reportData[reportData.length - 1].project : '';
        } else {
          // Single report
          return reportData.project;
        }
      }
      return '';
    } catch (error) {
      console.error('Error getting report project:', error);
      return '';
    }
  };

  // Function to count reviewed reports
  const countReviewedReports = (reportOwners: string[], dateString: string): number => {
    try {
      let reviewedCount = 0;
      
      reportOwners.forEach(owner => {
        if (dailyReports[owner] && dailyReports[owner][dateString]) {
          const reportData = dailyReports[owner][dateString];
          
          // Handle both single report and array of reports
          if (Array.isArray(reportData)) {
            // Count each report that has been reviewed
            (reportData as DailyReport[]).forEach(report => {
              if (report.adminReviewed) {
                reviewedCount++;
              }
            });
          } else if ((reportData as DailyReport).adminReviewed) {
            // Single report that has been reviewed
            reviewedCount++;
          }
        }
      });
      
      return reviewedCount;
    } catch (error) {
      console.error('Error counting reviewed reports:', error);
      return 0;
    }
  };

  // Function to get user feedback
  const getUserFeedback = (userId: string, dateString: string): string | null => {
    try {
      if (dailyReports[userId] && dailyReports[userId][dateString]) {
        const reportData = dailyReports[userId][dateString];
        
        // Handle both single report and array of reports
        if (Array.isArray(reportData)) {
          // For multiple reports, use the feedback of the most recent one
          return reportData.length > 0 ? reportData[reportData.length - 1].userFeedback : null;
        } else {
          // Single report
          return reportData.userFeedback;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting user feedback:', error);
      return null;
    }
  };

  // Render each day in the calendar
  const renderCalendarDay = (date: Date, isCurrentMonth: boolean) => {
    // Format the date as a string (YYYY-MM-DD)
    const dateString = formatDateString(date);
    const isToday = new Date().toDateString() === date.toDateString();
    
    // Check if this user has a report for this date
    const hasReport = currentUser && dailyReports && 
      dailyReports[currentUser.id] && 
      dailyReports[currentUser.id][dateString];
    
    // For admins, check if any user has a report for this date
    const anyUserHasReport = isAdmin && dailyReports && 
      Object.keys(dailyReports).some(userId => 
        dailyReports[userId] && dailyReports[userId][dateString]
      );
    
    // Count reports for this day
    let reportCount = 0;
    let reportList: Array<{project: string, color: string}> = [];
    
    if (currentUser && hasReport) {
      const report = dailyReports[currentUser.id][dateString];
      if (Array.isArray(report)) {
        reportCount = report.length;
        // Get project names for first 3 reports
        reportList = report.slice(0, 3).map((r, index) => ({
          project: r.project,
          color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500'][index % 4]
        }));
      } else {
        reportCount = 1;
        reportList = [{
          project: report.project,
          color: 'bg-blue-500'
        }];
      }
    }
    
    // Determine the base status class
    let statusClass = '';
    if (hasReport && currentUser) {
      const status = getReportStatusFromObject(dailyReports[currentUser.id][dateString]);
      if (status === 'completed') statusClass = 'bg-green-100';
      else if (status === 'pending') statusClass = 'bg-yellow-100';
      else if (status === 'overdue') statusClass = 'bg-red-100';
    } else if (anyUserHasReport) {
      statusClass = 'bg-blue-100'; // Specific color for admin viewing other users' reports
    }
    
    return (
      <td 
        key={dateString}
        className={`border p-1 h-20 w-24 overflow-auto transition cursor-pointer duration-500 ease hover:bg-gray-100 ${
          isCurrentMonth ? '' : 'text-gray-400 bg-gray-50'
        } ${isToday ? 'bg-indigo-100' : ''} ${statusClass}`}
        onClick={() => handleCalendarCellClick(dateString)}
      >
        <div className="flex flex-col h-full">
          {/* Date number and indicator */}
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">{date.getDate()}</span>
            {(hasReport || anyUserHasReport) && (
              <span className="text-xs bg-indigo-100 rounded-full h-5 w-5 flex items-center justify-center">
                {reportCount > 1 ? reportCount : <CheckCircleIcon className="h-3 w-3 text-indigo-600" />}
              </span>
            )}
          </div>
          
          {/* Multiple report bars */}
          {hasReport && currentUser && reportList.length > 0 && (
            <div className="flex flex-col space-y-1 mt-1">
              {reportList.map((report, idx) => (
                <div key={idx} className="group relative">
                  <div className={`h-4 w-full rounded-sm ${report.color} opacity-80 hover:opacity-100`}>
                    {idx === 0 && reportList.length === 1 && (
                      <div className="text-xs text-white truncate px-1 leading-4">{report.project}</div>
                    )}
                  </div>
                  <div className="absolute bottom-full left-0 hidden group-hover:block bg-white p-1 rounded shadow-md text-xs z-10 whitespace-nowrap">
                    {report.project}
                  </div>
                </div>
              ))}
              {reportCount > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  +{reportCount - 3} more
            </div>
          )}
            </div>
          )}
          
          {/* Team report indicator */}
          {!hasReport && anyUserHasReport && isAdmin && (
            <div className="text-xs mt-1 text-blue-500">
              ユーザー報告あり
            </div>
          )}
        </div>
      </td>
    );
  };

  // Helper function to calculate task completion data
  const calculateTaskCompletionData = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: Task) => t.status === 'completed').length;
    const inProgressTasks = tasks.filter((t: Task) => t.status === 'in_progress').length;
    const notStartedTasks = tasks.filter((t: Task) => 
      t.status === 'not_started' || t.status === 'pending'
    ).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Update global variable
    Object.assign(taskCompletionData, {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      notStarted: notStartedTasks,
      completionRate: completionRate
    });
  };

  // Helper function to calculate monthly task trends
  const calculateMonthlyTaskTrends = () => {
    // Get the current date
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Create a map of months (0-11) to completed task counts
    const monthlyCompletions: { [month: number]: number } = {};
    
    // Initialize all months with 0
    for (let i = 0; i < 12; i++) {
      monthlyCompletions[i] = 0;
    }
    
    // Count completed tasks by month
    tasks.forEach((task: Task) => {
      if (task.status === 'completed') {
        // Get completion date (or created date if no completion date)
        const taskDate = new Date(task.completedAt || task.createdAt);
        
        // Only count tasks from the current year
        if (taskDate.getFullYear() === currentYear) {
          const month = taskDate.getMonth();
          monthlyCompletions[month] += 1;
        }
      }
    });
    
    // Map of month numbers to month names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Get the last 6 months
    const currentMonth = currentDate.getMonth();
    const lastSixMonths = [];
    
    for (let i = 5; i >= 0; i--) {
      // Calculate month index (wrapping around to previous year if needed)
      const monthIndex = (currentMonth - i + 12) % 12;
      lastSixMonths.push({
        month: monthNames[monthIndex],
        completed: monthlyCompletions[monthIndex]
      });
    }
    
    // Update the global variable with the last 6 months data
    for (let i = 0; i < 6; i++) {
      monthlyTaskTrends[i] = lastSixMonths[i];
    }
  };
  
  // Helper function to calculate team performance data
  const calculateTeamPerformance = () => {
    // Group projects by team
    const teamProjects: { [teamId: string]: Project[] } = {};
    
    // Group team members
    const teamMembers: { [teamId: string]: number } = {};
    
    // Count completed tasks per team
    const teamCompletedTasks: { [teamId: string]: number } = {};
    
    // Initialize with empty arrays/counts
    projects.forEach(project => {
      if (project.teamId) {
        if (!teamProjects[project.teamId]) {
          teamProjects[project.teamId] = [];
          teamCompletedTasks[project.teamId] = 0;
          teamMembers[project.teamId] = 0;
        }
        
        teamProjects[project.teamId].push(project);
        
        // Count team members
        if (project.members) {
          // Use Set to count unique members
          const uniqueMembers = new Set(project.members.map(m => m.id));
          teamMembers[project.teamId] += uniqueMembers.size;
        }
      }
    });
    
    // Count completed tasks per team
    tasks.forEach(task => {
      if (task.status === 'completed') {
        const project = projects.find(p => p.id === task.projectId);
        if (project && project.teamId) {
          teamCompletedTasks[project.teamId] = (teamCompletedTasks[project.teamId] || 0) + 1;
        }
      }
    });
    
    // Map team IDs to team names
    const teamNames: { [teamId: string]: string } = {};
    projects.forEach(project => {
      if (project.teamId && project.team) {
        teamNames[project.teamId] = project.team.name;
      }
    });
    
    // Create team performance data
    const teamPerformance = Object.keys(teamProjects).map(teamId => {
      return {
        name: teamNames[teamId] || `Team ${teamId}`,
        tasksCompleted: teamCompletedTasks[teamId] || 0,
        membersCount: teamMembers[teamId] || 0
      };
    });
    
    // Sort by tasks completed (descending)
    teamPerformance.sort((a, b) => b.tasksCompleted - a.tasksCompleted);
    
    // Update the global variable with top 3 teams
    for (let i = 0; i < Math.min(teamPerformance.length, 3); i++) {
      if (i < teamProductivityData.length) {
        teamProductivityData[i] = teamPerformance[i];
      }
    }
    
    // If we have fewer than 3 teams, fill with default data
    for (let i = teamPerformance.length; i < 3; i++) {
      if (i < teamProductivityData.length) {
        teamProductivityData[i] = { 
          name: ['開発チーム', 'デザインチーム', 'マーケティングチーム'][i], 
          tasksCompleted: 0, 
          membersCount: 0 
        };
      }
    }
  };

  // Add a function to update dashboard data from actual data
  const updateDashboardData = () => {
    try {
      console.log('Updating dashboard data...');
      
      // Only update project data if we have projects and they've changed
      if (projects.length > 0) {
        // Use memoization to avoid recalculating if projects haven't changed
        const projectsKey = projects.map(p => `${p.id}-${p.status}`).join('|');
        const cachedData = sessionStorage.getItem('projectStatusData');
        
        // Check if we have a valid cache
        if (cachedData) {
          const { key, data } = JSON.parse(cachedData);
          if (key === projectsKey) {
            // Use cached data
            Object.assign(projectStatusData, data);
            console.log('Using cached project status data');
            // Skip further processing for projects
          } else {
            // Calculate new data
            calculateProjectStatusData();
            // Cache the new data
            sessionStorage.setItem('projectStatusData', JSON.stringify({
              key: projectsKey,
              data: projectStatusData
            }));
          }
        } else {
          // Calculate new data
          calculateProjectStatusData();
          // Cache the new data
          sessionStorage.setItem('projectStatusData', JSON.stringify({
            key: projectsKey,
            data: projectStatusData
          }));
        }
      }
      
      // Only update task data if we have tasks and they've changed
      if (tasks.length > 0) {
        // Use memoization to avoid recalculating if tasks haven't changed
        const tasksKey = tasks.map(t => `${t.id}-${t.status}`).join('|');
        const cachedData = sessionStorage.getItem('taskCompletionData');
        
        // Check if we have a valid cache
        if (cachedData) {
          const { key, data } = JSON.parse(cachedData);
          if (key === tasksKey) {
            // Use cached data
            Object.assign(taskCompletionData, data);
            console.log('Using cached task completion data');
            // Skip further processing for tasks
          } else {
            // Calculate new data
            calculateTaskCompletionData();
            // Cache the new data
            sessionStorage.setItem('taskCompletionData', JSON.stringify({
              key: tasksKey,
              data: taskCompletionData
            }));
          }
        } else {
          // Calculate new data
          calculateTaskCompletionData();
          // Cache the new data
          sessionStorage.setItem('taskCompletionData', JSON.stringify({
            key: tasksKey,
            data: taskCompletionData
          }));
        }
        
        // Calculate monthly task trends
        calculateMonthlyTaskTrends();
      }
      
      // Calculate team performance data
      calculateTeamPerformance();
      
      console.log('Dashboard data updated successfully');
    } catch (error) {
      console.error('Error updating dashboard data:', error);
      // Continue with default data
    }
  };
  
  // Helper function to calculate project status data
  const calculateProjectStatusData = () => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p: Project) => 
      p.status === 'active' || p.status === 'in_progress'
    ).length;
    const completedProjects = projects.filter((p: Project) => 
      p.status === 'completed'
    ).length;
    const onHoldProjects = projects.filter((p: Project) => 
      p.status === 'on_hold'
    ).length;
    const overdueProjects = projects.filter((p: Project) => 
      p.status === 'overdue'
    ).length;
    
    // Update global variable
    Object.assign(projectStatusData, {
      total: totalProjects,
      active: activeProjects,
      completed: completedProjects,
      onHold: onHoldProjects,
      overdue: overdueProjects
    });
  };

  // Show report history modal
  const showReportHistory = (dateString: string) => {
    try {
      // Get all reports for this date
      const reportOwners = Object.keys(dailyReports).filter(userId => 
        dailyReports[userId] && dailyReports[userId][dateString]
      );
      
      if (reportOwners.length === 0) {
        alert('この日付のレポート履歴はありません。');
        return;
      }
      
      // Create history modal
      const historyModal = document.createElement('div');
      historyModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      historyModal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">レポート履歴 - ${dateString}</h3>
            <button 
              class="text-gray-500 hover:text-gray-700"
              id="close-history"
            >
              ✕
            </button>
          </div>
          <div class="space-y-4">
            ${reportOwners.map(owner => {
              const report = dailyReports[owner][dateString];
              const member = members.find(m => m.id === owner);
              if (!report) return '';
              
              return `
                <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div class="flex justify-between items-start mb-2">
                    <div>
                      <h4 class="font-medium">${member?.name || owner}</h4>
                      <div class="text-sm text-gray-600">${getReportProjectFromObject(report) || 'プロジェクトなし'}</div>
                    </div>
                    <div class="flex items-center space-x-2">
                      <span class="text-sm ${isReportReviewedFromObject(report) ? 'text-green-600' : 'text-amber-600'}">
                        ${isReportReviewedFromObject(report) ? '✓ レビュー済' : '● レビュー待ち'}
                      </span>
                      <button 
                        class="text-blue-600 hover:text-blue-800 text-sm"
                        data-member-id="${owner}"
                      >
                        表示
                      </button>
                    </div>
                  </div>
                  <div class="text-sm text-gray-600">
                    ${reportMetricsHtml(report)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
      
      document.body.appendChild(historyModal);
      
      // Add event listeners
      const viewButtons = historyModal.querySelectorAll('button[data-member-id]');
      viewButtons.forEach(button => {
        button.addEventListener('click', () => {
          const memberId = button.getAttribute('data-member-id');
          if (memberId) {
            showReportModal(dateString, memberId);
          }
          document.body.removeChild(historyModal);
        });
      });
      
      historyModal.querySelector('#close-history')?.addEventListener('click', () => {
        document.body.removeChild(historyModal);
      });
      
    } catch (error) {
      console.error('Error showing report history:', error);
      alert('レポート履歴の表示中にエラーが発生しました。');
    }
  };

  // Add a button in the report modal to create additional report for the same day
  const renderCreateAdditionalReportButton = () => {
    // Only show for non-admin users and when viewing a report
    if (isAdmin || !isReportModalOpen || !reportData || !selectedDay) {
      return null;
    }
    
    return (
      <button
        type="button"
        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        onClick={() => {
          setIsReportModalOpen(false);
          setTimeout(() => {
            openNewReportModal(selectedDay);
          }, 100);
        }}
      >
        <PlusIcon className="h-5 w-5 mr-2" />
        同じ日に別のレポートを作成
      </button>
    );
  };

  // Fix the duplicate function declarations by renaming them
  const isSingleReportObject = (report: DailyReport | DailyReport[]): report is DailyReport => {
    return !Array.isArray(report);
  };

  // Function to get status from a report entity (handles both single and array cases)
  const getReportStatusFromObject = (report: DailyReport | DailyReport[]): string => {
    if (isSingleReportObject(report)) {
      return report.status;
    } else if (report.length > 0) {
      // If it's an array, return the status of the most recent report (last in array)
      return report[report.length - 1].status;
    }
    return 'pending'; // Default status
  };

  // Function to get project from a report entity
  const getReportProjectFromObject = (report: DailyReport | DailyReport[]): string => {
    if (isSingleReportObject(report)) {
      return report.project;
    } else if (report.length > 0) {
      // If it's an array, return the project of the most recent report
      return report[report.length - 1].project;
    }
    return ''; // Default empty string
  };

  // Function to check if a report has been reviewed by admin
  const isReportReviewedFromObject = (report: DailyReport | DailyReport[]): boolean => {
    if (isSingleReportObject(report)) {
      return report.adminReviewed;
    } else if (report.length > 0) {
      // Only return true if ALL reports in the array have been reviewed
      return (report as DailyReport[]).every(r => r.adminReviewed);
    }
    return false; // Default not reviewed
  };

  // Function to get the admin feedback from a report entity
  const getAdminFeedbackFromObject = (report: DailyReport | DailyReport[]): string | null => {
    if (isSingleReportObject(report)) {
      return report.adminFeedback;
    } else if (report.length > 0) {
      // If it's an array, return the admin feedback of the most recent report
      return report[report.length - 1].adminFeedback;
    }
    return null; // Default null
  };

  // Function to get the user feedback from a report entity
  const getUserFeedbackFromObject = (report: DailyReport | DailyReport[]): string | null => {
    if (isSingleReportObject(report)) {
      return report.userFeedback;
    } else if (report.length > 0) {
      // If it's an array, return the user feedback of the most recent report
      return report[report.length - 1].userFeedback;
    }
    return null; // Default null
  };

  // Function to calculate stats for reports
  const calculateReportStats = (memberReports: MemberReports): ReportStats => {
    return {
      total: Object.keys(memberReports).length,
      completed: Object.values(memberReports).filter(report => {
        try {
          return getReportStatusFromObject(report) === 'completed';
        } catch (e) {
          return false;
        }
      }).length,
      pending: Object.values(memberReports).filter(report => {
        try {
          return getReportStatusFromObject(report) === 'pending';
        } catch (e) {
          return false;
        }
      }).length,
      overdue: Object.values(memberReports).filter(report => {
        try {
          return getReportStatusFromObject(report) === 'overdue';
        } catch (e) {
          return false;
        }
      }).length
    };
  };

  // Add the reportMetricsHtml function that's missing
  // Function to generate HTML for report metrics
  const reportMetricsHtml = (report: DailyReport | DailyReport[]): string => {
    if (Array.isArray(report)) {
      const completedCount = report.reduce((sum, r) => sum + r.completed.length, 0);
      const inProgressCount = report.reduce((sum, r) => sum + r.inProgress.length, 0);
      const issuesCount = report.reduce((sum, r) => sum + r.issues.length, 0);
      const tomorrowCount = report.reduce((sum, r) => sum + r.tomorrow.length, 0);
      
      return `
        <div>完了タスク: ${completedCount}件</div>
        <div>進行中タスク: ${inProgressCount}件</div>
        <div>課題: ${issuesCount}件</div>
        <div>明日の予定: ${tomorrowCount}件</div>
      `;
    } else {
      return `
        <div>完了タスク: ${report.completed.length}件</div>
        <div>進行中タスク: ${report.inProgress.length}件</div>
        <div>課題: ${report.issues.length}件</div>
        <div>明日の予定: ${report.tomorrow.length}件</div>
      `;
    }
  };

  // Function to count total reports across all members
  const countTotalReports = (reportOwners: string[], dateString: string): number => {
    try {
      let totalCount = 0;
      
      reportOwners.forEach(owner => {
        if (dailyReports[owner] && dailyReports[owner][dateString]) {
          const reportData = dailyReports[owner][dateString];
          
          // Handle both single report and array of reports
          if (Array.isArray(reportData)) {
            // Count each report
            totalCount += (reportData as DailyReport[]).length;
          } else {
            // Single report
            totalCount += 1;
          }
        }
      });
      
      return totalCount;
    } catch (error) {
      console.error('Error counting total reports:', error);
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader 
        title="レポート" 
        description="プロジェクトの進捗状況とリソース利用率のレポート"
      />
      
      {/* Report Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <ClipboardDocumentCheckIcon className="h-6 w-6 text-blue-600" />
      </div>
            <div>
              <p className="text-gray-500">合計レポート</p>
              <p className="text-2xl font-semibold">{reportStats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
        </div>
              <div>
              <p className="text-gray-500">完了</p>
              <p className="text-2xl font-semibold">{reportStats.completed}</p>
              </div>
                    </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
            <div>
              <p className="text-gray-500">保留中</p>
              <p className="text-2xl font-semibold">{reportStats.pending}</p>
              </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 mr-4">
              <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
              </div>
            <div>
              <p className="text-gray-500">期限切れ</p>
              <p className="text-2xl font-semibold">{reportStats.overdue}</p>
              </div>
              </div>
        </Card>
          </div>
          
      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between mb-6 space-y-4 md:space-y-0">
        {/* View Mode and Member Selection */}
        <div className="flex flex-wrap items-center space-x-4">
          <div className="flex border rounded-md overflow-hidden">
            <button
              className={`px-4 py-2 ${viewMode === 'single' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}
              onClick={() => setViewMode('single')}
            >
              個人
            </button>
            <button
              className={`px-4 py-2 ${viewMode === 'team' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}
              onClick={() => setViewMode('team')}
              disabled={!isAdmin}
            >
              チーム
            </button>
                    </div>
          
          {viewMode === 'single' && (
            <select
              className="border rounded-md px-4 py-2 bg-white"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          )}
        </div>
        
        {/* Export and Refresh Buttons */}
            <div className="flex space-x-2">
              <button 
            className="flex items-center px-4 py-2 border rounded-md hover:bg-gray-50"
            onClick={exportReportsAsCSV}
              >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            エクスポート
              </button>
              <button 
            className="flex items-center px-4 py-2 border rounded-md hover:bg-gray-50"
            onClick={() => refreshReports()}
              >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            更新
              </button>
        </div>
            </div>
            
      {/* Calendar */}
      <Card className="overflow-hidden my-6">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <div className="flex space-x-2 items-center">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
              className="p-2 hover:bg-gray-200 rounded-full"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-medium">{getMonthYearDisplay()}</h3>
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
              className="p-2 hover:bg-gray-200 rounded-full"
              >
              <ChevronRightIcon className="h-5 w-5" />
              </button>
          </div>
          <div>
              <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
              今日
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
              <thead>
                <tr>
                <th className="py-2 px-3 border-b text-center">日</th>
                <th className="py-2 px-3 border-b text-center">月</th>
                <th className="py-2 px-3 border-b text-center">火</th>
                <th className="py-2 px-3 border-b text-center">水</th>
                <th className="py-2 px-3 border-b text-center">木</th>
                <th className="py-2 px-3 border-b text-center">金</th>
                <th className="py-2 px-3 border-b text-center">土</th>
                </tr>
              </thead>
              <tbody>
                {generateCalendar()}
              </tbody>
            </table>
          </div>
      </Card>

      {/* Report Modal */}
      <Transition show={isReportModalOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="fixed inset-0 z-10 overflow-y-auto"
          onClose={() => setIsReportModalOpen(false)}
        >
          <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
          </Transition.Child>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
              <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                {reportData && (
                  <>
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                  >
                      <div className="flex items-center">
                        <span>日報詳細</span>
                        <span className="ml-2 text-sm text-gray-500">
                          ({selectedDay ? new Date(selectedDay).toLocaleDateString('ja-JP') : ''})
                        </span>
                    </div>
                      <div className="flex space-x-2">
                        {/* Delete Button - Only show for user's own reports */}
                        {!isAdmin && reportData.userId === currentUser?.id && (
                    <button
                      type="button"
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                            onClick={() => selectedDay && deleteReport(selectedDay)}
                    >
                            削除
                    </button>
                        )}
                        
                        {/* Edit Button - Only show for user's own reports */}
                        {!isAdmin && reportData.userId === currentUser?.id && !isEditMode && (
                            <button
                              type="button"
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                                onClick={enterEditMode}
                              >
                            <PencilIcon className="h-4 w-4 mr-1" />
                                編集
                              </button>
                        )}
                        
                          <button
                            type="button"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                            onClick={() => setIsReportModalOpen(false)}
                          >
                          <span className="sr-only">Close</span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                    </Dialog.Title>
                    
                    <div className="mt-4">
                      {/* Edit Mode */}
                      {isEditMode ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              プロジェクト
                            </label>
                        <select
                              className="w-full px-3 py-2 border rounded-md"
                          value={selectedProject}
                          onChange={(e) => {
                                setSelectedProject(e.target.value);
                                // Filter tasks by the selected project
                                if (e.target.value) {
                                  const filtered = tasks.filter(task => task.projectId === e.target.value);
                                  setFilteredTasks(filtered);
                                } else {
                                  setFilteredTasks([]);
                            }
                          }}
                          required
                        >
                          <option value="">プロジェクトを選択</option>
                              {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                          {selectedProject && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                プロジェクトタスク
                              </label>
                              <div className="border rounded-md p-3 bg-gray-50 max-h-40 overflow-y-auto">
                                {filteredTasks.length > 0 ? (
                                  <ul className="space-y-2">
                                    {filteredTasks.map(task => (
                                      <li key={task.id} className="flex items-center">
                                        <input
                                          type="checkbox"
                                          id={`edit-task-${task.id}`}
                                          className="mr-2"
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedTasks([...selectedTasks, task.id]);
                                            } else {
                                              setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                                            }
                                          }}
                                          checked={selectedTasks.includes(task.id)}
                                        />
                                        <label htmlFor={`edit-task-${task.id}`} className="text-sm">
                                          {task.title}
                                        </label>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-gray-500 text-sm">このプロジェクトに作成されたタスクはありません</p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              完了したタスク
                            </label>
                        <div className="space-y-2">
                          {newReportData.completed.map((task, index) => (
                                <div key={index} className="flex items-center group">
                              <input
                                type="text"
                                    className="flex-grow px-3 py-2 border rounded-md"
                                value={task}
                                onChange={(e) => {
                                      const updatedTasks = [...newReportData.completed];
                                      updatedTasks[index] = e.target.value;
                                      setNewReportData({ ...newReportData, completed: updatedTasks });
                                    }}
                              />
                              <button
                                type="button"
                                    className="ml-2 text-red-500 opacity-0 group-hover:opacity-100"
                                onClick={() => {
                                      const updatedTasks = [...newReportData.completed];
                                      updatedTasks.splice(index, 1);
                                      setNewReportData({ ...newReportData, completed: updatedTasks });
                                }}
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                              <div className="flex">
                            <input
                              type="text"
                                  className="flex-grow px-3 py-2 border rounded-md"
                                  placeholder="新しいタスクを追加"
                              value={completedTask}
                              onChange={(e) => setCompletedTask(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && completedTask.trim()) {
                                      e.preventDefault();
                                      setNewReportData({
                                        ...newReportData,
                                        completed: [...newReportData.completed, completedTask],
                                      });
                                      setCompletedTask('');
                                    }
                                  }}
                            />
                            <button
                              type="button"
                                  className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-md"
                              onClick={() => {
                                if (completedTask.trim()) {
                                  setNewReportData({
                                    ...newReportData,
                                        completed: [...newReportData.completed, completedTask],
                                  });
                                  setCompletedTask('');
                                }
                              }}
                            >
                                  追加
                            </button>
                          </div>
                        </div>
                      </div>
                      
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              進行中のタスク
                            </label>
                        <div className="space-y-2">
                          {newReportData.inProgress.map((task, index) => (
                                <div key={index} className="flex items-center group">
                              <input
                                type="text"
                                    className="flex-grow px-3 py-2 border rounded-md"
                                value={task}
                                onChange={(e) => {
                                      const updatedTasks = [...newReportData.inProgress];
                                      updatedTasks[index] = e.target.value;
                                      setNewReportData({ ...newReportData, inProgress: updatedTasks });
                                    }}
                              />
                              <button
                                type="button"
                                    className="ml-2 text-red-500 opacity-0 group-hover:opacity-100"
                                onClick={() => {
                                      const updatedTasks = [...newReportData.inProgress];
                                      updatedTasks.splice(index, 1);
                                      setNewReportData({ ...newReportData, inProgress: updatedTasks });
                                }}
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                              <div className="flex">
                            <input
                              type="text"
                                  className="flex-grow px-3 py-2 border rounded-md"
                                  placeholder="新しいタスクを追加"
                              value={inProgressTask}
                              onChange={(e) => setInProgressTask(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && inProgressTask.trim()) {
                                      e.preventDefault();
                                      setNewReportData({
                                        ...newReportData,
                                        inProgress: [...newReportData.inProgress, inProgressTask],
                                      });
                                      setInProgressTask('');
                                    }
                                  }}
                            />
                            <button
                              type="button"
                                  className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-md"
                              onClick={() => {
                                if (inProgressTask.trim()) {
                                  setNewReportData({
                                    ...newReportData,
                                        inProgress: [...newReportData.inProgress, inProgressTask],
                                  });
                                  setInProgressTask('');
                                }
                              }}
                            >
                                  追加
                            </button>
                          </div>
                        </div>
                      </div>
                      
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              課題・障害
                            </label>
                        <div className="space-y-2">
                          {newReportData.issues.map((issue, index) => (
                                <div key={index} className="flex items-center group">
                              <input
                                type="text"
                                    className="flex-grow px-3 py-2 border rounded-md"
                                value={issue}
                                onChange={(e) => {
                                      const updatedIssues = [...newReportData.issues];
                                      updatedIssues[index] = e.target.value;
                                      setNewReportData({ ...newReportData, issues: updatedIssues });
                                    }}
                              />
                              <button
                                type="button"
                                    className="ml-2 text-red-500 opacity-0 group-hover:opacity-100"
                                onClick={() => {
                                      const updatedIssues = [...newReportData.issues];
                                      updatedIssues.splice(index, 1);
                                      setNewReportData({ ...newReportData, issues: updatedIssues });
                                }}
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                              <div className="flex">
                            <input
                              type="text"
                                  className="flex-grow px-3 py-2 border rounded-md"
                                  placeholder="新しい課題を追加"
                              value={issueItem}
                              onChange={(e) => setIssueItem(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && issueItem.trim()) {
                                      e.preventDefault();
                                      setNewReportData({
                                        ...newReportData,
                                        issues: [...newReportData.issues, issueItem],
                                      });
                                      setIssueItem('');
                                    }
                                  }}
                            />
                            <button
                              type="button"
                                  className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-md"
                              onClick={() => {
                                if (issueItem.trim()) {
                                  setNewReportData({
                                    ...newReportData,
                                        issues: [...newReportData.issues, issueItem],
                                  });
                                  setIssueItem('');
                                }
                              }}
                            >
                                  追加
                            </button>
                          </div>
                        </div>
                      </div>
                      
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              明日の予定
                            </label>
                        <div className="space-y-2">
                          {newReportData.tomorrow.map((plan, index) => (
                                <div key={index} className="flex items-center group">
                              <input
                                type="text"
                                    className="flex-grow px-3 py-2 border rounded-md"
                                value={plan}
                                onChange={(e) => {
                                      const updatedPlans = [...newReportData.tomorrow];
                                      updatedPlans[index] = e.target.value;
                                      setNewReportData({ ...newReportData, tomorrow: updatedPlans });
                                    }}
                              />
                              <button
                                type="button"
                                    className="ml-2 text-red-500 opacity-0 group-hover:opacity-100"
                                onClick={() => {
                                      const updatedPlans = [...newReportData.tomorrow];
                                      updatedPlans.splice(index, 1);
                                      setNewReportData({ ...newReportData, tomorrow: updatedPlans });
                                }}
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                              <div className="flex">
                            <input
                              type="text"
                                  className="flex-grow px-3 py-2 border rounded-md"
                                  placeholder="新しい予定を追加"
                              value={tomorrowPlan}
                              onChange={(e) => setTomorrowPlan(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && tomorrowPlan.trim()) {
                                      e.preventDefault();
                                      setNewReportData({
                                        ...newReportData,
                                        tomorrow: [...newReportData.tomorrow, tomorrowPlan],
                                      });
                                      setTomorrowPlan('');
                                    }
                                  }}
                            />
                            <button
                              type="button"
                                  className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-md"
                              onClick={() => {
                                if (tomorrowPlan.trim()) {
                                  setNewReportData({
                                    ...newReportData,
                                        tomorrow: [...newReportData.tomorrow, tomorrowPlan],
                                  });
                                  setTomorrowPlan('');
                                }
                              }}
                            >
                                  追加
                            </button>
                          </div>
                        </div>
                      </div>
                      
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              フィードバック (任意)
                            </label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={3}
                              placeholder="日報へのコメントを追加する"
                              value={userFeedbackText}
                              onChange={(e) => setUserFeedbackText(e.target.value)}
                            />
                          </div>
                          
                          <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                              className="px-4 py-2 border rounded-md hover:bg-gray-50"
                          onClick={() => setIsEditMode(false)}
                        >
                          キャンセル
                        </button>
                        <button
                          type="button"
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          onClick={saveEditedReport}
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                        <div className="space-y-4">
                          <div className="border rounded-md overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b">
                              <h4 className="font-medium">プロジェクト</h4>
                            </div>
                            <div className="p-4">
                              <p>{reportData.project}</p>
                            </div>
                          </div>
                          
                          {/* Add Project Tasks section */}
                          {reportData.projectId && (
                            <div className="border rounded-md overflow-hidden">
                              <div className="bg-gray-50 px-4 py-2 border-b">
                                <h4 className="font-medium">プロジェクトタスク</h4>
                              </div>
                              <div className="p-4">
                                {filteredTasks.length > 0 ? (
                                  <>
                                    <p className="text-sm text-gray-600 mb-2">このレポートのプロジェクトタスク:</p>
                                    <ul className="space-y-2">
                                      {filteredTasks.filter(task => 
                                        reportData.taskIds && Array.isArray(reportData.taskIds) 
                                        ? reportData.taskIds.includes(task.id) 
                                        : false
                                      ).map(task => (
                                        <li key={task.id} className="flex items-start">
                                          <input
                                            type="checkbox"
                                            id={`view-task-${task.id}`}
                                            className="mt-1 mr-2"
                                            checked={true}
                                            disabled
                                          />
                                          <label htmlFor={`view-task-${task.id}`} className="text-sm">
                                            {task.title}
                                            {task.status === 'completed' && (
                                              <span className="ml-2 text-xs text-green-600">
                                                (完了)
                                              </span>
                                            )}
                                            {task.status === 'in-progress' && (
                                              <span className="ml-2 text-xs text-blue-600">
                                                (進行中)
                                              </span>
                                            )}
                                          </label>
                                        </li>
                                      ))}
                                    </ul>
                                    {filteredTasks.filter(task => 
                                      reportData.taskIds && Array.isArray(reportData.taskIds) 
                                      ? reportData.taskIds.includes(task.id) 
                                      : false
                                    ).length === 0 && (
                                      <p className="text-gray-500">このレポートには選択されたタスクがありません</p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-gray-500">このプロジェクトに関連するタスクはありません</p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="border rounded-md overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b">
                              <h4 className="font-medium">完了したタスク</h4>
                            </div>
                            <div className="p-4">
                              {reportData && reportData.completed && reportData.completed.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1">
                                  {reportData.completed.map((task, index) => (
                                    <li key={index}>{task}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-500">完了したタスクはありません</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="border rounded-md overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b">
                              <h4 className="font-medium">進行中のタスク</h4>
                            </div>
                            <div className="p-4">
                              {reportData && reportData.inProgress && reportData.inProgress.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1">
                                  {reportData.inProgress.map((task, index) => (
                                    <li key={index}>{task}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-500">進行中のタスクはありません</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="border rounded-md overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b">
                              <h4 className="font-medium">課題・障害</h4>
                            </div>
                            <div className="p-4">
                              {reportData && reportData.issues && reportData.issues.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1">
                                  {reportData.issues.map((issue, index) => (
                                    <li key={index}>{issue}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-500">課題はありません</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="border rounded-md overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b">
                              <h4 className="font-medium">明日の予定</h4>
                            </div>
                            <div className="p-4">
                              {reportData && reportData.tomorrow && reportData.tomorrow.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1">
                                  {reportData.tomorrow.map((plan, index) => (
                                    <li key={index}>{plan}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-500">明日の予定はありません</p>
                              )}
                            </div>
                          </div>
                          
                          {reportData.userFeedback && (
                            <div className="border rounded-md overflow-hidden">
                              <div className="bg-gray-50 px-4 py-2 border-b">
                                <h4 className="font-medium">ユーザーフィードバック</h4>
                              </div>
                              <div className="p-4">
                                <p>{reportData.userFeedback}</p>
                              </div>
                            </div>
                          )}
                          
                          {isAdmin && (
                            <div className="border rounded-md overflow-hidden">
                              <div className="bg-gray-50 px-4 py-2 border-b">
                                <h4 className="font-medium">管理者フィードバック</h4>
                              </div>
                              <div className="p-4">
                                {reportData && reportData.adminFeedback ? (
                                  <div>
                                    <p>{reportData.adminFeedback}</p>
                                    <p className="text-sm text-gray-500 mt-2">
                                      {selectedDay && selectedMember && isReportReviewed(selectedMember, selectedDay) ? 
                                        '✓ レビュー済み' : '● レビュー待ち'}
                                    </p>
                                  </div>
                                ) : (
                                  <div>
                                    <textarea
                                      className="w-full p-2 border rounded"
                                      rows={3}
                                      placeholder="フィードバックを入力"
                                      value={adminFeedbackText}
                                      onChange={(e) => setAdminFeedbackText(e.target.value)}
                                    />
                                    <div className="flex justify-end mt-2">
                                      <button
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                        onClick={submitAdminReview}
                                      >
                                        送信
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* User feedback section for self-reports */}
                          {!isAdmin && reportData && reportData.userId === currentUser?.id && (
                            <div className="border rounded-md overflow-hidden">
                              <div className="bg-gray-50 px-4 py-2 border-b">
                                <h4 className="font-medium">フィードバック</h4>
                              </div>
                              <div className="p-4">
                                <textarea
                                  className="w-full p-2 border rounded"
                                  rows={3}
                                  placeholder="日報へのコメントを追加する（任意）"
                                  value={feedbackText}
                                  onChange={(e) => setFeedbackText(e.target.value)}
                                />
                                <div className="flex justify-end mt-2">
                                  <button
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    onClick={saveReportFeedback}
                                  >
                                    保存
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Show the button for creating additional reports for the same day */}
                          {renderCreateAdditionalReportButton()}
                          
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* New Report Modal */}
      <Transition show={isNewReportModalOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="fixed inset-0 z-10 overflow-y-auto"
          onClose={() => setIsNewReportModalOpen(false)}
        >
          <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
          </Transition.Child>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
              <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                  >
                  <div className="flex items-center">
                    <span>新規日報作成</span>
                    <span className="ml-2 text-sm text-gray-500">
                      ({newReportDate ? new Date(newReportDate).toLocaleDateString('ja-JP') : ''})
                    </span>
                  </div>
                    <button
                      type="button"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={() => setIsNewReportModalOpen(false)}
                    >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </Dialog.Title>
                  
                <form className="mt-4 space-y-4" onSubmit={handleNewReportSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      プロジェクト
                    </label>
                        <select
                      className="w-full px-3 py-2 border rounded-md"
                          value={selectedProject}
                          onChange={(e) => {
                        setSelectedProject(e.target.value);
                        // Filter tasks by the selected project
                        if (e.target.value) {
                          const filtered = tasks.filter(task => task.projectId === e.target.value);
                          setFilteredTasks(filtered);
                        } else {
                          setFilteredTasks([]);
                            }
                          }}
                          required
                        >
                          <option value="">プロジェクトを選択</option>
                      {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      </div>

                  {selectedProject && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        プロジェクトタスク
                      </label>
                      <div className="border rounded-md p-3 bg-gray-50 max-h-40 overflow-y-auto">
                          {filteredTasks.length > 0 ? (
                          <ul className="space-y-2">
                            {filteredTasks.map(task => (
                              <li key={task.id} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`task-${task.id}`}
                                  className="mr-2"
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedTasks([...selectedTasks, task.id]);
                                    } else {
                                      setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                                    }
                                  }}
                                  checked={selectedTasks.includes(task.id)}
                                />
                                <label htmlFor={`task-${task.id}`} className="text-sm">
                                  {task.title}
                                </label>
                              </li>
                            ))}
                          </ul>
                          ) : (
                          <p className="text-gray-500 text-sm">このプロジェクトに作成されたタスクはありません</p>
                          )}
                        </div>
                      </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      完了したタスク
                    </label>
                        <div className="space-y-2">
                          {newReportData.completed.map((task, index) => (
                        <div key={index} className="flex items-center group">
                              <input
                                type="text"
                            className="flex-grow px-3 py-2 border rounded-md"
                                value={task}
                                onChange={(e) => {
                              const updatedTasks = [...newReportData.completed];
                              updatedTasks[index] = e.target.value;
                              setNewReportData({ ...newReportData, completed: updatedTasks });
                            }}
                              />
                              <button
                                type="button"
                            className="ml-2 text-red-500 opacity-0 group-hover:opacity-100"
                                onClick={() => {
                              const updatedTasks = [...newReportData.completed];
                              updatedTasks.splice(index, 1);
                              setNewReportData({ ...newReportData, completed: updatedTasks });
                                }}
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                      <div className="flex">
                            <input
                              type="text"
                          className="flex-grow px-3 py-2 border rounded-md"
                          placeholder="新しいタスクを追加"
                              value={completedTask}
                              onChange={(e) => setCompletedTask(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && completedTask.trim()) {
                              e.preventDefault();
                              setNewReportData({
                                ...newReportData,
                                completed: [...newReportData.completed, completedTask],
                              });
                              setCompletedTask('');
                            }
                          }}
                            />
                            <button
                              type="button"
                          className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-md"
                              onClick={() => {
                                if (completedTask.trim()) {
                                  setNewReportData({
                                    ...newReportData,
                                completed: [...newReportData.completed, completedTask],
                                  });
                                  setCompletedTask('');
                                }
                              }}
                            >
                          追加
                            </button>
                          </div>
                        </div>
                      </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      進行中のタスク
                    </label>
                        <div className="space-y-2">
                          {newReportData.inProgress.map((task, index) => (
                        <div key={index} className="flex items-center group">
                              <input
                                type="text"
                            className="flex-grow px-3 py-2 border rounded-md"
                                value={task}
                                onChange={(e) => {
                              const updatedTasks = [...newReportData.inProgress];
                              updatedTasks[index] = e.target.value;
                              setNewReportData({ ...newReportData, inProgress: updatedTasks });
                            }}
                              />
                              <button
                                type="button"
                            className="ml-2 text-red-500 opacity-0 group-hover:opacity-100"
                                onClick={() => {
                              const updatedTasks = [...newReportData.inProgress];
                              updatedTasks.splice(index, 1);
                              setNewReportData({ ...newReportData, inProgress: updatedTasks });
                                }}
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                      <div className="flex">
                            <input
                              type="text"
                          className="flex-grow px-3 py-2 border rounded-md"
                          placeholder="新しいタスクを追加"
                              value={inProgressTask}
                              onChange={(e) => setInProgressTask(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && inProgressTask.trim()) {
                              e.preventDefault();
                              setNewReportData({
                                ...newReportData,
                                inProgress: [...newReportData.inProgress, inProgressTask],
                              });
                              setInProgressTask('');
                            }
                          }}
                            />
                            <button
                              type="button"
                          className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-md"
                              onClick={() => {
                                if (inProgressTask.trim()) {
                                  setNewReportData({
                                    ...newReportData,
                                inProgress: [...newReportData.inProgress, inProgressTask],
                                  });
                                  setInProgressTask('');
                                }
                              }}
                            >
                          追加
                            </button>
                          </div>
                        </div>
                      </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      課題・障害
                    </label>
                        <div className="space-y-2">
                          {newReportData.issues.map((issue, index) => (
                        <div key={index} className="flex items-center group">
                              <input
                                type="text"
                            className="flex-grow px-3 py-2 border rounded-md"
                                value={issue}
                                onChange={(e) => {
                              const updatedIssues = [...newReportData.issues];
                              updatedIssues[index] = e.target.value;
                              setNewReportData({ ...newReportData, issues: updatedIssues });
                            }}
                              />
                              <button
                                type="button"
                            className="ml-2 text-red-500 opacity-0 group-hover:opacity-100"
                                onClick={() => {
                              const updatedIssues = [...newReportData.issues];
                              updatedIssues.splice(index, 1);
                              setNewReportData({ ...newReportData, issues: updatedIssues });
                                }}
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                      <div className="flex">
                            <input
                              type="text"
                          className="flex-grow px-3 py-2 border rounded-md"
                          placeholder="新しい課題を追加"
                              value={issueItem}
                              onChange={(e) => setIssueItem(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && issueItem.trim()) {
                              e.preventDefault();
                              setNewReportData({
                                ...newReportData,
                                issues: [...newReportData.issues, issueItem],
                              });
                              setIssueItem('');
                            }
                          }}
                            />
                            <button
                              type="button"
                          className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-md"
                              onClick={() => {
                                if (issueItem.trim()) {
                                  setNewReportData({
                                    ...newReportData,
                                issues: [...newReportData.issues, issueItem],
                                  });
                                  setIssueItem('');
                                }
                              }}
                            >
                          追加
                            </button>
                          </div>
                        </div>
                      </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      明日の予定
                    </label>
                        <div className="space-y-2">
                          {newReportData.tomorrow.map((plan, index) => (
                        <div key={index} className="flex items-center group">
                              <input
                                type="text"
                            className="flex-grow px-3 py-2 border rounded-md"
                                value={plan}
                                onChange={(e) => {
                              const updatedPlans = [...newReportData.tomorrow];
                              updatedPlans[index] = e.target.value;
                              setNewReportData({ ...newReportData, tomorrow: updatedPlans });
                            }}
                              />
                              <button
                                type="button"
                            className="ml-2 text-red-500 opacity-0 group-hover:opacity-100"
                                onClick={() => {
                              const updatedPlans = [...newReportData.tomorrow];
                              updatedPlans.splice(index, 1);
                              setNewReportData({ ...newReportData, tomorrow: updatedPlans });
                                }}
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                      <div className="flex">
                            <input
                              type="text"
                          className="flex-grow px-3 py-2 border rounded-md"
                          placeholder="新しい予定を追加"
                              value={tomorrowPlan}
                              onChange={(e) => setTomorrowPlan(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && tomorrowPlan.trim()) {
                              e.preventDefault();
                              setNewReportData({
                                ...newReportData,
                                tomorrow: [...newReportData.tomorrow, tomorrowPlan],
                              });
                              setTomorrowPlan('');
                            }
                          }}
                            />
                            <button
                              type="button"
                          className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-md"
                              onClick={() => {
                                if (tomorrowPlan.trim()) {
                                  setNewReportData({
                                    ...newReportData,
                                tomorrow: [...newReportData.tomorrow, tomorrowPlan],
                                  });
                                  setTomorrowPlan('');
                                }
                              }}
                            >
                          追加
                            </button>
                          </div>
                        </div>
                      </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      フィードバック (任意)
                    </label>
                        <textarea
                      className="w-full px-3 py-2 border rounded-md"
                      rows={3}
                      placeholder="日報へのコメントを追加する"
                          value={userFeedbackText}
                          onChange={(e) => setUserFeedbackText(e.target.value)}
                        />
                      </div>

                  <div className="flex justify-end space-x-3 mt-6">
                        <button
                          type="button"
                      className="px-4 py-2 border rounded-md hover:bg-gray-50"
                          onClick={() => setIsNewReportModalOpen(false)}
                        >
                          キャンセル
                        </button>
                        <button
                          type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          保存
                        </button>
                      </div>
                    </form>
                  </div>
              </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
} 