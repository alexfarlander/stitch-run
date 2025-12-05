/**
 * React Hook for Canvas Navigation
 * Provides navigation state and actions with automatic re-rendering
 */

import { useEffect, useState, useCallback } from 'react';
import { 
  getCanvasNavigation, 
  type CanvasStackItem,
  type CanvasType,
  type NavigationDirection
} from '@/lib/navigation/canvas-navigation';

export interface UseCanvasNavigationReturn {
  currentCanvasId: string | null;
  currentCanvas: CanvasStackItem | null;
  breadcrumbs: CanvasStackItem[];
  canGoBack: boolean;
  direction: NavigationDirection;
  drillInto: (id: string, name: string, type: CanvasType) => void;
  goBack: () => void;
  navigateTo: (index: number) => void;
  clear: () => void;
  hydrateFromDatabase: (canvasId: string) => Promise<void>;
}

/**
 * Hook for managing canvas navigation state
 * Automatically subscribes to navigation changes and triggers re-renders
 */
export function useCanvasNavigation(): UseCanvasNavigationReturn {
  const navigation = getCanvasNavigation();
  const [, forceUpdate] = useState({});

  // Subscribe to navigation changes
  useEffect(() => {
    const unsubscribe = navigation.subscribe(() => {
      forceUpdate({});
    });

    return unsubscribe;
  }, [navigation]);

  // Get current state
  const currentCanvas = navigation.getCurrentCanvas();
  const currentCanvasId = navigation.getCurrentCanvasId();
  const breadcrumbs = navigation.getBreadcrumbs();
  const canGoBack = breadcrumbs.length > 1;
  const direction = navigation.getDirection();

  // Actions
  const drillInto = useCallback((id: string, name: string, type: CanvasType) => {
    navigation.drillInto({ id, name, type });
  }, [navigation]);

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const navigateTo = useCallback((index: number) => {
    navigation.navigateTo(index);
  }, [navigation]);

  const clear = useCallback(() => {
    navigation.clear();
  }, [navigation]);

  const hydrateFromDatabase = useCallback(async (canvasId: string) => {
    await navigation.hydrateFromDatabase(canvasId);
  }, [navigation]);

  return {
    currentCanvasId,
    currentCanvas,
    breadcrumbs,
    canGoBack,
    direction,
    drillInto,
    goBack,
    navigateTo,
    clear,
    hydrateFromDatabase,
  };
}
