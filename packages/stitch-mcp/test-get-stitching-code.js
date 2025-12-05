#!/usr/bin/env node

/**
 * Test script for the stitch_get_stitching_code tool
 * This verifies that the tool generates code for all framework/asset type combinations
 */

import { getStitchingCodeTool } from './dist/tools/get-stitching-code.js';

const testCases = [
    { nodeId: "test-node-1", framework: "nextjs", assetType: "landing-page" },
    { nodeId: "test-node-2", framework: "nextjs", assetType: "api" },
    { nodeId: "test-node-3", framework: "express", assetType: "landing-page" },
    { nodeId: "test-node-4", framework: "express", assetType: "api" },
    { nodeId: "test-node-5", framework: "python-flask", assetType: "landing-page" },
    { nodeId: "test-node-6", framework: "python-flask", assetType: "api" },
];

console.log("Testing stitch_get_stitching_code tool...\n");

for (const testCase of testCases) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`Testing: ${testCase.framework} + ${testCase.assetType}`);
    console.log("=".repeat(80));
    
    try {
        const result = await getStitchingCodeTool.handler(testCase);
        
        if (result.isError) {
            console.error("❌ FAILED:", result.content[0].text);
        } else {
            const code = result.content[0].text;
            console.log("✅ SUCCESS - Generated code length:", code.length, "characters");
            
            // Verify the code contains expected elements
            const checks = [
                { name: "Node ID", pattern: testCase.nodeId },
                { name: "Webhook URL", pattern: "/api/webhooks/node/" },
                { name: "Uptime URL", pattern: "/api/uptime/ping/" },
            ];
            
            for (const check of checks) {
                if (code.includes(check.pattern)) {
                    console.log(`  ✓ Contains ${check.name}`);
                } else {
                    console.log(`  ✗ Missing ${check.name}`);
                }
            }
        }
    } catch (_error) {
        console.error("❌ ERROR:", error.message);
    }
}

// Test error cases
console.log(`\n${"=".repeat(80)}`);
console.log("Testing error handling...");
console.log("=".repeat(80));

const errorCases = [
    { params: { nodeId: "", framework: "nextjs", assetType: "landing-page" }, desc: "Empty node ID" },
    { params: { nodeId: "test", framework: "invalid", assetType: "landing-page" }, desc: "Invalid framework" },
    { params: { nodeId: "test", framework: "nextjs", assetType: "invalid" }, desc: "Invalid asset type" },
    { params: { framework: "nextjs", assetType: "landing-page" }, desc: "Missing node ID" },
];

for (const errorCase of errorCases) {
    try {
        const result = await getStitchingCodeTool.handler(errorCase.params);
        if (result.isError) {
            console.log(`✅ ${errorCase.desc}: Correctly returned error`);
        } else {
            console.log(`❌ ${errorCase.desc}: Should have returned error`);
        }
    } catch (_error) {
        console.log(`✅ ${errorCase.desc}: Correctly threw error`);
    }
}

console.log("\n" + "=".repeat(80));
console.log("Test complete!");
console.log("=".repeat(80));
