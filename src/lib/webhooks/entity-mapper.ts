/**
 * Entity Mapping Transformation
 * 
 * Maps webhook payloads to entity data structures using JSON path extraction.
 * Transforms external webhook data into the format required for stitch_entities table.
 */

import { extractValue } from './json-path';
import { EntityMapping } from '@/types/stitch';

/**
 * Entity data structure ready for database insertion
 */
export interface MappedEntityData {
  name: string;
  email?: string;
  entity_type: string;
  avatar_url?: string;
  metadata: Record<string, any>;
}

/**
 * Maps a webhook payload to entity data using the provided entity mapping configuration.
 * 
 * @param payload - The webhook payload (JSON object)
 * @param mapping - The entity mapping configuration defining how to extract fields
 * @returns Structured entity data ready for database insertion
 * 
 * @example
 * const payload = {
 *   customer: { name: "Alice", email: "alice@example.com" },
 *   subscription: { plan: "pro", amount: 99 }
 * };
 * 
 * const mapping = {
 *   name: "$.customer.name",
 *   email: "$.customer.email",
 *   entity_type: "customer",
 *   metadata: {
 *     plan: "$.subscription.plan",
 *     amount: "$.subscription.amount"
 *   }
 * };
 * 
 * const result = mapPayloadToEntity(payload, mapping);
 * // {
 * //   name: "Alice",
 * //   email: "alice@example.com",
 * //   entity_type: "customer",
 * //   metadata: { plan: "pro", amount: 99 }
 * // }
 */
export function mapPayloadToEntity(
  payload: Record<string, any>,
  mapping: EntityMapping
): MappedEntityData {
  // Extract required fields
  const name = extractValue(payload, mapping.name);
  const entity_type = extractValue(payload, mapping.entity_type);
  
  // Validate required fields
  if (name === undefined || name === null) {
    throw new Error('Entity name is required but could not be extracted from payload');
  }
  
  if (entity_type === undefined || entity_type === null) {
    throw new Error('Entity type is required but could not be extracted from payload');
  }
  
  // Extract optional fields
  const email = mapping.email ? extractValue(payload, mapping.email) : undefined;
  const avatar_url = mapping.avatar_url ? extractValue(payload, mapping.avatar_url) : undefined;
  
  // Extract metadata fields
  const metadata: Record<string, any> = {};
  
  if (mapping.metadata) {
    for (const [key, pathOrValue] of Object.entries(mapping.metadata)) {
      const value = extractValue(payload, pathOrValue);
      // Only include metadata fields that were successfully extracted
      if (value !== undefined) {
        metadata[key] = value;
      }
    }
  }
  
  // Build the entity data structure
  const entityData: MappedEntityData = {
    name: String(name), // Ensure name is a string
    entity_type: String(entity_type), // Ensure entity_type is a string
    metadata,
  };
  
  // Add optional fields only if they have values
  if (email !== undefined && email !== null) {
    entityData.email = String(email);
  }
  
  if (avatar_url !== undefined && avatar_url !== null) {
    entityData.avatar_url = String(avatar_url);
  }
  
  return entityData;
}
