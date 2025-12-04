/**
 * Prompt Template Demonstration
 * 
 * This file demonstrates how the AI Manager prompt template works.
 * Run with: npx tsx src/lib/ai/__tests__/prompt-template-demo.ts
 */

import { buildAIManagerPrompt, buildSimplePrompt } from '../prompt-template';
import { WORKER_DEFINITIONS } from '@/lib/workers/registry';

console.log('='.repeat(80));
console.log('AI MANAGER PROMPT TEMPLATE DEMONSTRATION');
console.log('='.repeat(80));
console.log();

// Example 1: Simple prompt for creating a workflow
console.log('EXAMPLE 1: Simple Prompt for Creating a Workflow');
console.log('-'.repeat(80));
const simplePrompt = buildSimplePrompt(
  'Create a workflow that generates a video from a text prompt'
);
console.log(simplePrompt.substring(0, 500) + '...\n');

// Example 2: Full prompt with worker definitions
console.log('EXAMPLE 2: Full Prompt with Worker Definitions');
console.log('-'.repeat(80));
const fullPrompt = buildAIManagerPrompt({
  workers: Object.values(WORKER_DEFINITIONS),
  userRequest: 'Create a workflow that generates a video with narration',
});
console.log('Prompt length:', fullPrompt.length, 'characters');
console.log('First 1000 characters:');
console.log(fullPrompt.substring(0, 1000) + '...\n');

// Example 3: Prompt with current canvas context (for modifications)
console.log('EXAMPLE 3: Prompt with Current Canvas Context');
console.log('-'.repeat(80));
const currentCanvas = {
  nodes: [
    {
      id: 'input-1',
      type: 'ux',
      data: {
        label: 'Enter Video Prompt',
        inputFields: ['prompt'],
      },
    },
    {
      id: 'generate-video-1',
      type: 'worker',
      data: {
        label: 'Generate Video',
        worker_type: 'minimax',
        config: {
          duration: 5,
        },
      },
    },
  ],
  edges: [
    {
      id: 'e1',
      source: 'input-1',
      target: 'generate-video-1',
      data: {
        mapping: {
          visual_prompt: 'prompt',
        },
      },
    },
  ],
};

const modificationPrompt = buildAIManagerPrompt({
  workers: Object.values(WORKER_DEFINITIONS),
  currentCanvas,
  userRequest: 'Add voice narration to the video',
});
console.log('Prompt length:', modificationPrompt.length, 'characters');
console.log('Includes "Current Canvas State":', modificationPrompt.includes('Current Canvas State'));
console.log('Includes "input-1":', modificationPrompt.includes('input-1'));
console.log('Includes "generate-video-1":', modificationPrompt.includes('generate-video-1'));
console.log();

// Example 4: Show key sections
console.log('EXAMPLE 4: Key Sections in Full Prompt');
console.log('-'.repeat(80));
const sections = [
  'Stitch AI Manager',
  'Available Workers',
  'Entity Movement Rules',
  'Output Format',
  'Examples',
  'User Request',
];

sections.forEach(section => {
  const index = fullPrompt.indexOf(section);
  console.log(`✓ ${section}: Found at position ${index}`);
});
console.log();

// Example 5: Show worker definitions
console.log('EXAMPLE 5: Worker Definitions Included');
console.log('-'.repeat(80));
const workers = Object.keys(WORKER_DEFINITIONS);
workers.forEach(workerId => {
  const included = fullPrompt.includes(workerId);
  console.log(`✓ ${workerId}: ${included ? 'Included' : 'Missing'}`);
});
console.log();

// Example 6: Show entity movement rules
console.log('EXAMPLE 6: Entity Movement Rules');
console.log('-'.repeat(80));
const entityMovementIndex = fullPrompt.indexOf('Entity Movement Rules');
const entityMovementSection = fullPrompt.substring(
  entityMovementIndex,
  entityMovementIndex + 800
);
console.log(entityMovementSection);
console.log();

// Example 7: Show example workflow
console.log('EXAMPLE 7: Example Workflow (Parallel Video Production)');
console.log('-'.repeat(80));
const exampleIndex = fullPrompt.indexOf('Parallel Video Production');
const exampleSection = fullPrompt.substring(
  exampleIndex,
  exampleIndex + 1000
);
console.log(exampleSection);
console.log();

console.log('='.repeat(80));
console.log('DEMONSTRATION COMPLETE');
console.log('='.repeat(80));
