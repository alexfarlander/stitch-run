# Task 4: Edge Creation and Deletion - Manual Testing Guide

## Overview

This guide provides step-by-step instructions for manually testing edge creation and deletion functionality in the WorkflowCanvas component.

**Requirements Tested**: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7

## Prerequisites

1. Development server running (`npm run dev`)
2. At least one canvas with 2+ nodes
3. Browser with developer tools open

## Test 1: Connection Handles Visibility

**Requirement**: 4.1 - WHEN a user hovers over a node THEN the system SHALL display connection handles on the node

### Steps:
1. Navigate to a canvas with nodes (e.g., `/canvas/[id]`)
2. Hover over any node
3. Observe the connection handles

### Expected Results:
- ✅ Connection handles appear on hover
- ✅ Handles are visible at top (target) and bottom (source) of node
- ✅ Handles are interactive (cursor changes on hover)

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 2: Edge Creation by Dragging

**Requirement**: 4.2 - WHEN a user drags from a source handle to a target handle THEN the system SHALL create a new edge

### Steps:
1. Navigate to a canvas with at least 2 nodes
2. Click and hold on the bottom handle (source) of the first node
3. Drag to the top handle (target) of the second node
4. Release the mouse button

### Expected Results:
- ✅ A connection line appears while dragging
- ✅ The line snaps to the target handle when close
- ✅ An edge is created when released on a valid target
- ✅ The edge appears immediately on the canvas
- ✅ The edge is animated (flowing dots)

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 3: Edge Persistence to Database

**Requirement**: 4.3 - WHEN a new edge is created THEN the system SHALL persist the edge to the database immediately

### Steps:
1. Create an edge between two nodes (as in Test 2)
2. Open browser developer tools → Network tab
3. Look for POST request to `/api/canvas/[id]/edges`
4. Refresh the page (F5)
5. Observe if the edge is still present

### Expected Results:
- ✅ POST request to `/api/canvas/[id]/edges` is sent
- ✅ Response status is 201 (Created)
- ✅ Response contains edge data
- ✅ Edge persists after page refresh
- ✅ Edge connects the same nodes after refresh

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 4: Edge Display Update

**Requirement**: 4.4 - WHEN an edge is saved THEN the system SHALL update the canvas display to show the new edge

### Steps:
1. Create an edge between two nodes
2. Observe the canvas immediately after creation

### Expected Results:
- ✅ Edge appears immediately (no delay)
- ✅ Edge is properly styled (color, width, animation)
- ✅ Edge connects the correct nodes
- ✅ Arrow marker points to target node

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 5: Edge Selection

**Requirement**: 4.5 - WHEN a user selects an edge THEN the system SHALL highlight the edge

### Steps:
1. Click on an edge
2. Observe the edge styling

### Expected Results:
- ✅ Edge is highlighted (different color/width)
- ✅ Edge is marked as selected
- ✅ Other edges are dimmed (optional)

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 6: Edge Deletion with Delete Key

**Requirement**: 4.5, 4.6 - WHEN a user selects an edge and presses the Delete key THEN the system SHALL remove the edge from the canvas

### Steps:
1. Click on an edge to select it
2. Press the Delete key (or Backspace)
3. Observe the canvas

### Expected Results:
- ✅ Edge is removed from canvas immediately
- ✅ No error messages appear
- ✅ Other edges remain intact

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 7: Edge Deletion via Context Menu

**Requirement**: 4.5, 4.6 - WHEN a user right-clicks an edge and selects delete THEN the system SHALL remove the edge

### Steps:
1. Right-click on an edge
2. Observe the context menu
3. Click "Delete Edge" option
4. Observe the canvas

### Expected Results:
- ✅ Context menu appears on right-click
- ✅ "Delete Edge" option is visible
- ✅ Edge is removed when option is clicked
- ✅ Context menu closes after deletion

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 8: Edge Deletion Persistence

