# Stitching Code Tool Examples

This document shows example outputs from the `stitch_get_stitching_code` tool for different framework and asset type combinations.

## Tool Usage

```javascript
// Call the tool with parameters
const result = await getStitchingCodeTool.handler({
    nodeId: "your-node-id",
    framework: "nextjs" | "express" | "python-flask",
    assetType: "landing-page" | "api"
});

// The result contains markdown-formatted code
const code = result.content[0].text;
```

## Supported Combinations

### 1. Next.js + Landing Page
- **Use Case**: React-based landing page with form submissions
- **Includes**: 
  - Helper utilities (`lib/stitch.ts`)
  - API route for form submission (`app/api/submit-form/route.ts`)
  - Health check endpoint (`app/api/health/route.ts`)
  - React form component example
  - Automatic uptime monitoring

### 2. Next.js + API
- **Use Case**: Next.js API backend receiving webhooks
- **Includes**:
  - Helper utilities (`lib/stitch.ts`)
  - Webhook handler endpoint (`app/api/webhook-handler/route.ts`)
  - Data processing endpoint example
  - Health check endpoint
  - Automatic uptime monitoring

### 3. Express.js + Landing Page
- **Use Case**: Express server with static landing page
- **Includes**:
  - Helper utilities (`lib/stitch.js`)
  - Form submission route (`routes/form.js`)
  - Health check route (`routes/health.js`)
  - Main app setup with static file serving
  - HTML form example
  - Background uptime monitoring

### 4. Express.js + API
- **Use Case**: Express API server
- **Includes**:
  - Helper utilities (`lib/stitch.js`)
  - Webhook handler route (`routes/webhooks.js`)
  - Data processing route example
  - Health check route
  - Background uptime monitoring

### 5. Flask + Landing Page
- **Use Case**: Python Flask app with landing page
- **Includes**:
  - Helper utilities (`lib/stitch.py`)
  - Form submission route
  - Health check route
  - HTML template example
  - Background uptime monitoring thread
  - Requirements.txt

### 6. Flask + API
- **Use Case**: Python Flask API server
- **Includes**:
  - Helper utilities (`lib/stitch.py`)
  - Webhook handler route
  - Data processing route example
  - Health check route
  - Background uptime monitoring thread
  - Requirements.txt

## Common Features

All generated code includes:

1. **Webhook Integration**: Send events to Stitch platform
2. **Uptime Monitoring**: Automatic health check pings every 5 minutes
3. **Error Handling**: Graceful error handling with logging
4. **Health Endpoints**: `/api/health` endpoint for monitoring
5. **Framework Best Practices**: Follows conventions for each framework

## Integration Steps

1. **Generate Code**: Use the MCP tool to generate code for your framework
2. **Copy Files**: Copy the generated code into your project
3. **Install Dependencies**: Install required packages (if any)
4. **Configure**: Update any configuration as needed
5. **Deploy**: Deploy your asset
6. **Monitor**: Check Stitch dashboard for uptime and events

## Example: Integrating a Next.js Landing Page

```bash
# 1. Generate the code (via MCP tool in Claude)
# Tool call: stitch_get_stitching_code
# Parameters: { nodeId: "abc123", framework: "nextjs", assetType: "landing-page" }

# 2. Copy the generated files into your Next.js project
# - lib/stitch.ts
# - app/api/submit-form/route.ts
# - app/api/health/route.ts
# - components/ContactForm.tsx

# 3. No additional dependencies needed (uses built-in fetch)

# 4. Deploy to Vercel/Netlify/etc
npm run build
npm run deploy

# 5. Your landing page is now integrated with Stitch!
```

## Customization

The generated code is a starting point. You can customize:

- Form fields and validation
- Event data structure
- Uptime ping frequency
- Health check logic
- Error handling behavior
- Additional endpoints

## Troubleshooting

### Events not appearing in Stitch
- Check that webhook URL is correct
- Verify network connectivity
- Check console for error messages
- Ensure JSON payload is valid

### Uptime showing as down
- Verify health endpoint is accessible
- Check uptime ping frequency
- Ensure server is running
- Check for network issues

### Form submissions failing
- Validate form data structure
- Check API route is working
- Verify CORS settings (if applicable)
- Check browser console for errors
