# MermaidImportExport Safety Features

## Overview

The `MermaidImportExport` component includes built-in safety features to prevent accidental data loss when importing workflows. This document explains the unsaved changes protection mechanism.

## The Problem

**Before the safety feature:**
- User has unsaved changes in their canvas
- User clicks "Import from Mermaid"
- User previews and confirms import
- **BOOM!** All unsaved work is instantly overwritten
- No warning, no chance to save

This is a critical UX issue that could lead to significant data loss.

## The Solution

**With the safety feature:**
- User has unsaved changes in their canvas
- User clicks "Import from Mermaid"
- User previews and confirms import
- **STOP!** Warning dialog appears
- User chooses: Cancel, Discard, or Save & Import
- Only then does the import proceed

## Implementation

### 1. New Props

```typescript
interface MermaidImportExportProps {
  // ... existing props ...
  
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
```

### 2. Warning Dialog

When `hasUnsavedChanges={true}` and user clicks "Import", they see:

```
⚠️ Unsaved Changes

You have unsaved changes in your current canvas. 
Importing will replace your current work.
What would you like to do?

[Cancel]  [Discard Changes]  [Save & Import]
```

### 3. User Options

**Cancel:**
- Closes the warning dialog
- Returns to import preview
- No changes made

**Discard Changes:**
- Proceeds with import
- Current work is lost
- User explicitly chose this

**Save & Import:**
- Calls `onSaveBeforeImport()` callback
- Waits for save to complete
- Then proceeds with import
- Current work is preserved

## Usage Examples

### Basic Protection (Warning Only)

```tsx
<MermaidImportExport 
  currentGraph={currentGraph}
  onImport={handleImport}
  hasUnsavedChanges={isDirty}
/>
```

**Result:** User sees warning with Cancel and Discard options only.

### Full Protection (Warning + Auto-Save)

```tsx
<MermaidImportExport 
  currentGraph={currentGraph}
  onImport={handleImport}
  hasUnsavedChanges={isDirty}
  onSaveBeforeImport={async () => {
    await createVersion(flowId, currentGraph, 'Auto-save before import');
  }}
/>
```

**Result:** User sees warning with Cancel, Discard, and Save & Import options.

### Integration with StitchCanvas

```tsx
function FlowEditor({ flow }: { flow: StitchFlow }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentGraph, setCurrentGraph] = useState(flow.graph);
  
  // Track changes
  const handleGraphChange = (newGraph: VisualGraph) => {
    setCurrentGraph(newGraph);
    setHasUnsavedChanges(true);
  };
  
  // Save before import
  const handleSaveBeforeImport = async () => {
    await createVersion(flow.id, currentGraph, 'Auto-save before import');
    setHasUnsavedChanges(false);
  };
  
  // Import handler
  const handleImport = async (importedGraph: VisualGraph) => {
    await createVersion(flow.id, importedGraph, 'Imported from Mermaid');
    setCurrentGraph(importedGraph);
    setHasUnsavedChanges(false);
    router.refresh();
  };
  
  return (
    <div>
      <MermaidImportExport 
        currentGraph={currentGraph}
        onImport={handleImport}
        hasUnsavedChanges={hasUnsavedChanges}
        onSaveBeforeImport={handleSaveBeforeImport}
      />
      <StitchCanvas 
        flow={flow}
        onGraphChange={handleGraphChange}
      />
    </div>
  );
}
```

## State Management

The component manages the following safety-related state:

```typescript
const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
const [saving, setSaving] = useState(false);
```

### Flow Diagram

```
User clicks "Import"
        ↓
hasUnsavedChanges?
    ↓           ↓
   No          Yes
    ↓           ↓
Import    Show Warning
            ↓
    User chooses option
    ↓       ↓       ↓
Cancel  Discard  Save
    ↓       ↓       ↓
  Back   Import  Save → Import
```

## Error Handling

### Save Failure

If `onSaveBeforeImport()` throws an error:

```typescript
try {
  await onSaveBeforeImport();
  handleImportConfirm();
} catch (error) {
  console.error('Failed to save before import:', error);
  setParseError('Failed to save current changes. Please try again.');
}
```

**Result:** 
- Error message displayed
- Import does not proceed
- User can try again or cancel

### No Save Callback

If `hasUnsavedChanges={true}` but no `onSaveBeforeImport` provided:

**Result:**
- Warning dialog shows only Cancel and Discard options
- "Save & Import" button is hidden
- User must explicitly choose to discard

## Benefits

### 1. Prevents Accidental Data Loss
- Users can't accidentally overwrite their work
- Explicit confirmation required

### 2. Provides Recovery Options
- Save current work before importing
- Or consciously choose to discard

### 3. Maintains User Trust
- System protects user's work
- No surprises or unexpected behavior

### 4. Follows Best Practices
- Similar to "Save before closing?" dialogs
- Industry-standard UX pattern

## Testing

The safety feature is tested through:

1. **Unit Tests**: Props validation, callback signatures
2. **Integration Tests**: Warning dialog flow
3. **Manual Testing**: Real-world usage scenarios

## Accessibility

The warning dialog follows accessibility best practices:

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels
- **Focus Management**: Focus trapped in dialog
- **Clear Actions**: Distinct button labels

## Future Enhancements

Potential improvements:

1. **Diff Preview**: Show what will change before importing
2. **Undo Support**: Allow undo after import
3. **Auto-Save**: Automatically save before import without asking
4. **Conflict Resolution**: Merge imported changes with current work
5. **Version Comparison**: Compare current vs imported graph

## Related Documentation

- [Usage Guide](./MERMAID_IMPORT_EXPORT_USAGE.md)
- [Examples](./MERMAID_IMPORT_EXPORT_EXAMPLES.md)
- [README](./MERMAID_IMPORT_EXPORT_README.md)
- [Version Manager](../../lib/canvas/version-manager.ts)

## Conclusion

The unsaved changes protection feature is a critical safety mechanism that prevents accidental data loss. By requiring explicit user confirmation before overwriting work, it maintains user trust and follows industry best practices for data-destructive operations.

**Key Takeaway:** Always protect user data. Never silently overwrite unsaved work.
