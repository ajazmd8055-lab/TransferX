import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Code,
  File,
} from 'lucide-react';
import { getFileCategory } from '../utils/formatters';

interface FileIconProps {
  mimeType: string;
  filename: string;
  className?: string;
  size?: number;
}

export const FileIcon: React.FC<FileIconProps> = ({
  mimeType,
  filename,
  className = 'w-6 h-6',
  size = 24,
}) => {
  const category = getFileCategory(mimeType, filename);

  switch (category) {
    case 'image':
      return <ImageIcon size={size} className={`text-emerald-600 ${className}`} />;
    case 'video':
      return <Film size={size} className={`text-purple-600 ${className}`} />;
    case 'audio':
      return <Music size={size} className={`text-pink-600 ${className}`} />;
    case 'document':
      return <FileText size={size} className={`text-blue-600 ${className}`} />;
    case 'archive':
      return <Archive size={size} className={`text-amber-600 ${className}`} />;
    case 'code':
      return <Code size={size} className={`text-indigo-600 ${className}`} />;
    default:
      return <File size={size} className={`text-slate-600 ${className}`} />;
  }
};
