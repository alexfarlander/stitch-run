/**
 * MediaList Component
 * 
 * Displays media assets in a table view with columns for details and actions.
 * Requirements: 10.2
 */

'use client';

import * as React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Frame,
} from 'lucide-react';

interface MediaListProps {
  media: StitchMedia[];
  loading?: boolean;
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function MediaRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function MediaList({
  media,
  loading = false,
  onPreview,
  onEdit,
  onDelete,
  onDownload,
  className,
}: MediaListProps) {
  // Show loading skeletons
  if (loading && media.length === 0) {
    return (
      <div className={cn('rounded-lg border', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5).keys()].map((i) => (
              <MediaRowSkeleton key={i} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  
  // Show empty state
  if (!loading && media.length === 0) {
    return (
      <Empty className={className}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ImageIcon />
          </EmptyMedia>
          <EmptyTitle>No media found</EmptyTitle>
          <EmptyDescription>
            Upload your first media asset to get started
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  
  return (
    <div className={cn('rounded-lg border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {media.map((item) => {
            const config = mediaTypeConfig[item.media_type];
            const Icon = config.icon;
            const isVisual = ['image', 'wireframe', 'video', 'style_reference'].includes(item.media_type);
            const thumbnailUrl = item.thumbnail_url || item.url;
            
            return (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onPreview?.(item)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    {/* Thumbnail */}
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-muted">
                      {isVisual ? (
                        <Image
                          src={thumbnailUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Icon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Name and Description */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium" title={item.name}>
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="truncate text-sm text-muted-foreground" title={item.description}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge variant={config.variant}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </TableCell>
                
                <TableCell className="text-sm text-muted-foreground">
                  {formatFileSize(item.file_size)}
                </TableCell>
                
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(item.created_at)}
                </TableCell>
                
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview?.(item);
                      }}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {onDownload && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(item);
                        }}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {onEdit && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {onDelete && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
