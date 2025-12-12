'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { WORKER_DEFINITIONS } from '@/lib/workers/registry';
import { WorkerDefinition } from '@/types/worker-definition';
import { InputSchema } from '@/types/canvas-schema';

/**
 * Node Configuration Panel
 * 
 * Interactive panel for editing node settings and worker configurations.
 * Opens as a right-side sheet when a node is clicked on the canvas.
 * 
 * Requirements:
 * - 3.1: Display configuration panel on node click
 * - 3.2: Display current worker type and input field values
 * - 3.3: Update input fields when worker type changes
 * - 12.1: Import WORKER_DEFINITIONS from worker registry
 * - 12.2: List all keys from WORKER_DEFINITIONS
 * - 12.3: Access input schema from WORKER_DEFINITIONS
 * - 12.4: Create inputs for each field in worker's input schema
 * 
 * @param nodeId - ID of the node being configured (null when closed)
 * @param canvasId - ID of the canvas containing the node
 * @param onClose - Callback when panel is closed
 * @param onSave - Callback when configuration is saved
 */

interface NodeConfig {
  workerType: string;
  inputs: Record<string, unknown>;
  entityMovement?: {
    targetNodeId?: string;
    targetSectionId?: string;
  };
}

interface NodeConfigPanelProps {
  nodeId: string | null;
  canvasId: string;
  onClose: () => void;
  onSave: (nodeId: string, config: NodeConfig) => Promise<void>;
}

