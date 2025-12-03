/**
 * MediaPicker Component
 * 
 * Embeddable media selection component for workflow integration.
 * Supports filtering by media type and single/multiple selection modes.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import type { StitchMedia, MediaType } from '@/types/media';
import {
  Search,
  Check,
  ImageIcon,
  Video,
  Music,
  FileText,
  Palette,
  Frame,
} from 'lucide-react';
import Image from 'next/image';

interface MediaPickerProps {
  /** Filter to show only specific media type */
  mediaType?: MediaType;
  
  /** Allow selecting multiple items */
  allowMultiple?: boolean;
  
  /** Currently selected media IDs */
  selectedIds?: string[];
  
  /** Callback when selection changes */
  onSelect?: (selected: StitchMedia[]) => void;
  
  /** Additional CSS classes */
  className?: string;
}

const mediaTypeConfig: Record<MediaType, { icon: React.ElementType; label: string }> = {
  image: { icon: ImageIcon, label: 'Image' },
  wireframe: { icon: Frame, label: 'Wireframe' },
  video: { icon: Video, label: 'Video' },
  audio: { icon: Music, label: 'Audio' },
  style_reference: { icon: Palette, label: 'Style' },
  document: { icon: FileText, label: 'Document' },
};

function MediaPickerCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Skeleton className="aspect-video w-full" />
      <div className="p-2">
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

interface MediaPickerCardProps {
  media: StitchMedia;
  selected: boolean;
  onToggle: () => void;
}

function MediaPickerCard({ media, selected, onToggle }: MediaPickerCardProps) {
  const config = mediaTypeConfig[media.media_type];
  const Icon = config.icon;
  const isVisual = ['image', 'wireframe', 'video', 'style_reference'].includes(media.media_type);
  const thumbnailUrl = media.thumbnail_url || media.url;
  
  return (
    <Card
      className={cn(
        'group relative cursor-pointer overflow-hidden p-0 transition-all hover:shadow-md',
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={onToggle}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {isVisual ? (
          <Image
            src={thumbnailUrl}
            alt={media.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 200px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Icon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Type Badge */}
        <div className="absolute left-1.5 top-1.5">
          <Badge variant="secondary" className="text-xs shadow-sm">
            <Icon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
        </div>
        
        {/* Selection Indicator */}
        {selected && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Check className="h-6 w-6" />
            </div>
          </div>
        )}
      </div>
      
      {/* Card Content */}
      <div className="p-2">
        <p className="truncate text-sm font-medium" title={media.name}>
          {media.name}
        </p>
      </div>
    </Card>
  );
}

export function MediaPicker({
  mediaType,
  allowMultiple = false,
  selectedIds = [],
  onSelect,
  className,
}: MediaPickerProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selection, setSelection] = React.useState<Set<string>>(new Set(selectedIds));
  
  // Build filter based on props
  const filter = React.useMemo(() => {
    const f: any = {};
    if (mediaType) {
      f.media_type = mediaType;
    }
    if (searchQuery.trim()) {
      f.search = searchQuery.trim();
    }
    return f;
  }, [mediaType, searchQuery]);
  
  // Load media with filter
  const { media, loading, error, refresh } = useMediaLibrary(filter, true);
  
  // Sync selection with selectedIds prop
  React.useEffect(() => {
    setSelection(new Set(selectedIds));
  }, [selectedIds]);
  
  // Handle toggle selection
  const handleToggle = React.useCallback((mediaItem: StitchMedia) => {
    setSelection(prev => {
      const newSelection = new Set(prev);
      
      if (newSelection.has(mediaItem.id)) {
        // Deselect
        newSelection.delete(mediaItem.id);
      } else {
        // Select
        if (allowMultiple) {
          newSelection.add(mediaItem.id);
        } else {
          // Single selection: clear others
          newSelection.clear();
          newSelection.add(mediaItem.id);
        }
      }
      
      // Trigger callback with selected media objects
      if (onSelect) {
        const selectedMedia = media.filter(m => newSelection.has(m.id));
        onSelect(selectedMedia);
      }
      
      return newSelection;
    });
  }, [allowMultiple, media, onSelect]);
  
  // Handle clear selection
  const handleClearSelection = React.useCallback(() => {
    setSelection(new Set());
    if (onSelect) {
      onSelect([]);
    }
  }, [onSelect]);
  
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Search and Controls */}
      <div className="space-y-3">
        {/* Search */}
        <div className="space-y-1.5">
          <Label htmlFor="media-search" className="text-xs">
            Search Media
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="media-search"
              placeholder="Search by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
        </div>
        
        {/* Selection Info */}
        {selection.size > 0 && (
          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              {selection.size} selected
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearSelection}
              className="h-7 text-xs"
            >
              Clear
            </Button>
          </div>
        )}
      </div>
      
      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <p>{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            className="mt-2 h-7 text-xs"
          >
            Retry
          </Button>
        </div>
      )}
      
      {/* Media Grid */}
      <div className="max-h-[500px] overflow-y-auto rounded-lg border bg-muted/30 p-3">
        {/* Loading State */}
        {loading && media.length === 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <MediaPickerCardSkeleton key={i} />
            ))}
          </div>
        )}
        
        {/* Empty State */}
        {!loading && media.length === 0 && (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ImageIcon />
              </EmptyMedia>
              <EmptyTitle className="text-base">No media found</EmptyTitle>
              <EmptyDescription className="text-sm">
                {mediaType
                  ? `No ${mediaType} assets available`
                  : 'Upload media to get started'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        
        {/* Media Grid */}
        {media.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {media.map((item) => (
              <MediaPickerCard
                key={item.id}
                media={item}
                selected={selection.has(item.id)}
                onToggle={() => handleToggle(item)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Helper Text */}
      <p className="text-xs text-muted-foreground">
        {allowMultiple
          ? 'Click to select multiple items'
          : 'Click to select an item'}
      </p>
    </div>
  );
}
