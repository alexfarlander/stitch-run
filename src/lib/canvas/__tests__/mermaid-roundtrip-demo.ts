/**
 * Mermaid Round-Trip Demo
 * 
 * Demonstrates the bidirectional conversion between Mermaid and Canvas.
 * This is not a test file, but a demonstration of the functionality.
 */

import { mermaidToCanvas } from '../mermaid-parser';
import { canvasToMermaid } from '../mermaid-generator';

// Example: Video Factory Workflow
const videoFactoryMermaid = `
flowchart LR
  A[User Input] --> B(Claude Generate Script)
  B --> C{Split Scenes}
  C --> D(Minimax Generate Video)
  C --> E(ElevenLabs Generate Audio)
  D --> F{Collect Media}
  E --> F
  F --> G(Shotstack Assemble)
  G --> H[Display Result]
`;

console.log('=== Original Mermaid ===');
console.log(videoFactoryMermaid);
console.log('');

// Parse to canvas
const canvas = mermaidToCanvas(videoFactoryMermaid);

console.log('=== Parsed Canvas ===');
console.log('Nodes:', canvas.nodes.length);
canvas.nodes.forEach(node => {
  console.log(`  - ${node.id}: ${node.type} (${node.data.label})`);
  if (node.data.worker_type) {
    console.log(`    Worker: ${node.data.worker_type}`);
  }
});
console.log('');
console.log('Edges:', canvas.edges.length);
canvas.edges.forEach(edge => {
  console.log(`  - ${edge.source} --> ${edge.target}`);
});
console.log('');

// Convert back to Mermaid
const regeneratedMermaid = canvasToMermaid(canvas);

console.log('=== Regenerated Mermaid ===');
console.log(regeneratedMermaid);
console.log('');

// Parse again to verify round-trip
const roundTripCanvas = mermaidToCanvas(regeneratedMermaid);

console.log('=== Round-Trip Verification ===');
console.log('Original nodes:', canvas.nodes.length);
console.log('Round-trip nodes:', roundTripCanvas.nodes.length);
console.log('Match:', canvas.nodes.length === roundTripCanvas.nodes.length);
console.log('');
console.log('Original edges:', canvas.edges.length);
console.log('Round-trip edges:', roundTripCanvas.edges.length);
console.log('Match:', canvas.edges.length === roundTripCanvas.edges.length);
console.log('');

// Verify node IDs match
const originalIds = canvas.nodes.map(n => n.id).sort();
const roundTripIds = roundTripCanvas.nodes.map(n => n.id).sort();
console.log('Node IDs match:', JSON.stringify(originalIds) === JSON.stringify(roundTripIds));

// Verify edges match
const originalEdges = canvas.edges.map(e => `${e.source}->${e.target}`).sort();
const roundTripEdges = roundTripCanvas.edges.map(e => `${e.source}->${e.target}`).sort();
console.log('Edges match:', JSON.stringify(originalEdges) === JSON.stringify(roundTripEdges));
