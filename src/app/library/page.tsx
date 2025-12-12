/**
 * Media Library Page
 * 
 * Centralized asset management interface for browsing, uploading, and managing media.
 * Requirements: 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.5, 3.1, 3.2, 3.3
 */

'use client';

import * as React from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { MediaGrid } from '@/components/media/MediaGrid';
import { MediaList } from '@/components/media/MediaList';
import { MediaUploader } from '@/components/media/MediaUploader';
import { MediaPreview } from '@/components/media/MediaPreview';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import type { StitchMedia, MediaType } from '@/types/media';
import {
  Upload,
  Grid3x3,
  List,
  Search,
  X,
  Copy,
  Download,
  Pencil,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

type ViewMode = 'grid' | 'list';

const MEDIA_TYPES: { value: MediaType; label: string }[] = [
  { value: 'image', label: 'Images' },
  { value: 'wireframe', label: 'Wireframes' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'style_reference', label: 'Style References' },
  { value: 'document', label: 'Documents' },
];

export default function MediaLibraryPage() {
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [previewMedia, setPreviewMedia] = React.useState<StitchMedia | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingMedia, setEditingMedia] = React.useState<StitchMedia | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deletingMedia, setDeletingMedia] = React.useState<StitchMedia | null>(null);
  
  // Filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<MediaType | 'all'>('all');
  const [tagInput, setTagInput] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  
  // Media library hook
  const {
    media,
    loading,
    error,
    filter,
    upload,
    remove,
    update,
    download,
    refresh,
    setFilter,
  } = useMediaLibrary({}, true);
  
  // Apply filters
  const handleApplyFilters = React.useCallback(() => {
    const newFilter: any = {};
    
    if (selectedType !== 'all') {
      newFilter.media_type = selectedType;
    }
    
    if (searchQuery.trim()) {
      newFilter.search = searchQuery.trim();
    }
    
    if (selectedTags.length > 0) {
      newFilter.tags = selectedTags;
    }
    
    setFilter(newFilter);
  }, [selectedType, searchQuery, selectedTags, setFilter]);
  
  // Apply filters when they change
  React.useEffect(() => {
    handleApplyFilters();
  }, [handleApplyFilters]);
  
  // Handle upload
  const handleUpload = async (input: any) => {
    try {
      await upload(input);
      toast.success('Media uploaded successfully');
      setUploadDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };
  
  // Handle download
  const handleDownload = async (media: StitchMedia) => {
    try {
      const url = await download(media.id);
      // Open in new tab
      window.open(url, '_blank');
      toast.success('Download started');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  };
  
  // Handle copy URL
  const handleCopyUrl = async (media: StitchMedia) => {
    try {
      await navigator.clipboard.writeText(media.url);
      toast.success('URL copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy URL');
    }
  };
  
  // Handle edit
  const handleEdit = (media: StitchMedia) => {
    setEditingMedia(media);
    setEditDialogOpen(true);
  };
  
  // Handle save edit
  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMedia) return;
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const tagsString = formData.get('tags') as string;
    const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);
    
    try {
      await update(editingMedia.id, {
        name,
        description: description || undefined,
        tags,
      });
      toast.success('Media updated successfully');
      setEditDialogOpen(false);
      setEditingMedia(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };
  
  // Handle delete
  const handleDelete = (media: StitchMedia) => {
    setDeletingMedia(media);
    setDeleteConfirmOpen(true);
  };
  
  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingMedia) return;
    
    try {
      await remove(deletingMedia.id);
      toast.success('Media deleted successfully');
      setDeleteConfirmOpen(false);
      setDeletingMedia(null);
      
      // Close preview if it's the deleted item
      if (previewMedia?.id === deletingMedia.id) {
        setPreviewMedia(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };
  
  // Handle add tag
  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
      setTagInput('');
    }
  };
  
  // Handle remove tag
  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };
  
  return (
    <div className="flex h-screen flex-col">
      <Navigation />
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Media Library</h1>
              <p className="text-sm text-muted-foreground">
                Manage your media assets
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex rounded-lg border">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Upload button */}
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Filter Sidebar */}
        <div className="w-64 border-r bg-muted/30 p-4">
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 font-semibold">Filters</h3>
              
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search media..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <Separator className="my-4" />
              
              {/* Media Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Media Type</Label>
                <Select
                  value={selectedType}
                  onValueChange={(value) => setSelectedType(value as MediaType | 'all')}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {MEDIA_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Separator className="my-4" />
              
              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Filter by Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Active filters summary */}
            {(selectedType !== 'all' || searchQuery || selectedTags.length > 0) && (
              <>
                <Separator />
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Active Filters</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedType('all');
                        setSearchQuery('');
                        setSelectedTags([]);
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {media.length} result{media.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {/* Error state */}
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refresh}
                  className="ml-auto"
                >
                  Retry
                </Button>
              </div>
            )}
            
            {/* Media display */}
            {viewMode === 'grid' ? (
              <MediaGrid
                media={media}
                loading={loading}
                onPreview={setPreviewMedia}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDownload={handleDownload}
              />
            ) : (
              <MediaList
                media={media}
                loading={loading}
                onPreview={setPreviewMedia}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDownload={handleDownload}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
            <DialogDescription>
              Upload images, videos, audio, or documents to your media library
            </DialogDescription>
          </DialogHeader>
          
          <MediaUploader onUpload={handleUpload} />
        </DialogContent>
      </Dialog>
      
      {/* Preview Modal */}
      <MediaPreview
        media={previewMedia}
        open={!!previewMedia}
        onOpenChange={(open) => !open && setPreviewMedia(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDownload={handleDownload}
        onCopyUrl={handleCopyUrl}
      />
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
            <DialogDescription>
              Update media details and metadata
            </DialogDescription>
          </DialogHeader>
          
          {editingMedia && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editingMedia.name}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  name="description"
                  defaultValue={editingMedia.description || ''}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                <Input
                  id="edit-tags"
                  name="tags"
                  defaultValue={editingMedia.tags.join(', ')}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this media? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deletingMedia && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <p className="font-medium">{deletingMedia.name}</p>
                <p className="text-sm text-muted-foreground">
                  {deletingMedia.media_type}
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
