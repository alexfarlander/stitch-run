# Tracking Links Implementation Summary

## What Was Built

A complete tracking link generation system that allows you to create unique URLs for marketing campaigns and automatically track visitors as leads/entities in Stitch.

## Components Created

### 1. Link Generator Worker
**File:** `src/lib/workers/link-generator.ts`

- **Type:** Sync worker
- **Purpose:** Generates tracking URLs with UTM parameters
- **Features:**
  - Creates unique tracking IDs
  - Builds URLs with all UTM parameters
  - Optionally pre-creates entities in database
  - Returns complete tracking information

**Worker Definition:** Added to `src/lib/workers/registry.ts`
- Input schema: utm_source, utm_campaign, utm_medium, etc.
- Output schema: tracking_url, tracking_id, entity_id, utm_params
- Registered in worker registry

### 2. Tracking API Endpoint
**File:** `src/app/api/track/route.ts`

- **Method:** GET
- **Purpose:** Captures visitor information when they click tracking links
- **Features:**
  - Extracts UTM parameters from URL
  - Creates or updates entity with tracking data
  - Captures visitor metadata (user agent, IP, referer)
  - Redirects to specified destination

### 3. Tracking Landing Page
**File:** `src/app/track/page.tsx`

- **Purpose:** Client-side tracking page with loading state
- **Features:**
  - Shows loading indicator while tracking
  - Calls tracking API
  - Handles redirects (internal and external)
  - Error handling with fallback redirect

### 4. MCP Tool
**File:** `packages/stitch-mcp/src/tools/generate-tracking-link.ts`

- **Tool Name:** `stitch_generate_tracking_link`
- **Purpose:** Allows AI assistants to generate tracking links
- **Features:**
  - Input validation with Zod
  - Generates tracking URLs
  - Optionally creates entities via API
  - Returns formatted response with instructions

**Registered in:** `packages/stitch-mcp/src/tools/index.ts`

### 5. Documentation
- **TRACKING_LINKS_GUIDE.md** - Complete user guide
- **TRACKING_LINKS_IMPLEMENTATION.md** - This file
- Updated MCP instructions in `packages/stitch-mcp/src/resources/instructions.ts`

### 6. Test Script
**File:** `scripts/test-link-generator.ts`

- Demonstrates link generation for different use cases
- Shows expected output format
- Provides next steps for testing

## How It Works

### Flow

```
User Request → AI Assistant → Link Generator Worker → Tracking URL
                                                            ↓
                                                    Share on LinkedIn
                                                            ↓
                                                    Visitor Clicks
                                                            ↓
                                                    /track page loads
                                                            ↓
                                                    /api/track captures data
                                                            ↓
                                                    Entity created/updated
                                                            ↓
                                                    Redirect to destination
```

### Data Flow

1. **Link Generation:**
   ```json
   Input: {
     "utm_source": "linkedin",
     "utm_campaign": "demo_call",
     "redirect_to": "https://calendly.com/demo"
   }
   
   Output: {
     "tracking_url": "https://yourdomain.com/track?tracking_id=xyz&utm_source=linkedin...",
     "tracking_id": "linkedin_demo_call_1234567890_abc123",
     "entity_id": "uuid"
   }
   ```

2. **Visitor Tracking:**
   ```json
   Entity Metadata: {
     "source": "linkedin",
     "campaign": "demo_call",
     "tracking_id": "linkedin_demo_call_1234567890_abc123",
     "visited_at": "2025-12-05T10:30:00Z",
     "user_agent": "Mozilla/5.0...",
     "ip": "192.168.1.1"
   }
   ```

## Integration Points

### With AI Assistant
The AI Assistant can now respond to requests like:
- "Generate a tracking link for LinkedIn"
- "I need a link for a demo call campaign"
- "Create a tracking URL for email marketing"

### With Workflows
Add the `link-generator` worker to any workflow:
```json
{
  "type": "worker",
  "data": {
    "worker_type": "link-generator",
    "config": {
      "utm_source": "linkedin",
      "utm_campaign": "demo_call"
    }
  }
}
```

