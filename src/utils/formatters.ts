export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes < 0 || isNaN(bytes)) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeIndex = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(dm))} ${sizes[safeIndex]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0 || isNaN(bytesPerSecond)) return '0 KB/s';
  if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return 'Calculating...';
  if (seconds < 60) return `${Math.ceil(seconds)}s remaining`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = Math.ceil(seconds % 60);
  if (minutes < 60) {
    return `${minutes}m ${remainingSecs}s remaining`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m remaining`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 1) return '< 1s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function getFileCategory(mimeType: string, filename: string): 'image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'other' {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif'].includes(ext)) {
    return 'image';
  }
  if (mimeType.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv'].includes(ext)) {
    return 'video';
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) {
    return 'audio';
  }
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    mimeType.includes('sheet') ||
    mimeType.includes('presentation') ||
    mimeType.includes('text') ||
    ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'md', 'csv'].includes(ext)
  ) {
    return 'document';
  }
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z') ||
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'].includes(ext)
  ) {
    return 'archive';
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'html', 'css', 'json', 'yaml', 'yml', 'go', 'rs'].includes(ext)) {
    return 'code';
  }
  return 'other';
}
