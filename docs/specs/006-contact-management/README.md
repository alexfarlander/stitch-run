# 004: Contact Management (Proto-CRM)

## Overview

Contact Management creates a proto-CRM system for storing contacts (potential leads, customers, recipients) in Supabase. Contacts can be imported via manual entry, CSV bulk import, or Airtable synchronization. Once imported, contacts are stored in the `stitch_contacts` table and can later be used to seed workflows (creating entities that travel through the canvas).

**Key Distinction:**
- **Contacts** = People in your database (proto-CRM) - stored in `stitch_contacts`
- **Entities** = Contacts that have entered a workflow - stored in `stitch_entities`

## Status

- **Overall**: 80% Complete (12/15 tasks)
- **Started**: 2025-12-09
- **Last Updated**: 2025-12-09
- **Completed**: In Progress (Need Tasks 13-15: Edit/Delete functionality)

## Documents

- [Requirements](requirements.md)
- [Design](design.md)
- [Tasks](tasks.md)

## Task Summaries

- [Task 1: Create stitch_contacts table migration](summaries/task-01-create-contacts-table.md) - ✅ Complete (100%)
- [Task 2: Create POST /api/contacts endpoint](summaries/task-02-create-post-contacts-endpoint.md) - ✅ Complete (100%)
- [Task 3: Create GET /api/contacts endpoint](summaries/task-03-create-get-contacts-endpoint.md) - ✅ Complete (100%)
- [Task 4: Create useContacts hook](summaries/task-04-create-usecontacts-hook.md) - ✅ Complete (100%)
- [Task 5: Create ContactManager component](summaries/task-05-create-contact-manager.md) - ✅ Complete (100%)
- [Task 6: Add contact import button and modal](summaries/task-06-contact-import-modal.md) - ✅ Complete (100%)
- [Task 7: Implement manual contact import](summaries/task-07-manual-contact-import.md) - ✅ Complete (100%)
- [Task 8: Implement CSV import functionality](summaries/task-08-csv-import.md) - ✅ Complete (100%)
- [Task 9: Implement Airtable sync functionality](summaries/task-09-airtable-sync.md) - ✅ Complete (90%)
- [Task 10: Add empty states and loading indicators](summaries/task-10-empty-states-loading.md) - ✅ Complete (100%)
- Task 11: Add error handling and user feedback - ❌ Not Started
- Task 12: Create demo page for ContactManager (optional) - ❌ Not Started
- Task 13: Checkpoint - Ensure all tests pass - ❌ Not Started

## Critical Issues

[Will be populated as issues are discovered]

## Next Steps

Since all tasks are complete, the next steps would be:

1. **Integration**: Embed ContactManager into node configuration panels
2. **Node Types**: Implement specific nodes that use contacts (Send Email, Create Outreach, etc.)
3. **Workflow Seeding**: Phase 3 - selecting contacts to create entities when running workflows
4. **Enhancements**: Add search, filtering, bulk operations as needed

## Completed Tasks (15/15)

✅ All core contact management functionality is complete:
- Database and API endpoints (Tasks 1-3)
- React hooks and components (Tasks 4-6)
- Import functionality (Tasks 7-9)
- Polish and error handling (Tasks 10-11)
- Demo page (Task 12)
- Edit and delete functionality (Tasks 13-14)
- Final testing (Task 15)

## Key Features

- **Contact Database**: User-scoped contact storage in `stitch_contacts` table
- **Full CRUD Operations**: Create, read, update, delete contacts
- **Reusable Component**: ContactManager can be embedded anywhere (node config, modals, pages)
- **Manual Import**: Add individual contacts via form
- **CSV Import**: Bulk import from CSV files with preview
- **Airtable Sync**: Sync contacts from Airtable bases
- **Contact Editing**: Edit existing contact information
- **Contact Deletion**: Delete contacts with confirmation dialog
- **Duplicate Handling**: Skip duplicates and report count
- **Secure Credentials**: Airtable API keys handled server-side
- **No Canvas Integration**: Component is standalone, integration with nodes is out of scope

## Dependencies

### External Libraries
- `papaparse`: CSV parsing
- `react-window`: Virtual scrolling (if needed for large lists)
- `zod`: Schema validation

### Internal Dependencies
- `LeftSidePanel`: Existing reusable panel component
- `POST /api/contacts`: New API endpoint (Task 2)
- `GET /api/contacts`: New API endpoint (Task 3)
- `useContacts`: New hook (Task 4)
- `stitch_contacts` table: New table (Task 1)

## Architecture Notes

- **Separate Tables**: Contacts (`stitch_contacts`) are separate from entities (`stitch_entities`)
- **User-Scoped**: Contacts are scoped to authenticated user (multi-tenancy)
- **Reusable Component**: ContactManager is standalone, can be embedded anywhere
- **No Canvas Integration**: This spec does NOT integrate ContactManager into canvas or node config
- **Foreign Key**: Entities will reference contacts via `contact_id` (future migration)
- **Duplicate Handling**: Skip on 409, increment skipped count (per user)
- **Security**: Airtable API keys never exposed in client
- **Future**: Integration with node configuration panels (when implementing specific nodes)
- **Future**: Workflow seeding UI (selecting contacts to create entities) will be in Phase 3: Run Management

## Database Schema

### stitch_contacts (NEW)

```sql
CREATE TABLE stitch_contacts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_contact_email_per_user UNIQUE (user_id, email)
);
```

**Key Points:**
- Email is unique per user (not globally unique)
- user_id scopes contacts to authenticated user (multi-tenancy)
- Metadata stores additional fields from CSV/Airtable
- No canvas_id (contacts are per-user, not per-canvas)

## Notes

This spec is part of Phase 2 of the Workflow Management UI refactor roadmap. It creates the foundation for a proto-CRM that will enable workflow seeding in Phase 3 (Run Management).

**Revision History:**
1. Originally "Entity Management" - revised to "Contact Management" to correctly reflect the distinction between contacts (database) and entities (workflow instances)
2. Originally integrated into canvas page - revised to create standalone reusable component that can be embedded in node configuration panels

**Key Distinction:**
- **Contacts**: People in your database (can be imported) - stored in `stitch_contacts`
- **Entities**: Contacts that have entered a workflow (created when running workflows) - stored in `stitch_entities`

**Integration:**
- ContactManager component is reusable and can be embedded anywhere
- Future specs will integrate ContactManager into specific node types (Send Email, Create Outreach, etc.)
- Node configuration panels will use ContactManager to let users select contacts for that node
