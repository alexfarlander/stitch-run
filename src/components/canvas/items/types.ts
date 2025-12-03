/**
 * Shared TypeScript interfaces for production-side item components
 */

import type { 
  IntegrationStatus, 
  PersonStatus, 
  CodeStatus, 
  DataStatus 
} from './utils';

/**
 * Props for IntegrationItem component
 */
export interface IntegrationItemProps {
  id: string;
  data: {
    label: string;              // API name (e.g., "Claude API")
    apiKey: string;             // Environment variable name
    status: IntegrationStatus;
    lastPing?: string;          // ISO timestamp
    usagePercent?: number;      // 0-100, optional
  };
}

/**
 * Props for PersonItem component
 */
export interface PersonItemProps {
  id: string;
  data: {
    label: string;              // Person name
    role: string;               // "Founder", "AI Assistant", etc.
    avatarUrl?: string;         // Avatar image URL
    status: PersonStatus;
    type: 'human' | 'ai';       // Determines badge icon
  };
}

/**
 * Props for CodeItem component
 */
export interface CodeItemProps {
  id: string;
  data: {
    label: string;              // Deployment name
    status: CodeStatus;
    lastDeploy: string;         // ISO timestamp
    repoUrl?: string;           // Optional GitHub/GitLab link
    deploymentUrl?: string;     // Optional live URL
  };
}

/**
 * Props for DataItem component
 */
export interface DataItemProps {
  id: string;
  data: {
    label: string;              // Data source name
    type: 'database' | 'spreadsheet' | 'chart';
    recordCount: number;        // Number of records
    lastSync: string;           // ISO timestamp
    status: DataStatus;
  };
}
