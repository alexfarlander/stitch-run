# Tracking Links - Quick Start

## 🚀 Get a Tracking Link in 30 Seconds

### Option 1: Ask the AI Assistant

Open the AI Assistant panel and say:

```
"I need a link for LinkedIn post that leads to demo call"
```

The AI will return:
```
https://yourdomain.com/track?tracking_id=linkedin_demo_1234&utm_source=linkedin&redirect_to=/demo
```

### Option 2: Use MCP Tool (Claude Desktop)

```javascript
stitch_generate_tracking_link({
  canvasId: "your-canvas-id",
  utmSource: "linkedin",
  utmCampaign: "demo_call",
  redirectTo: "https://calendly.com/demo"
})
```

### Option 3: Add to Workflow

Create a node with worker type `link-generator`:

```json
{
  "worker_type": "link-generator",
  "config": {
    "utm_source": "linkedin",
    "utm_campaign": "demo_call",
    "redirect_to": "https://calendly.com/demo"
  }
}
```

## 📊 What Gets Tracked

When someone clicks your link, Stitch automatically captures:

- ✅ UTM parameters (source, campaign, medium, content, term)
- ✅ Timestamp of visit
- ✅ User agent (browser/device)
- ✅ Referrer URL
- ✅ IP address
- ✅ Creates entity as "lead" in your canvas

## 🎯 Common Use Cases

### LinkedIn Post → Demo Call
```
utm_source: "linkedin"
utm_campaign: "demo_call"
redirect_to: "https://calendly.com/demo"
```

### Email Newsletter → Product Page
```
utm_source: "email"
utm_campaign: "newsletter_jan"
utm_medium: "email"
redirect_to: "/products"
```

### Twitter Ad → Landing Page
```
utm_source: "twitter"
utm_campaign: "awareness_q1"
utm_medium: "cpc"
redirect_to: "/landing"
```

### A/B Test Different CTAs
```
Link A: utm_content: "button_blue"
Link B: utm_content: "button_green"
```

## 🔍 View Tracked Leads

1. Open your canvas
2. Click the Entities panel (right side)
3. See all tracked leads with their UTM data
4. Click any entity to see their full journey

## ⚙️ Configuration

Set in `.env.local`:
```bash
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## 🐛 Troubleshooting

**Link doesn't track?**
- Check `NEXT_PUBLIC_BASE_URL` is set
- Verify canvas_id exists
- Check browser console for errors

**Entity not created?**
- Ensure canvas_id is valid
- Check server logs
- Try with `create_entity: true`

## 📚 Full Documentation

- **User Guide:** `TRACKING_LINKS_GUIDE.md`
- **Implementation:** `TRACKING_LINKS_IMPLEMENTATION.md`
- **Test:** `npx tsx scripts/test-link-generator.ts`

## 💡 Pro Tips

1. **Use descriptive campaign names** - Makes analytics easier
2. **Always set redirect_to** - Tell users where they're going
3. **Track link performance** - Compare channels in entities panel
4. **Combine with stitching code** - Track full journey from click to conversion
5. **Use utm_content for A/B tests** - Test different messages/designs

---

**That's it!** Start generating tracking links and watch your leads flow into Stitch in real-time. 🎉
