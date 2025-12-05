/**
 * MediaUploader Component
 * 
 * Provides drag-drop and file input interface for uploading media assets.
 * Requirements: 1.2, 10.4
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { MediaType, MediaUploadInput } from '@/types/media';
import { Upload, X, FileIcon, CheckCircle2, AlertCircle } from 'lucide-react';

interface MediaUploaderProps {
  onUpload: (input: MediaUploadInput) => Promise<void>;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  className?: string;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  fileName?: string;
}

const DEFAULT_ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'application/pdf',
];

const DEFAULT_MAX_SIZE_MB = 50;

function inferMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

export function MediaUploader({
  onUpload,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  className,
}: MediaUploaderProps) {
  const [uploadState, setUploadState] = React.useState<UploadState>({
    status: 'idle',
    progress: 0,
  });
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }
    
    // Check file size
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }
    
    return null;
  };
  
  const handleUpload = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadState({
        status: 'error',
        progress: 0,
        error,
        fileName: file.name,
      });
      return;
    }
    
    setUploadState({
      status: 'uploading',
      progress: 0,
      fileName: file.name,
    });
    
    try {
      // Simulate progress (since we don't have real upload progress)
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }));
      }, 200);
      
      const mediaType = inferMediaType(file.type);
      
      await onUpload({
        file,
        name: file.name,
        media_type: mediaType,
        tags: [],
        metadata: {},
      });
      
      clearInterval(progressInterval);
      
      setUploadState({
        status: 'success',
        progress: 100,
        fileName: file.name,
      });
      
      // Reset after 2 seconds
      setTimeout(() => {
        setUploadState({
          status: 'idle',
          progress: 0,
        });
      }, 2000);
    } catch (_err) {
      setUploadState({
        status: 'error',
        progress: 0,
        error: err instanceof Error ? err.message : 'Upload failed',
        fileName: file.name,
      });
    }
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };
  
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  };
  
  const handleReset = () => {
    setUploadState({
      status: 'idle',
      progress: 0,
    });
  };
  
  return (
    <div className={cn('w-full', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {uploadState.status === 'idle' && (
        <div
          className={cn(
            'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">
            {isDragging ? 'Drop file here' : 'Upload media'}
          </h3>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Drag and drop a file here, or click to browse
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
          >
            Choose File
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Max size: {maxSizeMB}MB
          </p>
        </div>
      )}
      
      {uploadState.status === 'uploading' && (
        <div className="rounded-lg border p-6">
          <div className="flex items-start gap-3">
            <FileIcon className="h-10 w-10 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <p className="mb-2 font-medium">{uploadState.fileName}</p>
              <Progress value={uploadState.progress} className="mb-2" />
              <p className="text-sm text-muted-foreground">
                Uploading... {uploadState.progress}%
              </p>
            </div>
          </div>
        </div>
      )}
      
      {uploadState.status === 'success' && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-10 w-10 flex-shrink-0 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <p className="mb-1 font-medium text-green-900 dark:text-green-100">
                Upload successful
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                {uploadState.fileName} has been uploaded
              </p>
            </div>
          </div>
        </div>
      )}
      
      {uploadState.status === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-10 w-10 flex-shrink-0 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <p className="mb-1 font-medium text-red-900 dark:text-red-100">
                Upload failed
              </p>
              <p className="mb-3 text-sm text-red-700 dark:text-red-300">
                {uploadState.error}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
              >
                Try Again
              </Button>
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={handleReset}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
