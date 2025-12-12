/**
 * Shared utilities for production-side item components
 */

/**
 * Status types for different production-side items
 */
export type IntegrationStatus = 'connected' | 'disconnected' | 'error';
export type PersonStatus = 'online' | 'offline' | 'busy';
export type CodeStatus = 'deployed' | 'building' | 'failed';
export type DataStatus = 'operational' | 'error';

/**
 * All possible status values across all item types
 */
export type ProductionItemStatus = 
  | IntegrationStatus 
  | PersonStatus 
  | CodeStatus 
  | DataStatus;

/**
 * Maps status values to Tailwind CSS color classes
 * 
 * Color conventions:
 * - Green: success/operational/connected/deployed/online
 * - Red: error/failed
 * - Gray: inactive/disconnected/offline
 * - Yellow: busy (intermediate state)
 * - Blue: building (intermediate state)
 */
export function getStatusColor(status: ProductionItemStatus): string {
  const colorMap: Record<ProductionItemStatus, string> = {
    // Integration statuses
    connected: 'bg-green-500',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500',
    
    // Person statuses
    online: 'bg-green-500',
    offline: 'bg-gray-500',
    busy: 'bg-yellow-500',
    
    // Code statuses
    deployed: 'bg-green-500',
    building: 'bg-blue-500',
    failed: 'bg-red-500',
    
    // Data statuses
    operational: 'bg-green-500',
  };
  
  return colorMap[status] || 'bg-gray-500';
}

/**
 * Formats an ISO timestamp into a relative time string
 * 
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns Relative time string (e.g., "2 minutes ago") or "Unknown" if invalid
 */
export function formatRelativeTime(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) {
      return diffSeconds === 1 ? '1 second ago' : `${diffSeconds} seconds ago`;
    } else if (diffMinutes < 60) {
      return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays < 30) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else {
      const diffMonths = Math.floor(diffDays / 30);
      return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
    }
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Formats a number with comma separators for readability
 * 
 * @param num - Number to format
 * @returns Formatted string with comma separators (e.g., "1,234")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}
