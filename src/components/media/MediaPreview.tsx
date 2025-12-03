/**
 * MediaPreview Component
 * 
 * Displays type-specific viewers for media assets in a modal.
 * Requirements: 2.1, 2.5
 */

'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { StitchMedia, MediaType } from '@/types/media';
import {
  Download,
  Pencil,
  Trash2,
  Copy,
  FileText,
  Music,
  Video,
  Image as ImageIcon,
  Palette,
  Frame,
  X,
} from 'lucide-react';

interface MediaPreviewProps {
  media: StitchMedia | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (media: StitchMedia) => void;
  onDelete?: (media: StitchMedia) => void;
  onDownload?: (media: StitchMedia) => void;
  onCopyUrl?: (media: StitchMedia) => void;
}

const mediaTypeConfig: Record<MediaType, { icon: React.ElementType; label: string }> = {
  image: { icon: ImageIcon, label: 'Image' },
  wireframe: { icon: Frame, label: 'Wireframe' },
  video: { icon: Video, label: 'Video' },
  audio: { icon: Music, label: 'Audio' },
  style_reference: { icon: Palette, label: 'Style Reference' },
  document: { icon: FileText, label: 'Document' },
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
}

function ImageViewer({ media }: { media: StitchMedia }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
      <Image
        src={media.url}
        alt={media.name}
        fill
        className="object-contain"
        sizes="(max-width: 768px) 100vw, 80vw"
        priority
      />
    </div>
  );
}

function VideoViewer({ media }: { media: StitchMedia }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      <video
        src={media.url}
        controls
        className="h-full w-full"
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

function AudioViewer({ media }: { media: StitchMedia }) {
  return (
    <div className="flex items-center justify-center rounded-lg bg-muted p-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Music className="h-24 w-24 text-muted-foreground" />
        </div>
        <audio
          src={media.url}
          controls
          className="w-full"
          preload="metadata"
        >
          Your browser does not support the audio tag.
        </audio>
      </div>
    </div>
  );
}

function DocumentViewer({ media }: { media: StitchMedia }) {
  const isPDF = media.mime_type === 'application/pdf';
  
  return (
    <div className="flex items-center justify-center rounded-lg bg-muted p-12">
      <div className="text-center">
        <FileText className="mx-auto mb-4 h-24 w-24 text-muted-foreground" />
        <p className="mb-4 text-lg font-medium">{media.name}</p>
        {isPDF && (
          <p className="mb-4 text-sm text-muted-foreground">
            PDF preview not available
          </p>
        )}
        <Button asChild>
          <a href={media.url} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" />
            Download to View
          </a>
        </Button>
      </div>
    </div>
  );
}

export function MediaPreview({
  media,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onDownload,
  onCopyUrl,
}: MediaPreviewProps) {
  if (!media) return null;
  
  const config = mediaTypeConfig[media.media_type];
  const Icon = config.icon;
  
  const renderViewer = () => {
    switch (media.media_type) {
      case 'image':
      case 'wireframe':
      case 'style_reference':
        return <ImageViewer media={media} />;
      case 'video':
        return <VideoViewer media={media} />;
      case 'audio':
        return <AudioViewer media={media} />;
      case 'document':
        return <DocumentViewer media={media} />;
      default:
        return null;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {media.name}
              </DialogTitle>
              {media.description && (
                <DialogDescription className="mt-2">
                  {media.description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        
        {/* Viewer */}
        <div className="my-4">
          {renderViewer()}
        </div>
        
        {/* Metadata */}
        <div className="space-y-4">
          <Separator />
          
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Type</p>
              <Badge variant="outline" className="mt-1">
                <Icon className="mr-1 h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            
            <div>
              <p className="text-muted-foreground">Size</p>
              <p className="mt-1 font-medium">{formatFileSize(media.file_size)}</p>
            </div>
            
            {media.dimensions && (
              <div>
                <p className="text-muted-foreground">Dimensions</p>
                <p className="mt-1 font-medium">
                  {media.dimensions.width} × {media.dimensions.height}
                </p>
              </div>
            )}
            
            {media.duration_seconds && (
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="mt-1 font-medium">
                  {Math.floor(media.duration_seconds / 60)}:
                  {Math.floor(media.duration_seconds % 60).toString().padStart(2, '0')}
                </p>
              </div>
            )}
            
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="mt-1 font-medium">{formatDate(media.created_at)}</p>
            </div>
            
            {media.updated_at !== media.created_at && (
              <div>
                <p className="text-muted-foreground">Updated</p>
                <p className="mt-1 font-medium">{formatDate(media.updated_at)}</p>
              </div>
            )}
          </div>
          
          {/* Tags */}
          {media.tags && media.tags.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Tags</p>
              <div className="flex flex-wrap gap-1">
                {media.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Generation Metadata */}
          {media.metadata && Object.keys(media.metadata).length > 0 && (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Metadata</p>
              <div className="rounded-lg bg-muted p-3">
                <pre className="text-xs">
                  {JSON.stringify(media.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          <Separator />
          
          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {onCopyUrl && (
              <Button
                variant="outline"
                onClick={() => onCopyUrl(media)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </Button>
            )}
            
            {onDownload && (
              <Button
                variant="outline"
                onClick={() => onDownload(media)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
            
            {onEdit && (
              <Button
                variant="outline"
                onClick={() => {
                  onEdit(media);
                  onOpenChange(false);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete(media);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