**Requirement**: 4.6 - WHEN an edge is deleted THEN the system SHALL remove the edge from the database

### Steps:
1. Delete an edge (using Delete key or context menu)
2. Open browser developer tools → Network tab
3. Look for DELETE request to `/api/canvas/[id]/edges/[edgeId]`
4. Refresh the page (F5)
5. Observe if the edge is still gone

### Expected Results:
- ✅ DELETE request to `/api/canvas/[id]/edges/[edgeId]` is sent
- ✅ Response status is 200 (OK)
- ✅ Edge does not reappear after page refresh

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 9: Edge Display After Refresh

**Requirement**: 4.7 - WHEN the page is refreshed THEN the system SHALL display all previously created edges

### Steps:
1. Create multiple edges between different nodes
2. Note the edge connections
3. Refresh the page (F5)
4. Compare the edges before and after refresh

### Expected Results:
- ✅ All edges are displayed after refresh
- ✅ Edges connect the same nodes as before
- ✅ Edge styling is preserved (type, animation)
- ✅ No duplicate edges appear

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 10: Multiple Edge Creation

**Requirement**: General functionality test

### Steps:
1. Create multiple edges from one node to different targets
2. Create multiple edges from different sources to one target
3. Observe the canvas

### Expected Results:
- ✅ Multiple edges can be created from one source
- ✅ Multiple edges can connect to one target
- ✅ Edges don't overlap or obscure each other
- ✅ All edges are interactive

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 11: Invalid Connection Attempt

**Requirement**: Error handling

### Steps:
1. Try to drag from a source handle to empty space
2. Try to drag from a source handle back to the same node
3. Observe the behavior

### Expected Results:
- ✅ Connection is not created when released on empty space
- ✅ Self-connections are prevented (or allowed, depending on design)
- ✅ No error messages appear
- ✅ Canvas remains stable

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 12: Edge Selection Exclusivity

**Requirement**: 3.7 (from design) - At most one node OR one edge can be selected at a time

### Steps:
1. Select a node
2. Click on an edge
3. Observe the selection state

### Expected Results:
- ✅ Node is deselected when edge is selected
- ✅ Only the edge is highlighted
- ✅ Node configuration panel closes

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 13: Keyboard Shortcut with Node Selected

**Requirement**: Ensure Delete key works for both nodes and edges

### Steps:
1. Select a node
2. Press Delete key
3. Select an edge
4. Press Delete key

### Expected Results:
- ✅ Delete key removes selected node
- ✅ Delete key removes selected edge
- ✅ Only the selected item is deleted
- ✅ No conflicts between node and edge deletion

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 14: Edge Highlighting on Node Selection

**Requirement**: Visual feedback for connected edges

### Steps:
1. Create several edges between nodes
2. Click on a node
3. Observe the connected edges

### Expected Results:
- ✅ Edges connected to selected node are highlighted
- ✅ Other edges are dimmed
- ✅ Highlighting is clear and visible

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test 15: Connection Mode Configuration

**Requirement**: 4.1, 4.2 - React Flow connection mode is properly configured

### Steps:
1. Inspect the WorkflowCanvas component code
2. Check React Flow props

### Expected Results:
- ✅ `connectionMode` is set to "loose" or "strict"
- ✅ `onConnect` handler is wired up
- ✅ `defaultEdgeOptions` are configured

### Actual Results:
- [ ] Pass
- [ ] Fail (describe issue):

---

## Summary

### Overall Test Results

- Total Tests: 15
- Passed: ___
- Failed: ___
- Pass Rate: ___%

### Critical Issues Found

1. [Issue description]
2. [Issue description]

### Non-Critical Issues Found

1. [Issue description]
2. [Issue description]

### Recommendations

1. [Recommendation]
2. [Recommendation]

---

## Notes

- Test performed by: ___________
- Date: ___________
- Browser: ___________
- Canvas ID used: ___________
- Any additional observations:

