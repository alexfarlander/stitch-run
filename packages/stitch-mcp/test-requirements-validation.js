#!/usr/bin/env node

/**
 * Validate implementation against requirements 2.1-2.6
 */

import { getStitchingCodeTool } from './dist/tools/get-stitching-code.js';

console.log("Validating against Requirements 2.1-2.6...\n");

const requirements = [
    {
        id: "2.1",
        desc: "Return framework-specific integration code",
        test: async () => {
            const frameworks = ["nextjs", "express", "python-flask"];
            for (const framework of frameworks) {
                const result = await getStitchingCodeTool.handler({
                    nodeId: "test",
                    framework,
                    assetType: "landing-page"
                });
                if (result.isError) return false;
            }
            return true;
        }
    },
    {
        id: "2.2",
        desc: "Provide Next.js API route code and helper utilities",
        test: async () => {
            const result = await getStitchingCodeTool.handler({
                nodeId: "test",
                framework: "nextjs",
                assetType: "landing-page"
            });
            const code = result.content[0].text;
            return code.includes("lib/stitch.ts") && 
                   code.includes("sendStitchEvent") &&
                   code.includes("sendUptimePing") &&
                   code.includes("app/api/");
        }
    },
    {
        id: "2.3",
        desc: "Provide Express.js middleware and route handlers",
        test: async () => {
            const result = await getStitchingCodeTool.handler({
                nodeId: "test",
                framework: "express",
                assetType: "landing-page"
            });
            const code = result.content[0].text;
            return code.includes("lib/stitch.js") &&
                   code.includes("express.Router()") &&
                   code.includes("routes/");
        }
    },
    {
        id: "2.4",
        desc: "Provide Flask route handlers and helper functions",
        test: async () => {
            const result = await getStitchingCodeTool.handler({
                nodeId: "test",
                framework: "python-flask",
                assetType: "landing-page"
            });
            const code = result.content[0].text;
            return code.includes("lib/stitch.py") &&
                   code.includes("from flask import") &&
                   code.includes("@app.route");
        }
    },
    {
        id: "2.5",
        desc: "Include form submission and analytics tracking code for landing-page",
        test: async () => {
            const result = await getStitchingCodeTool.handler({
                nodeId: "test",
                framework: "nextjs",
                assetType: "landing-page"
            });
            const code = result.content[0].text;
            return code.includes("form") &&
                   code.includes("submit") &&
                   code.includes("email");
        }
    },
    {
        id: "2.6",
        desc: "Include webhook notification and health check code for api",
        test: async () => {
            const result = await getStitchingCodeTool.handler({
                nodeId: "test",
                framework: "nextjs",
                assetType: "api"
            });
            const code = result.content[0].text;
            return code.includes("webhook") &&
                   code.includes("health") &&
                   code.includes("/api/health");
        }
    }
];

let passed = 0;
let failed = 0;

for (const req of requirements) {
    try {
        const result = await req.test();
        if (result) {
            console.log(`✅ Requirement ${req.id}: ${req.desc}`);
            passed++;
        } else {
            console.log(`❌ Requirement ${req.id}: ${req.desc}`);
            failed++;
        }
    } catch (_error) {
        console.log(`❌ Requirement ${req.id}: ${req.desc} - Error: ${error.message}`);
        failed++;
    }
}

console.log("\n" + "=".repeat(80));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=".repeat(80));

if (failed === 0) {
    console.log("\n✅ All requirements validated successfully!");
} else {
    console.log("\n❌ Some requirements failed validation");
    process.exit(1);
}
