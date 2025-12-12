/**
 * MermaidImportExport Component
 * 
 * Provides UI for importing workflows from Mermaid syntax and exporting to Mermaid.
 * Supports optional nodeConfigs and edgeMappings for hybrid Mermaid + JSON approach.
 * 
 * Features:
 * - Import from Mermaid dialog with preview
 * - Export to Mermaid button
 * - Support for optional nodeConfigs and edgeMappings
 * - Visual preview of generated canvas before import
 * 
 * Requirements: 6.1, 6.3, 7.1, 7.2, 7.3, 7.4
 */

'use client';

import { useState, useCallback } from 'react';
import { Download, Upload, Eye, Code, Settings, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { VisualGraph } from '@/types/canvas-schema';
import { NodeConfig, WorkflowCreationRequest } from '@/types/workflow-creation';
import { mermaidToCanvas } from '@/lib/canvas/mermaid-parser';
import type { EdgeMapping } from '@/types/canvas-schema';
import { canvasToMermaid } from '@/lib/canvas/mermaid-generator';

interface MermaidImportExportProps {
  /**
   * Current visual graph (for export)
   */
  currentGraph?: VisualGraph;
  
  /**
   * Callback when import is confirmed
   * Receives the generated visual graph
   */
  onImport?: (graph: VisualGraph) => void;
  
  /**
   * Callback when export is triggered
   * Receives the generated Mermaid syntax
   */
  onExport?: (mermaid: string) => void;
  
  /**
   * Whether there are unsaved changes in the current canvas
   * If true, user will be warned before importing
   */
  hasUnsavedChanges?: boolean;
  
  /**
   * Callback to save current changes before importing
   * Called when user chooses to save before import
   */
  onSaveBeforeImport?: () => Promise<void>;
}

export function MermaidImportExport({
  currentGraph,
  onImport,
  onExport,
  hasUnsavedChanges = false,
  onSaveBeforeImport,
}: MermaidImportExportProps) {
  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [mermaidInput, setMermaidInput] = useState('');
  const [nodeConfigsInput, setNodeConfigsInput] = useState('');
  const [edgeMappingsInput, setEdgeMappingsInput] = useState('');
  const [previewGraph, setPreviewGraph] = useState<VisualGraph | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Export dialog state
  const [exportOpen, setExportOpen] = useState(false);
  const [exportedMermaid, setExportedMermaid] = useState('');
  
  /**
   * Handle Mermaid preview generation
   * Parses Mermaid + optional configs and generates preview
   */
  const handlePreview = useCallback(() => {
    setParseError(null);
    setPreviewGraph(null);
    
    try {
      // Parse optional JSON configs
      let nodeConfigs: Record<string, NodeConfig> | undefined;
      let edgeMappings: Record<string, EdgeMapping> | undefined;
      
      if (nodeConfigsInput.trim()) {
        try {
          nodeConfigs = JSON.parse(nodeConfigsInput);
        } catch (e) {
          throw new Error(`Invalid nodeConfigs JSON: ${e instanceof Error ? e.message : 'Parse error'}`);
        }
      }
      
      if (edgeMappingsInput.trim()) {
        try {
          edgeMappings = JSON.parse(edgeMappingsInput) as Record<string, EdgeMapping>;
        } catch (e) {
          throw new Error(`Invalid edgeMappings JSON: ${e instanceof Error ? e.message : 'Parse error'}`);
        }
      }
      
      // Parse Mermaid to visual graph
      const graph = mermaidToCanvas(mermaidInput, nodeConfigs, edgeMappings);
      setPreviewGraph(graph);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse Mermaid');
    }
  }, [mermaidInput, nodeConfigsInput, edgeMappingsInput]);
  
  /**
   * Handle import button click
   * Checks for unsaved changes before proceeding
   */
  const handleImportClick = useCallback(() => {
    if (!previewGraph) return;
    
    // Check for unsaved changes
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      handleImportConfirm();
    }
  }, [previewGraph, hasUnsavedChanges]);
  
  /**
   * Handle import confirmation (after warning check)
   * Calls onImport callback with generated graph
   */
  const handleImportConfirm = useCallback(() => {
    if (previewGraph && onImport) {
      onImport(previewGraph);
      setImportOpen(false);
      setShowUnsavedWarning(false);
      
      // Reset state
      setMermaidInput('');
      setNodeConfigsInput('');
      setEdgeMappingsInput('');
      setPreviewGraph(null);
      setParseError(null);
    }
  }, [previewGraph, onImport]);
  
  /**
   * Handle save and import
   * Saves current changes then imports new graph
   */
  const handleSaveAndImport = useCallback(async () => {
    if (!onSaveBeforeImport) {
      // If no save callback provided, just import
      handleImportConfirm();
      return;
    }
    
    setSaving(true);
    try {
      await onSaveBeforeImport();
      handleImportConfirm();
    } catch (error) {
      console.error('Failed to save before import:', error);
      setParseError('Failed to save current changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [onSaveBeforeImport, handleImportConfirm]);
  
  /**
   * Handle discard and import
   * Discards current changes and imports new graph
   */
  const handleDiscardAndImport = useCallback(() => {
    setShowUnsavedWarning(false);
    handleImportConfirm();
  }, [handleImportConfirm]);
  
  /**
   * Handle export generation
   * Converts current graph to Mermaid syntax
   */
  const handleExport = useCallback(() => {
    if (!currentGraph) return;
    
    try {
      const mermaid = canvasToMermaid(currentGraph);
      setExportedMermaid(mermaid);
      setExportOpen(true);
      
      if (onExport) {
        onExport(mermaid);
      }
    } catch (error) {
      console.error('Failed to export to Mermaid:', error);
    }
  }, [currentGraph, onExport]);
  
  /**
   * Copy exported Mermaid to clipboard
   */
  const handleCopyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(exportedMermaid);
  }, [exportedMermaid]);
  
  return (
    <div className="flex items-center gap-2">
      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="bg-slate-900/90 border-slate-700 hover:border-cyan-500"
          >
            <Upload className="w-4 h-4" />
            Import from Mermaid
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-200">Import from Mermaid</DialogTitle>
            <DialogDescription className="text-slate-400">
              Paste Mermaid flowchart syntax and optionally provide node configurations and edge mappings.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="mermaid" className="w-full">
            <TabsList className="bg-slate-800">
              <TabsTrigger value="mermaid" className="data-[state=active]:bg-slate-700">
                <Code className="w-4 h-4" />
                Mermaid
              </TabsTrigger>
              <TabsTrigger value="configs" className="data-[state=active]:bg-slate-700">
                <Settings className="w-4 h-4" />
                Node Configs (Optional)
              </TabsTrigger>
              <TabsTrigger value="mappings" className="data-[state=active]:bg-slate-700">
                <Settings className="w-4 h-4" />
                Edge Mappings (Optional)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="mermaid" className="space-y-2">
              <div className="text-sm text-slate-400">
                Enter Mermaid flowchart syntax. Node types and worker types will be inferred from labels.
              </div>
              <Textarea
                value={mermaidInput}
                onChange={(e) => setMermaidInput(e.target.value)}
                placeholder={`flowchart LR
  Start[User Input] --> Claude[Generate Script]
  Claude --> Video[Create Video]
  Video --> Assemble[Assemble Final]`}
                className="font-mono text-sm min-h-48 bg-slate-950 border-slate-700 text-slate-200"
              />
            </TabsContent>
            
            <TabsContent value="configs" className="space-y-2">
              <div className="text-sm text-slate-400">
                Optional: Provide detailed node configurations as JSON. Maps node IDs to worker types and configs.
              </div>
              <Textarea
                value={nodeConfigsInput}
                onChange={(e) => setNodeConfigsInput(e.target.value)}
                placeholder={`{
  "Claude": {
    "workerType": "claude",
    "config": {
      "model": "claude-3-sonnet-20240229",
      "temperature": 0.7
    }
  },
  "Video": {
    "workerType": "minimax",
    "config": {
      "duration": 5
    }
  }
}`}
                className="font-mono text-sm min-h-48 bg-slate-950 border-slate-700 text-slate-200"
              />
            </TabsContent>
            
            <TabsContent value="mappings" className="space-y-2">
              <div className="text-sm text-slate-400">
                Optional: Define how data flows between nodes. Maps edge keys to input/output mappings.
              </div>
              <Textarea
                value={edgeMappingsInput}
                onChange={(e) => setEdgeMappingsInput(e.target.value)}
                placeholder={`{
  "Claude->Video": {
    "prompt": "output.script.scenes[0].description",
    "duration": "5"
  },
  "Video->Assemble": {
    "clips": "output.videoUrl"
  }
}`}
                className="font-mono text-sm min-h-48 bg-slate-950 border-slate-700 text-slate-200"
              />
            </TabsContent>
          </Tabs>
          
          {/* Preview Section */}
          {previewGraph && (
            <div className="space-y-2 p-4 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-200">Preview</h4>
                <Badge variant="outline" className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
                  {previewGraph.nodes.length} nodes, {previewGraph.edges.length} edges
                </Badge>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>
                  <span className="font-semibold">Nodes:</span>{' '}
                  {previewGraph.nodes.map(n => `${n.id} (${n.type}${n.data.worker_type ? `: ${n.data.worker_type}` : ''})`).join(', ')}
                </div>
                <div>
                  <span className="font-semibold">Edges:</span>{' '}
                  {previewGraph.edges.map(e => `${e.source} → ${e.target}`).join(', ')}
                </div>
              </div>
            </div>
          )}
          
          {/* Error Display */}
          {parseError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="text-sm text-red-400">{parseError}</div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportOpen(false)}
              className="bg-slate-800 border-slate-700 hover:border-slate-600"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={!mermaidInput.trim()}
              className="bg-slate-800 border-slate-700 hover:border-cyan-500"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
            <Button
              onClick={handleImportClick}
              disabled={!previewGraph}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Unsaved Changes Warning Dialog */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-slate-200">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              You have unsaved changes in your current canvas. Importing will replace your current work.
              What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setShowUnsavedWarning(false)}
              className="bg-slate-800 border-slate-700 hover:border-slate-600"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleDiscardAndImport}
              className="bg-slate-800 border-slate-700 hover:border-red-500 text-red-400"
            >
              Discard Changes
            </Button>
            {onSaveBeforeImport && (
              <AlertDialogAction
                onClick={handleSaveAndImport}
                disabled={saving}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save & Import
                  </>
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={!currentGraph}
            className="bg-slate-900/90 border-slate-700 hover:border-cyan-500"
          >
            <Download className="w-4 h-4" />
            Export to Mermaid
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-200">Export to Mermaid</DialogTitle>
            <DialogDescription className="text-slate-400">
              Copy the generated Mermaid syntax to use in documentation or other tools.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Generated Mermaid flowchart syntax
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyToClipboard}
                className="bg-slate-800 border-slate-700 hover:border-cyan-500"
              >
                Copy to Clipboard
              </Button>
            </div>
            <Textarea
              value={exportedMermaid}
              readOnly
              className="font-mono text-sm min-h-64 bg-slate-950 border-slate-700 text-slate-200"
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportOpen(false)}
              className="bg-slate-800 border-slate-700 hover:border-slate-600"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
