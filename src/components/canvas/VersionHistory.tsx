/**
 * VersionHistory - Display and manage flow versions
 * 
 * Features:
 * - Display list of versions with timestamps and commit messages
 * - Allow viewing historical versions
 * - Allow reverting to previous version
 * - Show current version indicator
 * 
 * Requirements: 1.4, 5.3
 */

'use client';

import { useState, useEffect } from 'react';
import { Clock, GitBranch, Check, Eye, RotateCcw, Loader2 } from 'lucide-react';
import { FlowVersion, FlowVersionMetadata, listVersions, createVersion, getVersion } from '@/lib/canvas/version-manager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface VersionHistoryProps {
  flowId: string;
  currentVersionId?: string | null;
  onViewVersion?: (version: FlowVersion) => void;
  onRevertVersion?: (version: FlowVersion) => void;
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Format full timestamp
 */
function formatFullTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Version list item component
 */
function VersionItem({
  version,
  isCurrent,
  onView,
  onRevert,
}: {
  version: FlowVersionMetadata;
  isCurrent: boolean;
  onView: () => void;
  onRevert: () => void;
}) {
  return (
    <div
      className={`
        group relative flex items-start gap-3 p-4 rounded-lg border transition-all
        ${isCurrent 
          ? 'bg-cyan-500/10 border-cyan-500/30' 
          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
        }
      `}
    >
      {/* Timeline dot */}
      <div className="relative flex-shrink-0 mt-1">
        <div
          className={`
            w-3 h-3 rounded-full border-2
            ${isCurrent 
              ? 'bg-cyan-400 border-cyan-400' 
              : 'bg-slate-700 border-slate-600'
            }
          `}
        />
        {/* Timeline line */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-px h-full bg-slate-800" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-mono text-slate-300">
              {version.id.slice(0, 8)}
            </span>
            {isCurrent && (
              <Badge variant="default" className="bg-cyan-500 text-white">
                <Check className="w-3 h-3" />
                Current
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onView}
              title="View this version"
            >
              <Eye className="w-4 h-4" />
            </Button>
            {!isCurrent && (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={onRevert}
                title="Revert to this version"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Commit message */}
        <p className="text-sm text-slate-300 mb-2">
          {version.commit_message || 'No commit message'}
        </p>

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          <span title={formatFullTime(version.created_at)}>
            {formatRelativeTime(version.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Main VersionHistory component
 */
export function VersionHistory({
  flowId,
  currentVersionId,
  onViewVersion,
  onRevertVersion,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<FlowVersionMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<FlowVersion | null>(null);
  const [reverting, setReverting] = useState(false);

  // Load versions
  useEffect(() => {
    async function loadVersions() {
      try {
        setLoading(true);
        setError(null);
        const data = await listVersions(flowId);
        setVersions(data);
      } catch (err) {
        console.error('Failed to load versions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load versions');
      } finally {
        setLoading(false);
      }
    }

    loadVersions();
  }, [flowId]);

  // Handle view version - fetch full version data
  const handleViewVersion = async (versionMetadata: FlowVersionMetadata) => {
    if (!onViewVersion) return;
    
    try {
      const fullVersion = await getVersion(versionMetadata.id);
      if (fullVersion && onViewVersion) {
        onViewVersion(fullVersion);
      }
    } catch (err) {
      console.error('Failed to load version:', err);
      setError(err instanceof Error ? err.message : 'Failed to load version');
    }
  };

  // Handle revert version - fetch full version data and show confirmation dialog
  const handleRevertClick = async (versionMetadata: FlowVersionMetadata) => {
    try {
      const fullVersion = await getVersion(versionMetadata.id);
      if (fullVersion) {
        setSelectedVersion(fullVersion);
        setRevertDialogOpen(true);
      }
    } catch (err) {
      console.error('Failed to load version:', err);
      setError(err instanceof Error ? err.message : 'Failed to load version');
    }
  };

  // Confirm revert
  const handleConfirmRevert = async () => {
    if (!selectedVersion) return;

    try {
      setReverting(true);
      
      // selectedVersion already contains the full version data (including visual_graph)
      // It was fetched in handleRevertClick before opening the dialog
      
      // Create a new version with the historical visual graph
      await createVersion(
        flowId,
        selectedVersion.visual_graph,
        `Reverted to version ${selectedVersion.id.slice(0, 8)}`
      );

      // Reload versions
      const data = await listVersions(flowId);
      setVersions(data);

      // Call callback if provided
      if (onRevertVersion) {
        onRevertVersion(selectedVersion);
      }

      setRevertDialogOpen(false);
      setSelectedVersion(null);
    } catch (err) {
      console.error('Failed to revert version:', err);
      setError(err instanceof Error ? err.message : 'Failed to revert version');
    } finally {
      setReverting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading version history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-sm text-red-400 mb-2">Failed to load versions</p>
            <p className="text-xs text-slate-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (versions.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200">Version History</CardTitle>
          <CardDescription>No versions yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">
            Save your first version to start tracking changes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Version History
          </CardTitle>
          <CardDescription>
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-0">
              {versions.map((version) => (
                <VersionItem
                  key={version.id}
                  version={version}
                  isCurrent={version.id === currentVersionId}
                  onView={() => handleViewVersion(version)}
                  onRevert={() => handleRevertClick(version)}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Revert confirmation dialog */}
      <Dialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-200">Revert to Previous Version?</DialogTitle>
            <DialogDescription className="text-slate-400">
              This will create a new version with the content from version{' '}
              <span className="font-mono text-cyan-400">
                {selectedVersion?.id.slice(0, 8)}
              </span>
              . Your current work will not be lost.
            </DialogDescription>
          </DialogHeader>

          {selectedVersion && (
            <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800">
              <p className="text-sm text-slate-300 mb-2">
                {selectedVersion.commit_message || 'No commit message'}
              </p>
              <p className="text-xs text-slate-500">
                Created {formatFullTime(selectedVersion.created_at)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevertDialogOpen(false)}
              disabled={reverting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRevert}
              disabled={reverting}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {reverting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reverting...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Revert
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
