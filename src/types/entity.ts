export type EntityType = 'lead' | 'customer' | 'churned';

export interface JourneyEvent {
  timestamp: string;
  type: 'entered_node' | 'left_node' | 'started_edge' | 'completed_edge' | 'converted' | 'churned';
  node_id?: string;
  edge_id?: string;
  from_node_id?: string;
  workflow_run_id?: string;
  note?: string;
}

export interface EntityMetadata {
  source?: string;           // "linkedin", "seo", "referral"
  campaign?: string;         // UTM campaign
  cac?: number;              // Customer acquisition cost
  ltv?: number;              // Lifetime value
  plan?: string;             // Current plan
  [key: string]: unknown;
}

export interface StitchEntity {
  id: string;
  canvas_id: string;
  // Identity
  name: string;
  email?: string;
  avatar_url?: string;
  entity_type: EntityType;
  // Position
  current_node_id?: string;
  current_edge_id?: string;
  edge_progress?: number;
  destination_node_id?: string;
  // Data
  journey: JourneyEvent[];
  metadata: EntityMetadata;
  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface EntityPosition {
  x: number;
  y: number;
  type: 'node' | 'edge';
  id: string;
}