export function NodeConfigPanel({
  nodeId,
  canvasId,
  onClose,
  onSave,
}: NodeConfigPanelProps) {
  const [config, setConfig] = useState<NodeConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<NodeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch node configuration when panel opens
  useEffect(() => {
    if (!nodeId) {
      setConfig(null);
      setError(null);
      return;
    }

    const fetchNodeConfig = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch node data from the canvas API
        const response = await fetch(`/api/canvas/${canvasId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch canvas data');
        }

        const canvasData = await response.json();
        const node = canvasData.graph.nodes.find((n: any) => n.id === nodeId);

        if (!node) {
          throw new Error('Node not found');
        }

        // Extract configuration from node data
        const nodeConfig: NodeConfig = {
          workerType: node.data.worker_type || '',
          inputs: node.data.config || {},
          entityMovement: node.data.entityMovement,
        };

        setConfig(nodeConfig);
        setOriginalConfig(nodeConfig);
        setValidationErrors({});
      } catch (err) {
        console.error('Error fetching node config:', err);
        setError(err instanceof Error ? err.message : 'Failed to load configuration');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNodeConfig();
  }, [nodeId, canvasId]);

  // Get worker definition for the current worker type
  const workerDefinition: WorkerDefinition | undefined = config?.workerType
    ? WORKER_DEFINITIONS[config.workerType]
    : undefined;

  // Handle worker type change
  const handleWorkerTypeChange = (newWorkerType: string) => {
    if (!config) return;

    // Get the new worker definition
    const newWorkerDef = WORKER_DEFINITIONS[newWorkerType];
    
    // Initialize inputs with default values from schema
    const newInputs: Record<string, unknown> = {};
    if (newWorkerDef) {
      Object.entries(newWorkerDef.input).forEach(([key, schema]) => {
        // Use default value from schema if available, otherwise use empty value based on type
        if (schema.default !== undefined) {
          newInputs[key] = schema.default;
        } else {
          switch (schema.type) {
            case 'string':
              newInputs[key] = '';
              break;
            case 'number':
              newInputs[key] = 0;
              break;
            case 'boolean':
              newInputs[key] = false;
              break;
            case 'array':
              newInputs[key] = [];
              break;
            case 'object':
              newInputs[key] = {};
              break;
            default:
              newInputs[key] = '';
          }
        }
      });
    }

    setConfig({
      ...config,
      workerType: newWorkerType,
      inputs: newInputs,
    });
  };

  // Validate a single field
  const validateField = (fieldName: string, value: any, schema: InputSchema): string | null => {
    // Check required fields
    if (schema.required) {
      if (value === undefined || value === null || value === '') {
        return 'This field is required';
      }
      // For arrays and objects, check if they're empty
      if (schema.type === 'array' && Array.isArray(value) && value.length === 0) {
        return 'This field is required';
      }
      if (schema.type === 'object' && typeof value === 'object' && Object.keys(value).length === 0) {
        return 'This field is required';
      }
    }

    // Type validation
    if (value !== undefined && value !== null && value !== '') {
      switch (schema.type) {
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            return 'Must be a valid number';
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            return 'Must be a boolean value';
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            return 'Must be an array';
          }
          break;
        case 'object':
          if (typeof value !== 'object' || Array.isArray(value)) {
            return 'Must be an object';
          }
          break;
      }
    }

    return null;
  };

  // Validate all fields
  const validateAllFields = (): boolean => {
    if (!config || !workerDefinition) return false;

    const errors: Record<string, string> = {};
    let hasErrors = false;

    Object.entries(workerDefinition.input).forEach(([fieldName, schema]) => {
      const value = config.inputs[fieldName];
      const error = validateField(fieldName, value, schema);
      if (error) {
        errors[fieldName] = error;
        hasErrors = true;
      }
    });

    setValidationErrors(errors);
    return !hasErrors;
  };

  // Handle input field change with real-time validation
  const handleInputChange = (fieldName: string, value: any) => {
    if (!config || !workerDefinition) return;

    const newConfig = {
      ...config,
      inputs: {
        ...config.inputs,
        [fieldName]: value,
      },
    };

    setConfig(newConfig);

    // Real-time validation
    const schema = workerDefinition.input[fieldName];
    if (schema) {
      const error = validateField(fieldName, value, schema);
      setValidationErrors(prev => {
        const next = { ...prev };
        if (error) {
          next[fieldName] = error;
        } else {
          delete next[fieldName];
        }
        return next;
      });
    }
  };

  // Handle input field blur (final validation check)
  const handleInputBlur = (fieldName: string) => {
    if (!config || !workerDefinition) return;

    const schema = workerDefinition.input[fieldName];
    if (schema) {
      const value = config.inputs[fieldName];
      const error = validateField(fieldName, value, schema);
      setValidationErrors(prev => {
        const next = { ...prev };
        if (error) {
          next[fieldName] = error;
        } else {
          delete next[fieldName];
        }
        return next;
      });
    }
  };

  // Handle save operation
  const handleSave = async () => {
    if (!config || !nodeId) return;

    // Validate all fields before saving
    if (!validateAllFields()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(nodeId, config);
      onClose();
    } catch (err) {
      console.error('Error saving node config:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel operation
  const handleCancel = () => {
    // Reset to original config
    if (originalConfig) {
      setConfig(originalConfig);
    }
    setValidationErrors({});
    setError(null);
    onClose();
  };

  // Check if all fields are valid
  const allFieldsValid = config && workerDefinition
    ? Object.keys(validationErrors).length === 0 &&
      Object.entries(workerDefinition.input).every(([fieldName, schema]) => {
        if (!schema.required) return true;
        const value = config.inputs[fieldName];
        return value !== undefined && value !== null && value !== '';
      })
    : false;

  // Render input field based on schema type
  const renderInputField = (fieldName: string, schema: InputSchema) => {
    const rawValue = config?.inputs[fieldName];
    const fieldId = `field-${fieldName}`;
    const hasError = !!validationErrors[fieldName];

    switch (schema.type) {
      case 'string':
        {
          const value =
            rawValue === undefined || rawValue === null
              ? ''
              : typeof rawValue === 'string'
                ? rawValue
                : String(rawValue);
        return (
          <div>
            <Input
              id={fieldId}
              type="text"
              value={value}
              onChange={(e) => handleInputChange(fieldName, e.target.value)}
              onBlur={() => handleInputBlur(fieldName)}
              placeholder={schema.description || `Enter ${fieldName}`}
              className={hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''}
            />
            {validationErrors[fieldName] && (
              <p className="mt-1 text-sm text-red-400">{validationErrors[fieldName]}</p>
            )}
          </div>
        );
        }

      case 'number':
        {
          const value =
            rawValue === undefined || rawValue === null
              ? ''
              : typeof rawValue === 'number'
                ? rawValue
                : typeof rawValue === 'string'
                  ? rawValue
                  : '';
        return (
          <div>
            <Input
              id={fieldId}
              type="number"
              value={value}
              onChange={(e) => handleInputChange(fieldName, parseFloat(e.target.value) || 0)}
              onBlur={() => handleInputBlur(fieldName)}
              placeholder={schema.description || `Enter ${fieldName}`}
              className={hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''}
            />
            {validationErrors[fieldName] && (
              <p className="mt-1 text-sm text-red-400">{validationErrors[fieldName]}</p>
            )}
          </div>
        );
        }

      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <input
              id={fieldId}
              type="checkbox"
              checked={!!rawValue}
              onChange={(e) => handleInputChange(fieldName, e.target.checked)}
              className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <Label htmlFor={fieldId} className="text-sm text-gray-300">
              {schema.description || 'Enable'}
            </Label>
          </div>
        );

      default:
        // For array and object types, show a textarea for JSON input
        return (
          <div>
            <textarea
              id={fieldId}
              value={
                typeof rawValue === 'string'
                  ? rawValue
                  : JSON.stringify(rawValue ?? '', null, 2)
              }
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleInputChange(fieldName, parsed);
                } catch {
                  // If not valid JSON, store as string
                  handleInputChange(fieldName, e.target.value);
                }
              }}
              onBlur={() => handleInputBlur(fieldName)}
              placeholder={schema.description || `Enter ${fieldName} (JSON)`}
              className={`w-full min-h-[100px] rounded-md border px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 ${
                hasError
                  ? 'border-red-500 bg-gray-800 focus:border-red-500 focus:ring-red-500/50'
                  : 'border-gray-700 bg-gray-800 focus:border-blue-500 focus:ring-blue-500/50'
              }`}
            />
            {validationErrors[fieldName] && (
              <p className="mt-1 text-sm text-red-400">{validationErrors[fieldName]}</p>
            )}
          </div>
        );
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && nodeId) {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodeId]);

  return (
    <Sheet open={!!nodeId} onOpenChange={(open) => !open && handleCancel()}>
      <SheetContent side="right" className="w-96 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Node Configuration</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-400">Loading configuration...</div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {config && !isLoading && (
            <>
              {/* Worker Type Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="worker-type" className="text-xs text-gray-400 uppercase tracking-wide">
                  Worker Type
                </Label>
                <Select
                  value={config.workerType}
                  onValueChange={handleWorkerTypeChange}
                >
                  <SelectTrigger id="worker-type" className="w-full">
                    <SelectValue placeholder="Select worker type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(WORKER_DEFINITIONS).map((workerType) => (
                      <SelectItem key={workerType} value={workerType}>
                        {WORKER_DEFINITIONS[workerType].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Worker Definition Info */}
              {workerDefinition && (
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide">
                    Description
                  </label>
                  <p className="mt-2 text-sm text-gray-300">
                    {workerDefinition.description}
                  </p>
                </div>
              )}

              {/* Dynamic Form Fields */}
              {workerDefinition && Object.keys(workerDefinition.input).length > 0 && (
                <div className="space-y-4">
                  <label className="text-xs text-gray-400 uppercase tracking-wide">
                    Configuration
                  </label>
                  {Object.entries(workerDefinition.input).map(([fieldName, schema]) => (
                    <div key={fieldName} className="space-y-2">
                      <Label htmlFor={`field-${fieldName}`} className="text-sm text-gray-300">
                        {fieldName}
                        {schema.required && (
                          <span className="ml-1 text-red-400">*</span>
                        )}
                      </Label>
                      {renderInputField(fieldName, schema)}
                      {schema.description && schema.type !== 'boolean' && (
                        <p className="text-xs text-gray-500">{schema.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Entity Movement Config */}
              {config.entityMovement && (
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide">
                    Entity Movement
                  </label>
                  <div className="mt-2 rounded-md bg-gray-800 border border-gray-700 p-3">
                    <pre className="text-xs text-gray-300 overflow-x-auto">
                      {JSON.stringify(config.entityMovement, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Success Indicator */}
              {allFieldsValid && Object.keys(workerDefinition?.input || {}).length > 0 && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All fields are valid</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with Save and Cancel buttons */}
        {config && !isLoading && (
          <SheetFooter className="mt-6 flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!allFieldsValid || isSaving}
              className="flex-1"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
