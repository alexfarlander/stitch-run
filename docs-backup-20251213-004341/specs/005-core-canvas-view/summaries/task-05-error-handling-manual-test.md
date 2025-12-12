# Task 5: Error Handling and User Feedback - Manual Testing Guide

## Overview

This guide provides step-by-step instructions for manually testing the error handling and user feedback features implemented in Task 5.

## Requirements Tested

- **5.5**: Error states for failed API calls with rollback logic
- **5.6**: Loading states and toast notifications for user feedback

## Test Environment Setup

1. Start the development server:
   ```bash
   cd stitch-run
   npm run dev
   ```

2. Open browser to `http://localhost:3000`
3. Navigate to a workflow canvas

## Test Cases

### Test 1: Loading States - Node Addition

**Steps:**
1. Click the "+" button to open the node palette
2. Click on any node type (e.g., "Worker")
3. **Observe**: Loading overlay should appear with "Adding node..." message
4. **Observe**: Loading spinner should be visible
5. **Observe**: After node is created, loading overlay should disappear
6. **Observe**: Success toast should appear: "Worker node added"

**Expected Result:**
- ✅ Loading overlay appears during operation
- ✅ Loading message is clear and specific
- ✅ Success toast appears after completion
- ✅ Node appears on canvas

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 2: Loading States - Edge Creation

**Steps:**
1. Drag from one node's output handle to another node's input handle
2. **Observe**: Loading overlay should appear with "Creating edge..." message
3. **Observe**: After edge is created, loading overlay should disappear
4. **Observe**: Success toast should appear: "Edge created"

**Expected Result:**
- ✅ Loading overlay appears during operation
- ✅ Edge appears on canvas
- ✅ Success toast appears

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 3: Loading States - Node Configuration

**Steps:**
1. Click on a node to open the configuration panel
2. Change the node label
3. **Observe**: Loading overlay should appear with "Saving configuration..." message
4. **Observe**: After 500ms (debounce), the save should complete
5. **Observe**: Success toast should appear: "Node configuration saved"

**Expected Result:**
- ✅ Loading overlay appears during save
- ✅ Changes are debounced (500ms delay)
- ✅ Success toast appears
- ✅ Changes persist after page refresh

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 4: Error Handling - Network Failure Simulation

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Enable "Offline" mode (or throttle to "Offline")
4. Try to add a node
5. **Observe**: Error toast should appear with message like "Failed to create node"
6. **Observe**: Node should NOT appear on canvas (rollback)
7. Disable offline mode
8. Try adding a node again
9. **Observe**: Should work normally

**Expected Result:**
- ✅ Error toast appears with clear message
- ✅ Failed operation is rolled back
- ✅ Canvas state remains consistent
- ✅ Operations work after reconnecting

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 5: Error Handling - Invalid Node Configuration

**Steps:**
1. Click on a Worker node
2. Select a worker type that requires configuration
3. Leave required fields empty
4. Wait for auto-save (500ms)
5. **Observe**: Should NOT save (validation prevents it)
6. Fill in required fields
7. **Observe**: Should auto-save successfully
8. **Observe**: Success toast should appear

**Expected Result:**
- ✅ Invalid configuration is not saved
- ✅ Valid configuration is saved
- ✅ Success toast appears for valid save
- ✅ No error toast for validation (silent prevention)

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 6: Rollback Logic - Failed Node Creation

**Steps:**
1. Open browser DevTools Console
2. Note the current number of nodes on canvas
3. Enable offline mode in Network tab
4. Try to add a node
5. **Observe**: Node briefly appears (optimistic update)
6. **Observe**: Error toast appears
7. **Observe**: Node disappears (rollback)
8. **Verify**: Number of nodes is same as before

**Expected Result:**
- ✅ Optimistic update shows node immediately
- ✅ Error toast appears on failure
- ✅ Node is removed (rollback)
- ✅ Canvas state is consistent

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 7: Rollback Logic - Failed Edge Creation

**Steps:**
1. Note the current edges on canvas
2. Enable offline mode
3. Try to create an edge
4. **Observe**: Edge briefly appears (optimistic update)
5. **Observe**: Error toast appears
6. **Observe**: Edge disappears (rollback)
7. **Verify**: Edges are same as before

**Expected Result:**
- ✅ Optimistic update shows edge immediately
- ✅ Error toast appears on failure
- ✅ Edge is removed (rollback)
- ✅ Canvas state is consistent

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 8: Rollback Logic - Failed Node Deletion

**Steps:**
1. Select a node
2. Enable offline mode
3. Press Delete key
4. **Observe**: Node disappears (optimistic update)
5. **Observe**: Error toast appears
6. **Observe**: Node reappears (rollback)
7. **Observe**: Connected edges also reappear

**Expected Result:**
- ✅ Optimistic update removes node immediately
- ✅ Error toast appears on failure
- ✅ Node is restored (rollback)
- ✅ Connected edges are restored
- ✅ Canvas state is consistent

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 9: Error Messages - Clarity and Actionability

**Steps:**
1. Trigger various errors (offline mode, invalid data, etc.)
2. Read each error message
3. **Evaluate**: Are messages clear?
4. **Evaluate**: Do messages explain what went wrong?
5. **Evaluate**: Are messages user-friendly (not technical)?

**Expected Result:**
- ✅ Error messages are clear and concise
- ✅ Messages explain what went wrong
- ✅ Messages are user-friendly
- ✅ No technical jargon or stack traces

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 10: Application Stability - No Crashes

**Steps:**
1. Trigger multiple errors in sequence:
   - Failed node creation
   - Failed edge creation
   - Failed node update
   - Failed node deletion
   - Failed edge deletion
2. **Observe**: Application should remain functional
3. **Verify**: Can still perform operations after errors
4. **Verify**: No console errors (except expected network errors)

**Expected Result:**
- ✅ Application does not crash
- ✅ All features remain functional after errors
- ✅ No unexpected console errors
- ✅ UI remains responsive

**Actual Result:**
- [ ] Pass
- [ ] Fail (describe issue):

---

## Summary

### Test Results

- Total Tests: 10
- Passed: ___
- Failed: ___
- Success Rate: ___%

### Issues Found

1. 
2. 
3. 

### Recommendations

1. 
2. 
3. 

### Sign-off

- [ ] All tests passed
- [ ] Issues documented
- [ ] Ready for production

**Tested by:** _______________
**Date:** _______________
**Browser:** _______________
**OS:** _______________

