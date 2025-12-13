import { describe, it, expect } from 'vitest';
import { compileToOEG } from '@/lib/canvas/compile-oeg';
import { VisualGraph } from '@/types/canvas-schema';

describe('compileToOEG Optimization', () => {
    it('should populate inboundEdges for O(1) upstream lookup', () => {
        const visualGraph: VisualGraph = {
            nodes: [
                { id: 'A', type: 'worker', data: {}, position: { x: 0, y: 0 } },
                { id: 'B', type: 'worker', data: {}, position: { x: 100, y: 0 } },
                { id: 'C', type: 'collector', data: {}, position: { x: 200, y: 0 } }
            ],
            edges: [
                { id: 'e1', source: 'A', target: 'B', type: 'journey' },
                { id: 'e2', source: 'A', target: 'C', type: 'journey' },
                { id: 'e3', source: 'B', target: 'C', type: 'journey' }
            ],
            viewport: { x: 0, y: 0, zoom: 1 }
        };

        const result = compileToOEG(visualGraph);
        expect(result.success).toBe(true);

        const graph = result.executionGraph!;
        expect(graph.inboundEdges).toBeDefined();

        // A has no incoming edges
        expect(graph.inboundEdges['A']).toEqual([]);

        // B has incoming from A
        expect(graph.inboundEdges['B']).toEqual(['A']);

        // C has incoming from A and B
        // output order is not guaranteed to be sorted, so try to match array content
        expect(graph.inboundEdges['C']).toHaveLength(2);
        expect(graph.inboundEdges['C']).toContain('A');
        expect(graph.inboundEdges['C']).toContain('B');
    });

    it('should exclude system edges from inboundEdges', () => {
        const visualGraph: VisualGraph = {
            nodes: [
                { id: 'start', type: 'worker', data: {}, position: { x: 0, y: 0 } },
                { id: 'process', type: 'worker', data: {}, position: { x: 100, y: 0 } },
                { id: 'background', type: 'worker', data: {}, position: { x: 100, y: 100 } }
            ],
            edges: [
                // Logical flow
                { id: 'e1', source: 'start', target: 'process', type: 'journey' },
                // System Trigger (Background) - Should NOT create dependency
                { id: 'sys1', source: 'start', target: 'background', type: 'system' }
            ],
            viewport: { x: 0, y: 0, zoom: 1 }
        };

        const result = compileToOEG(visualGraph);
        expect(result.success).toBe(true);
        const graph = result.executionGraph!;

        // Check Process (Standard Dependency)
        expect(graph.inboundEdges['process']).toEqual(['start']);

        // Check Background (System Dependency) -> Should be EMPTY in inboundEdges
        // System edges do not create logical dependencies in the Execution Graph
        expect(graph.inboundEdges['background']).toEqual([]);

        // However, it SHOULD appear in outboundEdges for the engine to find it
        expect(graph.outboundEdges['start']).toHaveLength(2);
    });
});
