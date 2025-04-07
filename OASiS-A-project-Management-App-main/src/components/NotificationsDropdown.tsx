'use client';

import { useState, useEffect, useRef } from 'react';
import { BellIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  linkUrl?: string;
  data?: any;
};

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data); // Data is already the array of notifications
      
      // Calculate unread count
      const unread = data.filter((notification: Notification) => !notification.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }
      
      // Update local state
      setNotifications(notifications.map(notification => ({
        ...notification,
        read: true
      })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Mark a single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Parse the notification data if it's a string
    let notificationData = notification.data;
    if (notification.data && typeof notification.data === 'string') {
      try {
        notificationData = JSON.parse(notification.data);
      } catch (error) {
        console.error('Error parsing notification data:', error);
      }
    }
    
    // Navigate to the link URL if provided
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
    
    // Close the dropdown
    setIsOpen(false);
  };

  // Close the dropdown when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  // Fetch notifications on component mount and set up refresh interval
  useEffect(() => {
    fetchNotifications();
    
    // Add event listener for outside clicks
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up on unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1 rounded-full text-gray-500 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">通知</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-500"
              >
                すべて既読にする
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">読み込み中...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500">通知はありません</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <li 
                    key={notification.id}
                    className={`p-3 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-indigo-50' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        {notification.read ? (
                          <CheckCircleIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-indigo-600 mt-1.5"></div>
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { 
                            addSuffix: true,
                            locale: ja
                          })}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="p-2 border-t border-gray-200 text-center">
            <button
              onClick={() => router.push('/notifications')}
              className="text-xs text-indigo-600 hover:text-indigo-500"
            >
              すべての通知を見る
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 