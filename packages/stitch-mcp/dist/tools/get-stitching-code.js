import { z } from "zod";
const STITCH_URL = process.env.STITCH_URL || "http://localhost:3000";
// Input validation schema
const GetStitchingCodeParamsSchema = z.object({
    nodeId: z.string().min(1, "Node ID is required"),
    framework: z.enum(["nextjs", "express", "python-flask"], {
        errorMap: () => ({ message: "Framework must be 'nextjs', 'express', or 'python-flask'" })
    }),
    assetType: z.enum(["landing-page", "api"], {
        errorMap: () => ({ message: "Asset type must be 'landing-page' or 'api'" })
    })
});
// Template generators for each framework
function generateNextJsCode(nodeId, webhookUrl, uptimeUrl, assetType) {
    const baseHelpers = `// lib/stitch.ts
export const STITCH_WEBHOOK_URL = "${webhookUrl}";
export const STITCH_UPTIME_URL = "${uptimeUrl}";
export const STITCH_NODE_ID = "${nodeId}";

export async function sendStitchEvent(event: string, data: Record<string, unknown>) {
  try {
    const response = await fetch(STITCH_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      console.error("Failed to send Stitch event:", await response.text());
    }
    
    return response.ok;
  } catch (_error) {
    console.error("Error sending Stitch event:", error);
    return false;
  }
}

export async function sendUptimePing(status: "healthy" | "degraded" | "down" = "healthy") {
  try {
    const response = await fetch(STITCH_UPTIME_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        metadata: {
          timestamp: new Date().toISOString(),
          nodeId: STITCH_NODE_ID
        }
      })
    });
    
    return response.ok;
  } catch (_error) {
    console.error("Error sending uptime ping:", error);
    return false;
  }
}`;
    if (assetType === "landing-page") {
        return `# Next.js Integration for Landing Page

${baseHelpers}

// app/api/submit-form/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendStitchEvent } from "@/lib/stitch";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();
    
    // Send form submission to Stitch
    await sendStitchEvent("form_submission", {
      email: formData.email,
      name: formData.name,
      ...formData
    });
    
    return NextResponse.json({ success: true });
  } catch (_error) {
    console.error("Form submission error:", error);
    return NextResponse.json(
      { error: "Failed to process form" },
      { status: 500 }
    );
  }
}

// app/api/health/route.ts
import { NextResponse } from "next/server";
import { sendUptimePing } from "@/lib/stitch";

export async function GET() {
  await sendUptimePing("healthy");
  return NextResponse.json({ status: "ok" });
}

// Example: Form component usage
// components/ContactForm.tsx
"use client";

import { useState } from "react";

export function ContactForm() {
  const [formData, setFormData] = useState({ email: "", name: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    
    try {
      const response = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setStatus("success");
        setFormData({ email: "", name: "" });
      }
    } catch (_error) {
      console.error("Submission error:", error);
      setStatus("idle");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting..." : "Submit"}
      </button>
      {status === "success" && <p>Thank you! We'll be in touch.</p>}
    </form>
  );
}

// Setup uptime monitoring (add to app/layout.tsx or middleware)
// This sends a ping every 5 minutes
if (typeof window === "undefined") {
  setInterval(async () => {
    const { sendUptimePing } = await import("@/lib/stitch");
    await sendUptimePing("healthy");
  }, 5 * 60 * 1000);
}`;
    }
    else {
        return `# Next.js Integration for API

${baseHelpers}

// app/api/webhook-handler/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendStitchEvent } from "@/lib/stitch";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    // Process the webhook payload
    console.log("Received webhook:", payload);
    
    // Notify Stitch about the webhook event
    await sendStitchEvent("webhook_received", {
      source: payload.source || "unknown",
      eventType: payload.type,
      data: payload
    });
    
    return NextResponse.json({ received: true });
  } catch (_error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// app/api/health/route.ts
import { NextResponse } from "next/server";
import { sendUptimePing } from "@/lib/stitch";

export async function GET() {
  await sendUptimePing("healthy");
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}

// Example: API endpoint with Stitch integration
// app/api/process-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendStitchEvent } from "@/lib/stitch";

export async function POST(request: NextRequest) {
  try {
    const _data = await request.json();
    
    // Process your data
    const result = await processData(data);
    
    // Notify Stitch about the processing
    await sendStitchEvent("data_processed", {
      inputSize: JSON.stringify(data).length,
      outputSize: JSON.stringify(result).length,
      success: true
    });
    
    return NextResponse.json(result);
  } catch (_error) {
    await sendStitchEvent("data_processing_failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}

async function processData(data: unknown) {
  // Your processing logic here
  return { processed: true, data };
}

// Setup uptime monitoring (add to middleware.ts or a cron job)
// This sends a ping every 5 minutes
if (process.env.NODE_ENV === "production") {
  setInterval(async () => {
    const { sendUptimePing } = await import("@/lib/stitch");
    await sendUptimePing("healthy");
  }, 5 * 60 * 1000);
}`;
    }
}
function generateExpressCode(nodeId, webhookUrl, uptimeUrl, assetType) {
    const baseHelpers = `// lib/stitch.js
const STITCH_WEBHOOK_URL = "${webhookUrl}";
const STITCH_UPTIME_URL = "${uptimeUrl}";
const STITCH_NODE_ID = "${nodeId}";

async function sendStitchEvent(event, data) {
  try {
    const response = await fetch(STITCH_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      console.error("Failed to send Stitch event:", await response.text());
    }
    
    return response.ok;
  } catch (_error) {
    console.error("Error sending Stitch event:", error);
    return false;
  }
}

async function sendUptimePing(status = "healthy") {
  try {
    const response = await fetch(STITCH_UPTIME_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        metadata: {
          timestamp: new Date().toISOString(),
          nodeId: STITCH_NODE_ID
        }
      })
    });
    
    return response.ok;
  } catch (_error) {
    console.error("Error sending uptime ping:", error);
    return false;
  }
}

module.exports = { sendStitchEvent, sendUptimePing, STITCH_NODE_ID };`;
    if (assetType === "landing-page") {
        return `# Express.js Integration for Landing Page

${baseHelpers}

// routes/form.js
const express = require("express");
const { sendStitchEvent } = require("../lib/stitch");
const router = express.Router();

router.post("/submit-form", async (req, res) => {
  try {
    const formData = req.body;
    
    // Validate form data
    if (!formData.email || !formData.name) {
      return res.status(400).json({ error: "Email and name are required" });
    }
    
    // Send form submission to Stitch
    await sendStitchEvent("form_submission", {
      email: formData.email,
      name: formData.name,
      ...formData
    });
    
    res.json({ success: true, message: "Form submitted successfully" });
  } catch (_error) {
    console.error("Form submission error:", error);
    res.status(500).json({ error: "Failed to process form" });
  }
});

module.exports = router;

// routes/health.js
const express = require("express");
const { sendUptimePing } = require("../lib/stitch");
const router = express.Router();

router.get("/health", async (req, res) => {
  await sendUptimePing("healthy");
  res.json({ status: "ok" });
});

module.exports = router;

// app.js (main application file)
const express = require("express");
const formRoutes = require("./routes/form");
const healthRoutes = require("./routes/health");
const { sendUptimePing } = require("./lib/stitch");

const app = express();
app.use(express.json());

// Mount routes
app.use("/api", formRoutes);
app.use("/api", healthRoutes);

// Serve static files (your landing page)
app.use(express.static("public"));

// Setup uptime monitoring (ping every 5 minutes)
setInterval(async () => {
  await sendUptimePing("healthy");
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

// public/index.html (example landing page with form)
/*
<!DOCTYPE html>
<html>
<head>
  <title>Landing Page</title>
</head>
<body>
  <h1>Contact Us</h1>
  <form id="contactForm">
    <input type="text" name="name" placeholder="Name" required />
    <input type="email" name="email" placeholder="Email" required />
    <button type="submit">Submit</button>
  </form>
  <div id="message"></div>

  <script>
    document.getElementById("contactForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const _data = Object.fromEntries(formData);
      
      try {
        const response = await fetch("/api/submit-form", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          document.getElementById("message").textContent = "Thank you! We'll be in touch.";
          e.target.reset();
        }
      } catch (_error) {
        console.error("Submission error:", error);
      }
    });
  </script>
</body>
</html>
*/`;
    }
    else {
        return `# Express.js Integration for API

${baseHelpers}

// routes/webhooks.js
const express = require("express");
const { sendStitchEvent } = require("../lib/stitch");
const router = express.Router();

router.post("/webhook-handler", async (req, res) => {
  try {
    const payload = req.body;
    
    // Process the webhook payload
    console.log("Received webhook:", payload);
    
    // Notify Stitch about the webhook event
    await sendStitchEvent("webhook_received", {
      source: payload.source || "unknown",
      eventType: payload.type,
      data: payload
    });
    
    res.json({ received: true });
  } catch (_error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

module.exports = router;

// routes/api.js
const express = require("express");
const { sendStitchEvent } = require("../lib/stitch");
const router = express.Router();

router.post("/process-data", async (req, res) => {
  try {
    const _data = req.body;
    
    // Process your data
    const result = await processData(data);
    
    // Notify Stitch about the processing
    await sendStitchEvent("data_processed", {
      inputSize: JSON.stringify(data).length,
      outputSize: JSON.stringify(result).length,
      success: true
    });
    
    res.json(result);
  } catch (_error) {
    await sendStitchEvent("data_processing_failed", {
      error: error.message
    });
    
    res.status(500).json({ error: "Processing failed" });
  }
});

async function processData(data) {
  // Your processing logic here
  return { processed: true, data };
}

module.exports = router;

// routes/health.js
const express = require("express");
const { sendUptimePing } = require("../lib/stitch");
const router = express.Router();

router.get("/health", async (req, res) => {
  await sendUptimePing("healthy");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

module.exports = router;

// app.js (main application file)
const express = require("express");
const webhookRoutes = require("./routes/webhooks");
const apiRoutes = require("./routes/api");
const healthRoutes = require("./routes/health");
const { sendUptimePing } = require("./lib/stitch");

const app = express();
app.use(express.json());

// Mount routes
app.use("/api", webhookRoutes);
app.use("/api", apiRoutes);
app.use("/api", healthRoutes);

// Setup uptime monitoring (ping every 5 minutes)
setInterval(async () => {
  await sendUptimePing("healthy");
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`API server running on port \${PORT}\`);
});`;
    }
}
function generateFlaskCode(nodeId, webhookUrl, uptimeUrl, assetType) {
    const baseHelpers = `# lib/stitch.py
import requests
import json
from datetime import datetime
from typing import Dict, Any, Optional

STITCH_WEBHOOK_URL = "${webhookUrl}"
STITCH_UPTIME_URL = "${uptimeUrl}"
STITCH_NODE_ID = "${nodeId}"

def send_stitch_event(event: str, data: Dict[str, Any]) -> bool:
    """Send an event to Stitch platform"""
    try:
        payload = {
            "event": event,
            "data": data,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        response = requests.post(
            STITCH_WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if not response.ok:
            print(f"Failed to send Stitch event: {response.text}")
        
        return response.ok
    except Exception as e:
        print(f"Error sending Stitch event: {e}")
        return False

def send_uptime_ping(status: str = "healthy") -> bool:
    """Send uptime ping to Stitch platform"""
    try:
        payload = {
            "status": status,
            "metadata": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "nodeId": STITCH_NODE_ID
            }
        }
        
        response = requests.post(
            STITCH_UPTIME_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        return response.ok
    except Exception as e:
        print(f"Error sending uptime ping: {e}")
        return False`;
    if (assetType === "landing-page") {
        return `# Flask Integration for Landing Page

${baseHelpers}

# app.py
from flask import Flask, request, jsonify, render_template
from lib.stitch import send_stitch_event, send_uptime_ping
import threading
import time

app = Flask(__name__)

@app.route("/")
def index():
    """Serve the landing page"""
    return render_template("index.html")

@app.route("/api/submit-form", methods=["POST"])
def submit_form():
    """Handle form submissions"""
    try:
        form_data = request.get_json()
        
        # Validate form data
        if not form_data.get("email") or not form_data.get("name"):
            return jsonify({"error": "Email and name are required"}), 400
        
        # Send form submission to Stitch
        send_stitch_event("form_submission", {
            "email": form_data.get("email"),
            "name": form_data.get("name"),
            **form_data
        })
        
        return jsonify({"success": True, "message": "Form submitted successfully"})
    except Exception as e:
        print(f"Form submission error: {e}")
        return jsonify({"error": "Failed to process form"}), 500

@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint"""
    send_uptime_ping("healthy")
    return jsonify({"status": "ok"})

def uptime_monitor():
    """Background thread for uptime monitoring"""
    while True:
        time.sleep(5 * 60)  # 5 minutes
        send_uptime_ping("healthy")

if __name__ == "__main__":
    # Start uptime monitoring in background
    monitor_thread = threading.Thread(target=uptime_monitor, daemon=True)
    monitor_thread.start()
    
    app.run(host="0.0.0.0", port=5000)

# templates/index.html (example landing page)
"""
<!DOCTYPE html>
<html>
<head>
    <title>Landing Page</title>
</head>
<body>
    <h1>Contact Us</h1>
    <form id="contactForm">
        <input type="text" name="name" placeholder="Name" required />
        <input type="email" name="email" placeholder="Email" required />
        <button type="submit">Submit</button>
    </form>
    <div id="message"></div>

    <script>
        document.getElementById("contactForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const _data = Object.fromEntries(formData);
            
            try {
                const response = await fetch("/api/submit-form", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                if (response.ok) {
                    document.getElementById("message").textContent = "Thank you! We'll be in touch.";
                    e.target.reset();
                }
            } catch (_error) {
                console.error("Submission error:", error);
            }
        });
    </script>
</body>
</html>
"""

# requirements.txt
"""
Flask==3.0.0
requests==2.31.0
"""`;
    }
    else {
        return `# Flask Integration for API

${baseHelpers}

# app.py
from flask import Flask, request, jsonify
from lib.stitch import send_stitch_event, send_uptime_ping
import threading
import time

app = Flask(__name__)

@app.route("/api/webhook-handler", methods=["POST"])
def webhook_handler():
    """Handle incoming webhooks"""
    try:
        payload = request.get_json()
        
        # Process the webhook payload
        print(f"Received webhook: {payload}")
        
        # Notify Stitch about the webhook event
        send_stitch_event("webhook_received", {
            "source": payload.get("source", "unknown"),
            "eventType": payload.get("type"),
            "data": payload
        })
        
        return jsonify({"received": True})
    except Exception as e:
        print(f"Webhook processing error: {e}")
        return jsonify({"error": "Failed to process webhook"}), 500

@app.route("/api/process-data", methods=["POST"])
def process_data():
    """Process data and notify Stitch"""
    try:
        data = request.get_json()
        
        # Process your data
        result = process_data_logic(data)
        
        # Notify Stitch about the processing
        send_stitch_event("data_processed", {
            "inputSize": len(str(data)),
            "outputSize": len(str(result)),
            "success": True
        })
        
        return jsonify(result)
    except Exception as e:
        send_stitch_event("data_processing_failed", {
            "error": str(e)
        })
        
        return jsonify({"error": "Processing failed"}), 500

def process_data_logic(data):
    """Your data processing logic"""
    return {"processed": True, "data": data}

@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint"""
    send_uptime_ping("healthy")
    return jsonify({
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })

def uptime_monitor():
    """Background thread for uptime monitoring"""
    while True:
        time.sleep(5 * 60)  # 5 minutes
        send_uptime_ping("healthy")

if __name__ == "__main__":
    # Start uptime monitoring in background
    monitor_thread = threading.Thread(target=uptime_monitor, daemon=True)
    monitor_thread.start()
    
    app.run(host="0.0.0.0", port=5000)

# requirements.txt
"""
Flask==3.0.0
requests==2.31.0
"""`;
    }
}
export const getStitchingCodeTool = {
    name: "stitch_get_stitching_code",
    description: "Generate framework-specific integration code for connecting external assets to Stitch platform",
    inputSchema: {
        type: "object",
        properties: {
            nodeId: {
                type: "string",
                description: "The node ID for which to generate integration code"
            },
            framework: {
                type: "string",
                enum: ["nextjs", "express", "python-flask"],
                description: "Target framework for the integration code"
            },
            assetType: {
                type: "string",
                enum: ["landing-page", "api"],
                description: "Type of asset being integrated (landing-page includes forms, api includes webhooks)"
            }
        },
        required: ["nodeId", "framework", "assetType"]
    },
    handler: async (params) => {
        try {
            // Validate input parameters
            const validatedParams = GetStitchingCodeParamsSchema.parse(params);
            // Generate webhook and uptime URLs
            const webhookUrl = `${STITCH_URL}/api/webhooks/node/${validatedParams.nodeId}`;
            const uptimeUrl = `${STITCH_URL}/api/uptime/ping/${validatedParams.nodeId}`;
            // Generate framework-specific code
            let code;
            switch (validatedParams.framework) {
                case "nextjs":
                    code = generateNextJsCode(validatedParams.nodeId, webhookUrl, uptimeUrl, validatedParams.assetType);
                    break;
                case "express":
                    code = generateExpressCode(validatedParams.nodeId, webhookUrl, uptimeUrl, validatedParams.assetType);
                    break;
                case "python-flask":
                    code = generateFlaskCode(validatedParams.nodeId, webhookUrl, uptimeUrl, validatedParams.assetType);
                    break;
            }
            return {
                content: [
                    {
                        type: "text",
                        text: code
                    }
                ]
            };
        }
        catch (_error) {
            // Handle validation errors with clear parameter names
            if (_error instanceof z.ZodError) {
                const errorDetails = _error.errors.map((e) => ({
                    parameter: e.path.join('.') || 'root',
                    message: e.message,
                    code: e.code
                }));
                const errorMessages = errorDetails
                    .map((e) => `- Parameter '${e.parameter}': ${e.message}`)
                    .join('\n');
                return {
                    content: [
                        {
                            type: "text",
                            text: `**Error: Invalid Parameters**

The following parameters are invalid:

${errorMessages}

**Valid values:**
- framework: "nextjs", "express", or "python-flask"
- assetType: "landing-page" or "api"
- nodeId: non-empty string`
                        }
                    ],
                    isError: true
                };
            }
            // Handle other errors
            const errorMessage = _error instanceof Error ? _error.message : String(_error);
            return {
                content: [
                    {
                        type: "text",
                        text: `**Error: Code Generation Failed**

${errorMessage}

Please ensure all parameters are valid and try again.`
                    }
                ],
                isError: true
            };
        }
    }
};
