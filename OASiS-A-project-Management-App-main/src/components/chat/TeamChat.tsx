'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon, 
  DocumentIcon, 
  PhotoIcon, 
  FilmIcon, 
  MusicalNoteIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { io, Socket } from 'socket.io-client';

interface FileAttachment {
  type: 'image' | 'document' | 'video' | 'audio' | 'other';
  url: string;
  name: string;
  size: number;
}

interface Message {
  id: string;
  teamId: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    fullName: string | null;
    email: string;
  };
  attachments?: FileAttachment[];
}

interface TeamChatProps {
  teamId: string;
  teamName: string;
}

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

export default function TeamChat({ teamId, teamName }: TeamChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [typingUsers, setTypingUsers] = useState<{[key: string]: boolean}>({});
  const [isTyping, setIsTyping] = useState(false);
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to Socket.io when component mounts
  useEffect(() => {
    // Only connect if we have a session
    if (!session?.user) return;

    // Initialize Socket.io connection
    const socketInit = async () => {
      try {
        // Make sure the Socket.io server is running
        await fetch('/api/socketio');
        
        // Connect to Socket.io server
        const socketIo = io({
          path: '/api/socketio',
        });

        socketIo.on('connect', () => {
          console.log('Connected to Socket.io server');
          
          // Join the team chat room
          socketIo.emit('join-team', teamId);
        });

        socketIo.on('team-message', (message: Message) => {
          // Only add messages that aren't already in the state
          setMessages((prevMessages) => {
            // Check if message is already in the list
            const exists = prevMessages.some(m => m.id === message.id);
            if (exists) return prevMessages;
            return [...prevMessages, message];
          });
        });

        socketIo.on('typing', (data: { teamId: string; username: string; isTyping: boolean }) => {
          if (data.teamId === teamId) {
            setTypingUsers(prev => ({ 
              ...prev, 
              [data.username]: data.isTyping 
            }));
          }
        });

        socketIo.on('disconnect', () => {
          console.log('Disconnected from Socket.io server');
        });

        setSocket(socketIo);

        // Clean up on unmount
        return () => {
          console.log('Leaving team chat room');
          socketIo.emit('leave-team', teamId);
          socketIo.disconnect();
        };
      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    };

    socketInit();
    
    // Fetch existing messages
    fetchMessages();
  }, [session, teamId]);

  // Handle typing status
  useEffect(() => {
    if (!socket || !session?.user) return;

    if (isTyping) {
      socket.emit('typing', { 
        teamId, 
        username: session.user.name || session.user.username || 'Unknown User', 
        isTyping: true 
      });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set a new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit('typing', { 
          teamId, 
          username: session.user.name || session.user.username || 'Unknown User', 
          isTyping: false 
        });
      }, 3000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, socket, teamId, session]);

  // Fetch previous messages
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${teamId}/messages`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    handleFileUpload(files);
  };

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    if (!session?.user) return;
    
    setUploading(true);
    
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`/api/teams/${teamId}/upload`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('ファイルのアップロードに失敗しました');
        }
        
        const data = await response.json();
        return data.file as FileAttachment;
      });
      
      const uploadedFiles = await Promise.all(uploadPromises);
      setFileAttachments(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('ファイルのアップロードに失敗しました');
    } finally {
      setUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove file attachment
  const removeAttachment = (index: number) => {
    setFileAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Send a new message
  const sendMessage = async () => {
    if (!session?.user || !newMessage.trim()) return;
    
    const messageContent = newMessage.trim();
    setNewMessage('');
    
    try {
      // Send message to the API
      const response = await fetch(`/api/teams/${teamId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      
      // Add the new message to the state
      setMessages(prev => [...prev, data.message]);
      
      // Emit socket event (for real-time updates)
      if (socket) {
        socket.emit('team-message', {
          teamId,
          message: data.message
        });
      }
      
      // Clear any file attachments
      setFileAttachments([]);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error handling UI if needed
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Only emit typing events if there's content
    if (value.trim() && !isTyping) {
      setIsTyping(true);
    } else if (!value.trim()) {
      setIsTyping(false);
    }
  };

  // Format date for display
  const formatMessageDate = (date: Date) => {
    return new Date(date).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render file attachment based on type
  const renderAttachment = (attachment: FileAttachment) => {
    switch (attachment.type) {
      case 'image':
        return (
          <div className="mt-2 rounded-lg overflow-hidden">
            <a href={attachment.url} target="_blank" rel="noopener noreferrer">
              <img
                src={attachment.url}
                alt={attachment.name}
                className="max-h-[200px] max-w-full object-contain"
              />
            </a>
            <div className="text-xs text-gray-500 mt-1 flex items-center">
              <PhotoIcon className="h-3 w-3 mr-1" />
              {attachment.name} ({formatFileSize(attachment.size)})
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="mt-2">
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <FilmIcon className="h-5 w-5 mr-2" />
              <span>{attachment.name}</span>
            </a>
            <div className="text-xs text-gray-500">
              {formatFileSize(attachment.size)}
            </div>
          </div>
        );
      case 'audio':
        return (
          <div className="mt-2">
            <audio controls className="max-w-full">
              <source src={attachment.url} />
              お使いのブラウザはオーディオ再生をサポートしていません。
            </audio>
            <div className="text-xs text-gray-500 mt-1 flex items-center">
              <MusicalNoteIcon className="h-3 w-3 mr-1" />
              {attachment.name} ({formatFileSize(attachment.size)})
            </div>
          </div>
        );
      case 'document':
        return (
          <div className="mt-2">
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <DocumentIcon className="h-5 w-5 mr-2" />
              <span>{attachment.name}</span>
            </a>
            <div className="text-xs text-gray-500">
              {formatFileSize(attachment.size)}
            </div>
          </div>
        );
      default:
        return (
          <div className="mt-2">
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-indigo-600 hover:text-indigo-800"
            >
              <PaperClipIcon className="h-5 w-5 mr-2" />
              <span>{attachment.name}</span>
            </a>
            <div className="text-xs text-gray-500">
              {formatFileSize(attachment.size)}
            </div>
          </div>
        );
    }
  };

  // Generate typing indicator text
  const getTypingIndicatorText = () => {
    const typingUsernames = Object.keys(typingUsers).filter(username => typingUsers[username]);
    
    if (typingUsernames.length === 0) {
      return null;
    } else if (typingUsernames.length === 1) {
      return `${typingUsernames[0]} が入力しています...`;
    } else if (typingUsernames.length === 2) {
      return `${typingUsernames[0]} と ${typingUsernames[1]} が入力しています...`;
    } else {
      return `${typingUsernames.length} 人が入力しています...`;
    }
  };

  // Send a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't send empty messages (unless there are file attachments)
    if ((!newMessage.trim() && fileAttachments.length === 0) || !session?.user) return;
    
    await sendMessage();
  };

  return (
    <div className="flex flex-col h-[500px] border border-gray-200 rounded-lg bg-white">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-ink-900">{teamName}のチャット</h3>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-center">メッセージはまだありません。</p>
            <p className="text-center">最初のメッセージを送信しましょう！</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.user.id === session?.user?.id
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.user.id === session?.user?.id
                    ? 'bg-indigo-50 text-indigo-900'
                    : 'bg-gray-100 text-ink-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {message.user.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatMessageDate(new Date(message.createdAt))}
                  </span>
                </div>
                {message.content && (
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                )}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="space-y-2">
                    {message.attachments.map((attachment, index) => (
                      <div key={index}>{renderAttachment(attachment)}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {Object.keys(typingUsers).filter(name => typingUsers[name]).length > 0 && (
          <div className="text-xs text-gray-500 italic">
            {getTypingIndicatorText()}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File attachments preview */}
      {fileAttachments.length > 0 && (
        <div className="border-t border-gray-200 p-2 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {fileAttachments.map((file, index) => (
              <div 
                key={index} 
                className="relative bg-white rounded-md border border-gray-300 px-2 py-1 flex items-center"
              >
                {file.type === 'image' && <PhotoIcon className="h-4 w-4 mr-1 text-gray-500" />}
                {file.type === 'document' && <DocumentIcon className="h-4 w-4 mr-1 text-gray-500" />}
                {file.type === 'video' && <FilmIcon className="h-4 w-4 mr-1 text-gray-500" />}
                {file.type === 'audio' && <MusicalNoteIcon className="h-4 w-4 mr-1 text-gray-500" />}
                {file.type === 'other' && <PaperClipIcon className="h-4 w-4 mr-1 text-gray-500" />}
                <span className="text-xs truncate max-w-[120px]">{file.name}</span>
                <button 
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message input */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-gray-200 p-4 bg-gray-50"
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              className="w-full rounded-md border border-gray-300 shadow-sm pl-4 pr-10 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="メッセージを入力..."
              disabled={!session?.user || uploading}
            />
            <button 
              type="button" 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => fileInputRef.current?.click()}
              disabled={!session?.user || uploading}
            >
              <PaperClipIcon className="h-5 w-5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              multiple 
            />
          </div>
          <Button
            type="submit"
            disabled={(!newMessage.trim() && fileAttachments.length === 0) || !session?.user || uploading}
            isLoading={uploading}
          >
            <PaperAirplaneIcon className="h-5 w-5 mr-1" />
            送信
          </Button>
        </div>
      </form>
    </div>
  );
} 