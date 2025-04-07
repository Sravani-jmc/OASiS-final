'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { 
  CalendarIcon, 
  ClockIcon, 
  UserGroupIcon,
  StarIcon as StarOutline,
  FolderIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

type Project = {
  id: string;
  name: string;
  description: string;
  status: 'notStarted' | 'inProgress' | 'completed' | 'onHold';
  dueDate: string;
  teamId: string;
  teamName: string;
  progress: number;
  priority: 'low' | 'medium' | 'high';
  isFavorite?: boolean;
};

type ProjectCardProps = {
  project: Project;
  onFavoriteToggle?: (id: string) => void;
  className?: string;
};

const statusColors = {
  notStarted: { bg: 'bg-gray-100', text: 'text-gray-700' },
  inProgress: { bg: 'bg-blue-100', text: 'text-blue-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  onHold: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

const priorityColors = {
  low: { bg: 'bg-gray-100', text: 'text-gray-700' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  high: { bg: 'bg-red-100', text: 'text-red-700' },
};

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onFavoriteToggle, className = '' }) => {
  const { t } = useLanguage();
  const [isFavorite, setIsFavorite] = useState(project.isFavorite || false);

  const handleFavoriteClick = () => {
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    if (onFavoriteToggle) {
      onFavoriteToggle(project.id);
    }
  };

  const daysUntilDue = () => {
    const today = new Date();
    const dueDate = new Date(project.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysLeft = daysUntilDue();
  const isPastDue = daysLeft < 0;
  const isCloseToDue = daysLeft >= 0 && daysLeft <= 3;

  return (
    <div className={`bg-white rounded-lg shadow-sm hover:shadow-md transition p-4 ${className}`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-medium">
          <Link href={`/projects/${project.id}`} className="text-indigo-600 hover:text-indigo-800">
            {project.name}
          </Link>
        </h3>
        <div className="flex items-center gap-2">
          <a
            href="https://drive.google.com/drive/folders/1I1dnQlxyW3g4zftPfFg9YcAClrMj-kMQ?usp=drive_link"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-indigo-600 transition"
            onClick={(e) => e.stopPropagation()}
          >
            <FolderIcon className="w-5 h-5" />
          </a>
          <button 
            onClick={handleFavoriteClick}
            className="text-gray-400 hover:text-yellow-400 transition"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? (
              <StarSolid className="w-5 h-5 text-yellow-400" />
            ) : (
              <StarOutline className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
      
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status].bg} ${statusColors[project.status].text}`}>
          {t(`status.${project.status}`)}
        </span>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[project.priority].bg} ${priorityColors[project.priority].text}`}>
          {t(`priority.${project.priority}`)}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center text-sm text-gray-500">
          <UserGroupIcon className="w-4 h-4 mr-1" />
          {project.teamName}
        </div>
        
        <div className="flex items-center text-sm text-gray-500">
          <CalendarIcon className="w-4 h-4 mr-1" />
          {new Date(project.dueDate).toLocaleDateString()}
        </div>
        
        <div className="flex items-center text-sm">
          <ClockIcon className="w-4 h-4 mr-1" />
          <span className={`
            ${isPastDue ? 'text-red-600' : ''}
            ${isCloseToDue && !isPastDue ? 'text-yellow-600' : ''}
            ${!isCloseToDue && !isPastDue ? 'text-gray-500' : ''}
          `}>
            {isPastDue
              ? t('projects.overdue')
              : daysLeft === 0
                ? t('projects.dueToday')
                : t('projects.dueInDays')}
          </span>
        </div>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Progress</span>
          <span className="text-xs font-medium">{project.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="h-2 rounded-full" 
            style={{ 
              width: `${project.progress}%`,
              backgroundColor: 
                project.progress >= 100 ? '#10b981' : 
                project.progress > 60 ? '#3b82f6' : 
                project.progress > 30 ? '#f59e0b' : 
                '#ef4444'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard; 