# Task 2: Manual Testing Guide

## Quick Verification Steps

Follow these steps to verify the Node Palette integration works correctly:

### 1. Navigate to a Workflow Canvas

1. Start the development server: `npm run dev`
2. Open your browser to `http://localhost:3000`
3. Navigate to a workflow canvas (e.g., `/canvas/[workflow-id]`)
4. You should see the canvas with existing nodes and edges

### 2. Open the Node Palette

1. Look for a blue "+" button in the bottom-right corner of the canvas
2. Click the "+" button
3. A modal should appear with node types organized by category:
   - **Actions**: Worker
   - **Flow Control**: Splitter, Collector
   - **User Interaction**: User Input (UX)
   - **Waypoints**: Waypoint (SectionItem)

### 3. Add a Node

1. Click on "Worker" in the Actions category
2. The modal should close
3. A new Worker node should appear on the canvas
4. The node configuration panel should open on the right side

### 4. Verify Persistence

1. Refresh the page (F5 or Cmd+R)
2. The new Worker node should still be visible
3. It should be in the same position

### 5. Add Multiple Nodes

1. Click the "+" button again
2. Add a "User Input" node
3. Click the "+" button again
4. Add a "Splitter" node
5. All three nodes should be visible on the canvas

### 6. Verify Different Node Types

Try adding each node type and verify they all work:
- [ ] Worker
- [ ] User Input (UX)
- [ ] Splitter
- [ ] Collector
- [ ] Waypoint (SectionItem)

## Expected Behavior

### ✅ Success Indicators

- "+" button is visible in bottom-right corner
- Clicking "+" opens the node palette modal
- All node types are displayed in the modal
- Clicking a node type closes the modal
- New node appears on the canvas immediately
- Node configuration panel opens for the new node
- Refreshing the page shows the new node
- Multiple nodes can be added

### ❌ Failure Indicators

- "+" button is not visible
- Clicking "+" does nothing
- Modal doesn't open
- Node types are missing
- Clicking a node type doesn't create a node
- Node doesn't appear on canvas
- Node disappears after refresh
- Error messages in console

## Troubleshooting

### Issue: "+" button not visible

**Possible causes**:
- You're viewing a run (runId is present in URL)
- Canvas type is not "workflow"
- CSS styling issue

**Solution**:
- Make sure you're on a workflow canvas (not BMC or section)
- Check that URL doesn't have `?runId=...`
- Check browser console for errors

### Issue: Node doesn't appear after clicking

**Possible causes**:
- API endpoint is not running
- Database connection issue
- JavaScript error

**Solution**:
- Check browser console for errors
- Check network tab for failed API calls
- Verify database is running
- Check server logs

### Issue: Node disappears after refresh

**Possible causes**:
- API call failed silently
- Database write failed
- Version manager issue

**Solution**:
- Check browser console for errors
- Check network tab for API response
- Verify database has the new node
- Check server logs for errors

## Database Verification

To verify nodes are being saved to the database:

```sql
-- Check the latest version of a canvas
SELECT 
  fv.id,
  fv.version_number,
  fv.visual_graph->'nodes' as nodes,
  fv.created_at
FROM stitch_flow_versions fv
JOIN stitch_flows f ON f.current_version_id = fv.id
WHERE f.id = '[your-canvas-id]'
ORDER BY fv.created_at DESC
LIMIT 1;
```

You should see the new nodes in the `visual_graph.nodes` array.

## API Verification

To verify the API endpoint is working:

```bash
# Test node creation
curl -X POST http://localhost:3000/api/canvas/[canvas-id]/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "node": {
      "id": "test-worker-123",
      "type": "Worker",
      "position": { "x": 250, "y": 100 },
      "data": {
        "label": "Test Worker"
      }
    }
  }'
```

Expected response (201 Created):
```json
{
  "id": "test-worker-123",
  "label": "Test Worker",
  "type": "Worker",
  "position": { "x": 250, "y": 100 },
  "data": {
    "label": "Test Worker",
    "createdAt": "2024-12-09T10:30:00Z"
  },
  "webhookUrl": "http://localhost:3000/api/webhooks/node/test-worker-123",
  "uptimeUrl": "http://localhost:3000/api/uptime/ping/test-worker-123"
}
```

## Performance Testing

To test performance with many nodes:

1. Add 10 nodes quickly (click "+" and add node repeatedly)
2. Verify all nodes appear
3. Verify canvas remains responsive
4. Refresh page and verify all nodes load
5. Check browser console for performance warnings

Expected: No lag, all nodes appear immediately, page refresh loads in < 2 seconds

## Accessibility Testing

(Future enhancement - not required for this task)

1. Tab to "+" button
2. Press Enter to open palette
3. Tab through node types
4. Press Enter to add node
5. Verify screen reader announces actions

## Browser Testing

Test in multiple browsers:

- [ ] Chrome (primary)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

Expected: Works identically in all browsers

## Mobile Testing

(Future enhancement - not required for this task)

1. Open on mobile device
2. Verify "+" button is accessible
3. Verify modal is usable
4. Verify nodes can be added

## Conclusion

If all verification steps pass, Task 2 is complete and working correctly. The Node Palette is fully integrated and functional.

If any steps fail, refer to the troubleshooting section or check the implementation summary for more details.
