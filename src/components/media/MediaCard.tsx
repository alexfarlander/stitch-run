/**
 * MediaCard Component
 * 
 * Displays a media asset as a card with thumbnail, type badge, and quick actions.
 * Requirements: 1.2, 10.1, 10.3, 10.4
 */

'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StitchMedia, MediaType } from '@/types/media';
import { 
  Download, 
  Eye, 
  Pencil, 
  Trash2, 
  FileText, 
  Music, 
  Video, 
  Image as ImageIcon,
  Palette,
  Frame
} from 'lucide-react';

interface MediaCardProps {
  media: StitchMedia;
  onPreview?: (media: StitchMedia) => void;
  onEdit?: (media: StitchMedia) => void;
  onDelete?: (media: StitchMedia) => void;
  onDownload?: (media: StitchMedia) => void;
  className?: string;
}

const mediaTypeConfig: Record<MediaType, { icon: React.ElementType; label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  image: { icon: ImageIcon, label: 'Image', variant: 'default' },
  wireframe: { icon: Frame, label: 'Wireframe', variant: 'secondary' },
  video: { icon: Video, label: 'Video', variant: 'default' },
  audio: { icon: Music, label: 'Audio', variant: 'outline' },
  style_reference: { icon: Palette, label: 'Style', variant: 'secondary' },
  document: { icon: FileText, label: 'Document', variant: 'outline' },
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

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MediaCard({
  media,
  onPreview,
  onEdit,
  onDelete,
  onDownload,
  className,
}: MediaCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const config = mediaTypeConfig[media.media_type];
  const Icon = config.icon;
  
  const isVisual = ['image', 'wireframe', 'video', 'style_reference'].includes(media.media_type);
  const thumbnailUrl = media.thumbnail_url || media.url;
  
  return (
    <Card
      className={cn(
        'group relative overflow-hidden p-0 transition-all hover:shadow-lg cursor-pointer',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onPreview?.(media)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {isVisual ? (
          <Image
            src={thumbnailUrl}
            alt={media.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Icon className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        
        {/* Type Badge */}
        <div className="absolute left-2 top-2">
          <Badge variant={config.variant} className="shadow-sm">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
        
        {/* Duration Badge (for video/audio) */}
        {media.duration_seconds && (
          <div className="absolute right-2 top-2">
            <Badge variant="secondary" className="shadow-sm">
              {formatDuration(media.duration_seconds)}
            </Badge>
          </div>
        )}
        
        {/* Quick Actions Overlay */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 transition-opacity">
            <Button
              size="icon-sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onPreview?.(media);
              }}
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            {onDownload && (
              <Button
                size="icon-sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(media);
                }}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            
            {onEdit && (
              <Button
                size="icon-sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(media);
                }}
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            
            {onDelete && (
              <Button
                size="icon-sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(media);
                }}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Card Content */}
      <div className="p-3">
        <h3 className="truncate text-sm font-medium" title={media.name}>
          {media.name}
        </h3>
        
        {media.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {media.description}
          </p>
        )}
        
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatFileSize(media.file_size)}</span>
          {media.dimensions && (
            <span>{media.dimensions.width} × {media.dimensions.height}</span>
          )}
        </div>
        
        {/* Tags */}
        {media.tags && media.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {media.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {media.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{media.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
