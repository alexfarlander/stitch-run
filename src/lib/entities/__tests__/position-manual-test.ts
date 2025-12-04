/**
 * Manual test to demonstrate the calculateScreenPosition function
 * This file is for demonstration purposes and can be run with ts-node
 */

import { Node } from '@xyflow/react';
import { calculateScreenPosition } from '../position';

// Test case 1: Simple node without parent
console.log('Test 1: Simple node without parent');
const simpleNodes: Node[] = [
  {
    id: 'node1',
    type: 'default',
    position: { x: 100, y: 200 },
    data: {}
  }
];

const viewport1 = { x: 0, y: 0, zoom: 1 };
const result1 = calculateScreenPosition('node1', simpleNodes, viewport1);
console.log('Expected: { x: 100, y: 200 }');
console.log('Actual:', result1);
console.log('✓ Pass:', result1.x === 100 && result1.y === 200);
console.log('');

// Test case 2: Node with parent
console.log('Test 2: Node with parent');
const nestedNodes: Node[] = [
  {
    id: 'parent',
    type: 'section',
    position: { x: 50, y: 100 },
    data: {}
  },
  {
    id: 'child',
    type: 'item',
    position: { x: 30, y: 40 },
    parentNode: 'parent',
    data: {}
  }
];

const viewport2 = { x: 0, y: 0, zoom: 1 };
const result2 = calculateScreenPosition('child', nestedNodes, viewport2);
console.log('Expected: { x: 80, y: 140 } (50+30, 100+40)');
console.log('Actual:', result2);
console.log('✓ Pass:', result2.x === 80 && result2.y === 140);
console.log('');

// Test case 3: Deeply nested hierarchy
console.log('Test 3: Deeply nested hierarchy (3 levels)');
const deeplyNestedNodes: Node[] = [
  {
    id: 'grandparent',
    type: 'section',
    position: { x: 10, y: 20 },
    data: {}
  },
  {
    id: 'parent',
    type: 'section',
    position: { x: 30, y: 40 },
    parentNode: 'grandparent',
    data: {}
  },
  {
    id: 'child',
    type: 'item',
    position: { x: 50, y: 60 },
    parentNode: 'parent',
    data: {}
  }
];

const viewport3 = { x: 0, y: 0, zoom: 1 };
const result3 = calculateScreenPosition('child', deeplyNestedNodes, viewport3);
console.log('Expected: { x: 90, y: 120 } (10+30+50, 20+40+60)');
console.log('Actual:', result3);
console.log('✓ Pass:', result3.x === 90 && result3.y === 120);
console.log('');

// Test case 4: With viewport transform
console.log('Test 4: With viewport transform (zoom and pan)');
const viewport4 = { x: 100, y: 50, zoom: 2 };
const result4 = calculateScreenPosition('child', deeplyNestedNodes, viewport4);
console.log('Expected: { x: 280, y: 290 } ((10+30+50)*2+100, (20+40+60)*2+50)');
console.log('Actual:', result4);
console.log('✓ Pass:', result4.x === 280 && result4.y === 290);
console.log('');

console.log('All manual tests completed!');
