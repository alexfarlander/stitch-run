# Contact Management - Known Issues & Gaps

## Critical Issues

### 1. Airtable API Key Storage
**Issue**: Airtable API key is not stored in Vault, and is not stored at all. Users must re-enter API key for every sync.

**Impact**: Poor UX - users can't save their Airtable credentials for reuse.

**Solution**: Refactor Airtable import to move API integration to settings and store encrypted credentials in Vault or server-side storage.

**Priority**: High

### 2. Missing Entity-Contact Relationship
**Issue**: The `stitch_entities` table does not have a `contact_id` foreign key to reference contacts.

**Impact**: When contacts become entities (during workflow runs), there's no link back to the original contact record.

**Solution**: Add migration to add `contact_id` column to `stitch_entities` table with foreign key constraint.

**Priority**: High (needed for workflow seeding in Phase 3)

## Performance & Scalability Issues

### 3. No Pagination for Large Contact Lists
**Issue**: The `useContacts` hook and `GET /api/contacts` endpoint fetch all contacts at once.

**Impact**: Poor performance with large contact databases (>1000 contacts).

**Solution**: Add pagination to API endpoint and implement virtual scrolling or pagination in UI.

**Priority**: Medium

### 4. Airtable Pagination Missing
**Issue**: Airtable sync fetches all records at once without pagination.

**Impact**: 
- Only syncs first 100 records (Airtable API default)
- Could hit memory limits with very large tables
- No rate limiting could trigger Airtable API limits

**Solution**: Implement pagination for Airtable API calls and add rate limiting.

**Priority**: Medium

### 5. No Search or Filtering
**Issue**: ContactManager component has no search or filtering capabilities.

**Impact**: Difficult to find specific contacts in large databases.

**Solution**: Add search input and filtering options (by company, name, etc.).

**Priority**: Low (marked as out of scope, but needed for production use)

## Data Integrity Issues

### 6. No Contact Validation Beyond Email
**Issue**: Only email format is validated. No validation for:
- Phone number format (if added to metadata)
- Company name length limits
- Name length limits
- Metadata size limits

**Impact**: Could store invalid or malformed data.

**Solution**: Add comprehensive validation rules.

**Priority**: Low

### 7. No Soft Delete for Contacts
**Issue**: Contact deletion is hard delete - permanently removes data.

**Impact**: 
- Cannot recover accidentally deleted contacts
- If contact is referenced by entities, deletion could break referential integrity

**Solution**: Implement soft delete with `deleted_at` timestamp.

**Priority**: Medium

## Security Issues

### 8. No Rate Limiting on API Endpoints
**Issue**: Contact API endpoints have no rate limiting.

**Impact**: Vulnerable to abuse/DoS attacks.

**Solution**: Add rate limiting middleware.

**Priority**: Medium

### 9. Metadata Field Not Sanitized
**Issue**: The `metadata` JSONB field accepts any JSON without sanitization.

**Impact**: Could store malicious content or very large objects.

**Solution**: Add metadata validation and size limits.

**Priority**: Low

## UX/UI Issues

### 10. No Bulk Operations
**Issue**: Cannot select multiple contacts for bulk operations (delete, edit, export).

**Impact**: Tedious to manage large contact lists.

**Solution**: Add checkbox selection and bulk action buttons.

**Priority**: Low (marked as out of scope)

### 11. No Contact Import History
**Issue**: No record of when/how contacts were imported.

**Impact**: Cannot track import sources or troubleshoot import issues.

**Solution**: Add import history tracking with source, timestamp, and results.

**Priority**: Low

### 12. No Export Functionality
**Issue**: Cannot export contacts to CSV or other formats.

**Impact**: Vendor lock-in, cannot backup or migrate contact data.

**Solution**: Add export to CSV functionality.

**Priority**: Low

## Integration Issues

### 13. No Contact Selection Mode
**Issue**: ContactManager component has selection props but they're not fully implemented.

**Impact**: Cannot use component for selecting contacts in node configuration.

**Solution**: Complete the selection mode implementation with checkboxes and callbacks.

**Priority**: High (needed for node integration)

### 14. No Contact Usage Tracking
**Issue**: No way to see which workflows/nodes are using specific contacts.

**Impact**: Cannot safely delete contacts that might be in use.

**Solution**: Add usage tracking and display warnings before deletion.

**Priority**: Medium

## Testing Gaps

### 15. No Automated Tests
**Issue**: No unit tests, integration tests, or property-based tests.

**Impact**: Regressions could be introduced without detection.

**Solution**: Add comprehensive test suite.

**Priority**: Medium

### 16. Limited Real-World Testing
**Issue**: Airtable sync has not been tested with real Airtable data.

**Impact**: Unknown issues with real-world data formats and edge cases.

**Solution**: Test with actual Airtable bases containing various data types.

**Priority**: Medium

## Future Architecture Considerations

### 17. No Multi-Tenant Organization Support
**Issue**: Contacts are scoped per user, not per organization.

**Impact**: In team environments, contacts cannot be shared across team members.

**Solution**: Add organization-level contact sharing (future enhancement).

**Priority**: Low (future feature)

### 18. No Contact Deduplication
**Issue**: No automatic detection of duplicate contacts across different import sources.

**Impact**: Same person could exist multiple times with slight variations.

**Solution**: Add fuzzy matching and deduplication suggestions.

**Priority**: Low (future enhancement) 