### With MCP
Use the tool directly from Claude Desktop:
```javascript
stitch_generate_tracking_link({
  canvasId: "your-canvas-id",
  utmSource: "linkedin",
  utmCampaign: "demo_call"
})
```

## Testing

### Run the test script:
```bash
npx tsx scripts/test-link-generator.ts
```

### Test with AI Assistant:
1. Start dev server: `npm run dev`
2. Open AI Assistant panel
3. Ask: "Generate a tracking link for LinkedIn demo calls"
4. Copy the generated URL
5. Open it in a browser
6. Check the entities panel to see the tracked lead

### Test with MCP:
1. Ensure MCP server is running
2. Use Claude Desktop
3. Call `stitch_generate_tracking_link` tool
4. Share the generated link

## Use Cases Enabled

### 1. Social Media Campaigns
Generate unique links for each platform:
- LinkedIn posts
- Twitter threads
- Facebook ads
- Instagram bio links

### 2. Email Marketing
Track email campaign performance:
- Newsletter links
- Promotional emails
- Drip campaigns
- A/B testing different CTAs

### 3. Paid Advertising
Measure ad effectiveness:
- Google Ads
- Facebook Ads
- LinkedIn Ads
- Track by keyword (utm_term)

### 4. Referral Programs
Track referral sources:
- Partner links
- Affiliate marketing
- Influencer campaigns

### 5. Multi-Channel Attribution
Understand which channels drive conversions:
- Compare LinkedIn vs Twitter
- Email vs Social
- Organic vs Paid

## Configuration Required

### Environment Variables
Add to `.env.local`:
```bash
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### Database
No schema changes required - uses existing `stitch_entities` table.

## Future Enhancements

Potential additions:
- [ ] Link shortening (bit.ly integration)
- [ ] QR code generation
- [ ] Analytics dashboard
- [ ] Link expiration dates
- [ ] Custom landing pages per campaign
- [ ] Webhook notifications on clicks
- [ ] Conversion tracking
- [ ] ROI calculation

## Relationship to Existing Features

### Complements "Stitching Code"
- **Stitching Code:** External assets → Stitch (inbound)
- **Tracking Links:** Stitch → External world (outbound)

**Together they enable:**
1. Generate tracking link (Link Generator)
2. Share on LinkedIn
3. Visitor clicks and lands on your page
4. Page uses stitching code to send form data back to Stitch
5. Complete attribution from click to conversion

### Integrates with Entity Tracking
- Tracking links create entities automatically
- Entities move through workflows
- Full journey tracking from first click to conversion

### Works with Business Model Canvas
- Generate links in Marketing section
- Track leads moving to Sales section
- Measure conversion in Revenue section

## Files Modified

1. `src/lib/workers/link-generator.ts` - NEW
2. `src/lib/workers/registry.ts` - MODIFIED (added worker definition)
3. `src/lib/workers/index.ts` - MODIFIED (registered worker)
4. `src/app/api/track/route.ts` - NEW
5. `src/app/track/page.tsx` - NEW
6. `src/components/panels/AIAssistantContent.tsx` - MODIFIED (fixed 400 error)
7. `packages/stitch-mcp/src/tools/generate-tracking-link.ts` - NEW
8. `packages/stitch-mcp/src/tools/index.ts` - MODIFIED (registered tool)
9. `packages/stitch-mcp/src/resources/instructions.ts` - MODIFIED (added docs)
10. `scripts/test-link-generator.ts` - NEW
11. `TRACKING_LINKS_GUIDE.md` - NEW
12. `TRACKING_LINKS_IMPLEMENTATION.md` - NEW

## Summary

The tracking link system is now fully implemented and ready to use. You can:

1. ✅ Ask AI Assistant to generate tracking links
2. ✅ Use the link-generator worker in workflows
3. ✅ Call the MCP tool from Claude Desktop
4. ✅ Track visitors automatically as entities
5. ✅ Capture full UTM attribution data
6. ✅ Redirect to any destination after tracking

**Next Step:** Test it by asking the AI Assistant:
```
"I need a link for LinkedIn post that leads to demo call"
```

The AI will generate a complete tracking URL that you can share immediately!
