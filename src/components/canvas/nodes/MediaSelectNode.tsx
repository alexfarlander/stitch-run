/**
 * MediaSelectNode - Node for selecting media assets from the library
 * 
 * Allows workflows to select media assets with filtering and preview.
 * Outputs media_id, url, name, and metadata for downstream nodes.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useNodeStatus } from '../hooks/useNodeStatus';
import { MediaPicker } from '@/components/media/MediaPicker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { StitchRun } from '@/types/stitch';
import type { StitchMedia, MediaType } from '@/types/media';
import { ImageIcon, Video, Music, FileText, Palette, Frame, Library } from 'lucide-react';
import Image from 'next/image';

// Minimal asset info needed for node display
interface SelectedAsset {
  id: string;
  url: string;
  name: string;
  media_type: MediaType;
}

interface MediaSelectNodeData {
  label?: string;
  mediaType?: MediaType;
  allowMultiple?: boolean;
  // Persisted selection data
  selectedAssets?: SelectedAsset[];
  node_states?: StitchRun['node_states'];
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
}

const mediaTypeConfig: Record<MediaType, { icon: React.ElementType; label: string }> = {
  image: { icon: ImageIcon, label: 'Image' },
  wireframe: { icon: Frame, label: 'Wireframe' },
  video: { icon: Video, label: 'Video' },
  audio: { icon: Music, label: 'Audio' },
  style_reference: { icon: Palette, label: 'Style' },
  document: { icon: FileText, label: 'Document' },
};

export const MediaSelectNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as MediaSelectNodeData;
  const { updateNodeData } = useReactFlow();
  const { status, label } = useNodeStatus(id, nodeData.node_states);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  
  // Local state for the picker modal (before confirming)
  const [tempSelection, setTempSelection] = useState<StitchMedia[]>([]);
  
  // Current persisted selection
  const selectedAssets = nodeData.selectedAssets || [];
  const selectedIds = selectedAssets.map(a => a.id);
  
  // Handle picker selection change
  const handlePickerSelect = useCallback((media: StitchMedia[]) => {
    setTempSelection(media);
  }, []);
  
  // Handle confirm selection
  const handleConfirm = useCallback(() => {
    setIsPickerOpen(false);
    
    // Create minimal asset records for the node data
    const assetsToStore: SelectedAsset[] = tempSelection.map(m => ({
      id: m.id,
      url: m.url || m.thumbnail_url || '',
      name: m.name,
      media_type: m.media_type
    }));
    
    // Update node data using React Flow hook
    updateNodeData(id, {
      selectedAssets: assetsToStore
    });
  }, [id, tempSelection, updateNodeData]);
  
  // Handle opening dialog - initialize temp state
  const handleOpenChange = (open: boolean) => {
    if (open) {
      // We don't have full StitchMedia objects here, just minimal SelectedAsset.
      // The MediaPicker takes IDs, which is sufficient.
      setTempSelection([]);
    }
    setIsPickerOpen(open);
  };
  
  const getMediaTypeIcon = (type: MediaType) => {
    const Icon = mediaTypeConfig[type].icon;
    return <Icon className="h-3 w-3" />;
  };
  
  const hasSelection = selectedAssets.length > 0;
  
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <BaseNode 
        id={id} 
        type="MediaSelect" 
        status={status} 
        label={label}
        onDrop={nodeData.onDrop}
        onDragOver={nodeData.onDragOver}
      >
        <div className="space-y-3">
          {/* Node Label & Badge */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-white">
              {nodeData.label || 'Select Media'}
            </div>
            {nodeData.mediaType && (
              <Badge variant="outline" className="text-[10px] px-1 h-5">
                {getMediaTypeIcon(nodeData.mediaType)}
              </Badge>
            )}
          </div>
          
          {/* Thumbnail Preview */}
          {hasSelection && (
            <div className="relative w-full overflow-hidden rounded-md border border-slate-700 bg-slate-900">
              {selectedAssets.length === 1 ? (
                // Single Item Preview
                <div className="relative aspect-video w-full">
                  {['image', 'wireframe', 'video', 'style_reference'].includes(selectedAssets[0].media_type) ? (
                    <Image
                      src={selectedAssets[0].url}
                      alt={selectedAssets[0].name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      {getMediaTypeIcon(selectedAssets[0].media_type)}
                    </div>
                  )}
                  <div className="absolute bottom-0 w-full bg-black/60 p-1">
                    <p className="truncate text-[10px] text-white px-1">
                      {selectedAssets[0].name}
                    </p>
                  </div>
                </div>
              ) : (
                // Multi Item Stack
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 p-2">
                  <div className="flex -space-x-3">
                    {selectedAssets.slice(0, 3).map((asset, i) => (
                      <div
                        key={asset.id}
                        className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-slate-800 bg-slate-700 z-10"
                      >
                        {['image', 'wireframe', 'video'].includes(asset.media_type) ? (
                          <Image src={asset.url} alt={asset.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            {getMediaTypeIcon(asset.media_type)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">
                    {selectedAssets.length} items selected
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Select Button */}
          <Dialog open={isPickerOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs h-7"
              >
                <Library className="mr-1 h-3 w-3" />
                {hasSelection ? 'Change' : 'Select...'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  Select {nodeData.mediaType ? mediaTypeConfig[nodeData.mediaType].label : 'Media'}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 py-2">
                <MediaPicker
                  mediaType={nodeData.mediaType}
                  allowMultiple={nodeData.allowMultiple}
                  selectedIds={selectedIds}
                  onSelect={handlePickerSelect}
                  className="h-full"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsPickerOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                >
                  Confirm Selection
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </BaseNode>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

MediaSelectNode.displayName = 'MediaSelectNode';
