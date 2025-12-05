# Tracking Links System Guide

## Overview

The Tracking Links system allows you to generate unique URLs for marketing campaigns that automatically track visitors as leads/entities in Stitch. This is perfect for:

- Social media posts (LinkedIn, Twitter, Facebook)
- Email campaigns
- Paid advertising
- Referral programs
- A/B testing different marketing channels

## Architecture

### Components

1. **Link Generator Worker** (`link-generator`)
   - Sync worker that generates tracking URLs
   - Creates unique tracking IDs
   - Optionally pre-creates entities in the database
   - Returns complete tracking URL with UTM parameters

2. **Tracking API** (`/api/track`)
   - Captures visitor information when they click the link
   - Updates or creates entity with UTM parameters
   - Redirects to the specified destination

3. **Tracking Page** (`/track`)
   - Client-side page that handles the tracking flow
   - Shows loading state while tracking
   - Redirects to final destination

4. **MCP Tool** (`stitch_generate_tracking_link`)
   - Allows AI assistants to generate tracking links
   - Accessible via Claude Desktop or other MCP clients

## How It Works

### Flow Diagram

```
1. Generate Link (via Worker or MCP)
   ↓
2. Share Link (LinkedIn, Email, etc.)
   ↓
3. User Clicks Link
   ↓
4. /track page loads → /api/track captures data
   ↓
5. Entity created/updated with UTM params
   ↓
6. User redirected to destination
```

## Usage

### Option 1: Using the Worker in a Workflow

Create a workflow with the `link-generator` worker:

```json
{
  "id": "generate-linkedin-link",
  "type": "worker",
  "data": {
    "label": "Generate LinkedIn Demo Link",
    "worker_type": "link-generator",
    "config": {
      "utm_source": "linkedin",
      "utm_campaign": "demo_call_q1",
      "utm_medium": "social",
      "redirect_to": "https://calendly.com/your-demo",
      "canvas_id": "your-canvas-id"
    }
  }
}
```

**Output:**
```json
{
  "tracking_url": "https://yourdomain.com/track?tracking_id=linkedin_demo_call_q1_1234567890_abc123&utm_source=linkedin&utm_campaign=demo_call_q1&utm_medium=social&redirect_to=https://calendly.com/your-demo",
  "tracking_id": "linkedin_demo_call_q1_1234567890_abc123",
  "entity_id": "uuid-of-pre-created-entity",
  "utm_params": {
    "source": "linkedin",
    "medium": "social",
    "campaign": "demo_call_q1"
  }
}
```

### Option 2: Using the AI Assistant

Ask the AI Assistant in Stitch:

```
"I need a tracking link for a LinkedIn post that leads to a demo call"
```

The AI will:
1. Use the `link-generator` worker
2. Generate a unique tracking URL
3. Return the link to you

### Option 3: Using the MCP Tool

Via Claude Desktop or MCP client:

```javascript
stitch_generate_tracking_link({
  canvasId: "your-canvas-id",
  utmSource: "linkedin",
  utmCampaign: "demo_call",
  utmMedium: "social",
  redirectTo: "/demo"
})
```

## Configuration Options

### Worker Input Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `utm_source` | string | Yes | Traffic source (e.g., "linkedin", "facebook", "email") |
| `utm_campaign` | string | No | Campaign name (e.g., "demo_call", "product_launch") |
| `utm_medium` | string | No | Marketing medium (e.g., "social", "cpc", "email") |
| `utm_content` | string | No | Content variation for A/B testing |
| `utm_term` | string | No | Paid search keywords |
| `landing_path` | string | No | Landing page path (default: "/track") |
| `redirect_to` | string | No | Final destination URL |
| `canvas_id` | string | No | Canvas to associate entity with |
| `create_entity` | boolean | No | Pre-create entity (default: true) |

### Environment Variables

Make sure `NEXT_PUBLIC_BASE_URL` is set in your `.env.local`:

