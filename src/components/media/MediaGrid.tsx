/**
 * MediaGrid Component
 * 
 * Displays media assets in a responsive grid layout.
 * Requirements: 10.1, 10.3
 */

'use client';

import * as React from 'react';
import { MediaCard } from './MediaCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import type { StitchMedia } from '@/types/media';
import { ImageIcon } from 'lucide-react';

interface MediaGridProps {
  media: StitchMedia[];
  loading?: boolean;
  onPreview?: (media: StitchMedia) => void;
  onEdit?: (media: StitchMedia) => void;
  onDelete?: (media: StitchMedia) => void;
  onDownload?: (media: StitchMedia) => void;
  className?: string;
}

function MediaCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Skeleton className="aspect-video w-full" />
      <div className="p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-full" />
        <Skeleton className="mt-1 h-3 w-2/3" />
        <div className="mt-2 flex gap-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

export function MediaGrid({
  media,
  loading = false,
  onPreview,
  onEdit,
  onDelete,
  onDownload,
  className,
}: MediaGridProps) {
  // Show loading skeletons
  if (loading && media.length === 0) {
    return (
      <div
        className={cn(
          'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          className
        )}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
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
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
    >
      {media.map((item) => (
        <MediaCard
          key={item.id}
          media={item}
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
          onDownload={onDownload}
        />
      ))}
    </div>
  );
}
