/**
 * Canvas Navigation State Management
 * Handles drill-down navigation with persistence and hydration
 */

import { supabase } from '@/lib/supabase/client';

export type CanvasType = 'bmc' | 'workflow' | 'section' | 'detail';
export type NavigationDirection = 'in' | 'out' | null;

export interface CanvasStackItem {
  id: string;
  name: string;
  type: CanvasType;
}

interface CanvasRecord {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
}

const STORAGE_KEY = 'stitch_canvas_stack';

/**
 * Canvas Navigation Manager
 * Manages navigation stack with sessionStorage persistence
 */
export class CanvasNavigation {
  private stack: CanvasStackItem[] = [];
  private listeners: Set<() => void> = new Set();
  private direction: NavigationDirection = null;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load stack from sessionStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.stack = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load navigation stack:', error);
      this.stack = [];
      // Emit error event for user feedback
      this.notifyError('Failed to restore navigation history');
    }
  }

  /**
   * Notify listeners of an error
   */
  private notifyError(message: string): void {
    // Could be extended to emit error events to listeners
    console.warn('Navigation error:', message);
  }

  /**
   * Save stack to sessionStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.stack));
    } catch (error) {
      console.error('Failed to save navigation stack:', error);
    }
  }

  /**
   * Notify all listeners of state change
   * Wraps each listener in try-catch to prevent one failing listener from breaking the chain
   */
  private notify(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Navigation listener error:', error);
      }
    });
  }

  /**
   * Subscribe to navigation changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current navigation direction
   */
  getDirection(): NavigationDirection {
    return this.direction;
  }

  /**
   * Drill into a canvas (push to stack)
   */
  drillInto(canvas: CanvasStackItem): void {
    // Avoid duplicates at the top of the stack
    if (this.stack.length > 0 && this.stack[this.stack.length - 1].id === canvas.id) {
      return;
    }

    this.direction = 'in';
    this.stack.push(canvas);
    this.saveToStorage();
    this.notify();
  }

  /**
   * Go back one level (pop from stack)
   */
  goBack(): CanvasStackItem | null {
    if (this.stack.length <= 1) return null;
    
    this.direction = 'out';
    this.stack.pop();
    this.saveToStorage();
    this.notify();
    
    return this.getCurrentCanvas();
  }

  /**
   * Navigate to a specific breadcrumb (pop to that level)
   */
  navigateTo(index: number): CanvasStackItem | null {
    if (index < 0 || index >= this.stack.length) return null;
    
    // Determine direction based on whether we're going forward or backward
    const currentIndex = this.stack.length - 1;
    this.direction = index > currentIndex ? 'in' : 'out';
    
    this.stack = this.stack.slice(0, index + 1);
    this.saveToStorage();
    this.notify();
    
    return this.getCurrentCanvas();
  }

  /**
   * Get current canvas (top of stack)
   */
  getCurrentCanvas(): CanvasStackItem | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  /**
   * Get current canvas ID
   */
  getCurrentCanvasId(): string | null {
    const current = this.getCurrentCanvas();
    return current ? current.id : null;
  }

  /**
   * Get breadcrumbs (entire stack)
   */
  getBreadcrumbs(): CanvasStackItem[] {
    return [...this.stack];
  }

  /**
   * Clear the entire stack
   */
  clear(): void {
    this.stack = [];
    this.saveToStorage();
    this.notify();
  }

  /**
   * Replace the entire stack
   */
  setStack(stack: CanvasStackItem[]): void {
    this.stack = stack;
    this.saveToStorage();
    this.notify();
  }

  /**
   * Hydrate stack from database if empty
   * Reconstructs navigation path by walking up parent_id chain
   */
  async hydrateFromDatabase(canvasId: string): Promise<void> {
    // Only hydrate if stack is empty or doesn't contain the target canvas
    const hasCanvas = this.stack.some(item => item.id === canvasId);
    if (this.stack.length > 0 && hasCanvas) return;

    const path: CanvasStackItem[] = [];

    try {
      let currentId: string | null = canvasId;

      // Walk up the parent chain
      while (currentId) {
        const { data, error } = await supabase
          .from('stitch_canvases')
          .select('id, name, type, parent_id')
          .eq('id', currentId)
          .single();

        if (error || !data) {
          console.error('Failed to fetch canvas for hydration:', error);
          break;
        }

        const canvasData = data as CanvasRecord;

        // Add to beginning of path (we're walking backwards)
        path.unshift({
          id: canvasData.id,
          name: canvasData.name,
          type: canvasData.type as CanvasType,
        });

        currentId = canvasData.parent_id;
      }

      // Set the reconstructed stack
      if (path.length > 0) {
        this.setStack(path);
      }
    } catch (error) {
      console.error('Failed to hydrate navigation stack:', error);
    }
  }
}

// Singleton instance
let navigationInstance: CanvasNavigation | null = null;

/**
 * Get the singleton navigation instance
 * Uses lazy initialization with SSR guard
 */
export function getCanvasNavigation(): CanvasNavigation {
  // Guard against SSR contexts
  if (typeof window === 'undefined') {
    throw new Error('CanvasNavigation can only be used in browser context');
  }
  
  if (!navigationInstance) {
    navigationInstance = new CanvasNavigation();
  }
  return navigationInstance;
}
