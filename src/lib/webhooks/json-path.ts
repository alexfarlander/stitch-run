/**
 * JSON Path Extraction Utility
 * 
 * Extracts values from JSON objects using basic JSON path syntax.
 * Supports:
 * - $.field - Top-level field access
 * - $.nested.field - Nested field access
 * - $.array[0] - Array index access
 * - Static string values (non-path values)
 */

/**
 * Extracts a value from a JSON object using a JSON path or returns a static value.
 * 
 * @param payload - The JSON object to extract from
 * @param pathOrValue - Either a JSON path (starting with $.) or a static string value
 * @returns The extracted value, or undefined if the path doesn't exist
 * 
 * @example
 * const data = { customer: { name: "Alice", email: "alice@example.com" } };
 * extractValue(data, "$.customer.name"); // "Alice"
 * extractValue(data, "$.customer.missing"); // undefined
 * extractValue(data, "customer"); // "customer" (static value)
 */
export function extractValue(
  payload: Record<string, unknown>,
  pathOrValue: string
): any {
  // If it doesn't start with $., treat it as a static value
  if (!pathOrValue.startsWith('$.')) {
    return pathOrValue;
  }

  // Remove the leading $.
  const path = pathOrValue.substring(2);
  
  // Split the path into segments, handling array indices
  const segments = parsePath(path);
  
  // Walk through the object following the path
  let current: unknown = payload;
  
  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    if (segment.type === 'property') {
      current = current[segment.value as string];
    } else if (segment.type === 'index') {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[segment.value as number];
    }
  }
  
  return current;
}

/**
 * Parses a JSON path into segments
 * 
 * @param path - The path string (without the leading $.)
 * @returns Array of path segments with their types
 */
function parsePath(path: string): Array<{ type: 'property' | 'index'; value: string | number }> {
  const segments: Array<{ type: 'property' | 'index'; value: string | number }> = [];
  let current = '';
  let i = 0;
  
  while (i < path.length) {
    const char = path[i];
    
    if (char === '[') {
      // Save the current property if any
      if (current) {
        segments.push({ type: 'property', value: current });
        current = '';
      }
      
      // Extract array index
      i++; // Skip [
      let indexStr = '';
      while (i < path.length && path[i] !== ']') {
        indexStr += path[i];
        i++;
      }
      i++; // Skip ]
      
      const index = parseInt(indexStr, 10);
      if (!isNaN(index)) {
        segments.push({ type: 'index', value: index });
      }
    } else if (char === '.') {
      // Save the current property
      if (current) {
        segments.push({ type: 'property', value: current });
        current = '';
      }
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Save any remaining property
  if (current) {
    segments.push({ type: 'property', value: current });
  }
  
  return segments;
}