```bash
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## Entity Tracking

When someone clicks a tracking link, an entity is created/updated with:

```json
{
  "name": "Lead from linkedin",
  "entity_type": "lead",
  "metadata": {
    "source": "linkedin",
    "medium": "social",
    "campaign": "demo_call",
    "tracking_id": "linkedin_demo_call_1234567890_abc123",
    "visited_at": "2025-12-05T10:30:00Z",
    "user_agent": "Mozilla/5.0...",
    "referer": "https://linkedin.com/...",
    "ip": "192.168.1.1"
  }
}
```

## Use Cases

### 1. LinkedIn Post for Demo Calls

**Request to AI:**
```
"Generate a tracking link for LinkedIn that redirects to our Calendly demo page"
```

**Result:**
```
https://yourdomain.com/track?tracking_id=linkedin_demo_1234&utm_source=linkedin&utm_campaign=demo_call&redirect_to=https://calendly.com/demo
```

### 2. Email Campaign with A/B Testing

**Workflow:**
```
Generate Link A (blue button) → Email Segment A
Generate Link B (green button) → Email Segment B
```

**Links:**
- Link A: `?utm_content=button_blue`
- Link B: `?utm_content=button_green`

Track which button performs better by analyzing entity metadata.

### 3. Multi-Channel Campaign

**Workflow:**
```
Generate LinkedIn Link → Post on LinkedIn
Generate Twitter Link → Post on Twitter
Generate Email Link → Send Email Campaign
```

All links redirect to the same page but track different sources.

## Integration with Workflows

### Example: Lead Generation Workflow

```
[Link Generator] → [Store Link] → [Send to Marketing Team]
                                          ↓
                                   [Monitor Clicks]
                                          ↓
                                   [Qualify Leads]
                                          ↓
                                   [Send to Sales]
```

### Example: Attribution Workflow

```
[Visitor Clicks Link] → [Entity Created] → [Track Journey]
                                                  ↓
                                           [Conversion Event]
                                                  ↓
                                           [Calculate ROI]
```

## API Reference

### POST /api/track

Captures tracking information and redirects.

**Query Parameters:**
- `tracking_id`: Unique tracking identifier
- `utm_source`: Traffic source
- `utm_medium`: Marketing medium
- `utm_campaign`: Campaign name
- `utm_content`: Content variation
- `utm_term`: Search terms
- `redirect_to`: Destination URL
- `entity_id`: Existing entity ID (optional)

**Response:**
- 302 Redirect to `redirect_to` URL

## Best Practices

1. **Use Descriptive Campaign Names**
   - Good: `demo_call_q1_2025`
   - Bad: `campaign1`

2. **Always Set redirect_to**
   - Specify where users should land
   - Use full URLs for external destinations

3. **Pre-create Entities**
   - Set `create_entity: true` to track link generation
   - Helps measure link performance even if not clicked

4. **Use Consistent UTM Parameters**
   - Standardize your source names (e.g., always "linkedin", not "LinkedIn" or "LI")
   - Makes analytics easier

5. **Track Link Performance**
   - Monitor which links get clicked
   - Compare conversion rates across channels

## Troubleshooting

### Link doesn't track visitors

**Check:**
1. Is `NEXT_PUBLIC_BASE_URL` set correctly?
2. Is the tracking API accessible?
3. Check browser console for errors

### Entity not created

**Check:**
1. Is `canvas_id` valid?
2. Does the canvas exist in the database?
3. Check server logs for errors

### Redirect not working

**Check:**
1. Is `redirect_to` a valid URL?
2. For external URLs, use full path with `https://`
3. For internal paths, use relative paths like `/demo`

## Future Enhancements

- [ ] Link shortening integration (bit.ly, etc.)
- [ ] QR code generation for tracking links
- [ ] Analytics dashboard for link performance
- [ ] Automatic link expiration
- [ ] Custom landing pages per campaign
- [ ] Webhook notifications on link clicks
