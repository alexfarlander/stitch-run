# Task 2: Canvas Detail Page - Manual Testing Instructions

## Quick Check (5 minutes)

### Step 1: Get a Canvas ID

Run this script to get test URLs:
```bash
cd stitch-run
npx tsx scripts/verify-canvas-detail-page.ts
```

This will show you URLs like:
- http://localhost:3000/canvas/5aa046f5-3755-4aa3-bdb3-57a88b5eff67

### Step 2: Test in Browser

1. **Make sure dev server is running**:
   ```bash
   cd stitch-run
   npm run dev
   ```

2. **Open one of the canvas URLs** from Step 1 in your browser

3. **Check these things**:
   - [ ] Page loads (doesn't show error page)
   - [ ] You see either:
     - Login page (expected if not logged in)
     - Canvas with nodes/edges (if logged in)
     - Empty canvas (if logged in and canvas has no nodes)
   - [ ] No red error messages in the page
   - [ ] Browser console has no critical errors (F12 → Console tab)

### Step 3: Check Different Canvas Types

If you're logged in, test these URLs:
- Workflow canvas: `/canvas/5aa046f5-3755-4aa3-bdb3-57a88b5eff67`
- Another workflow: `/canvas/4a91f20c-592d-44c1-85c5-a776fa583791`

For each URL:
- [ ] Page loads without crashing
- [ ] Canvas component renders (you see the canvas area)
- [ ] No unhandled errors

## What "Success" Looks Like

✅ **PASS**: Page loads, shows login or canvas, no crashes
❌ **FAIL**: White screen, error page, or console errors about missing components

## Common Issues (Not Failures)

These are OK:
- Redirects to login page (middleware is working)
- Empty canvas with no nodes (valid state)
- "Loading canvas..." shows briefly (expected)

## If You Find Issues

Document in `.kiro/specs/002-foundation-stabilization/errors.md`:
- What URL you tested
- What error you saw
- Screenshot if possible
- Browser console errors

## Quick Summary

**What we're checking**: Does the canvas detail page load without crashing?

**Expected result**: Page loads, shows canvas or login, no crashes.

**Time needed**: 5 minutes
