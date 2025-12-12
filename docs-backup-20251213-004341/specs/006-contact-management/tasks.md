# Implementation Plan: Contact Management (Proto-CRM)

## Overview

This implementation plan breaks down the Contact Management feature into discrete, manageable tasks. Each task focuses on creating code, integrating it into the UI, and making features accessible to users. This creates a proto-CRM for storing contacts that can later be used to seed workflows.

**Key Concept**: Contacts are stored in `stitch_contacts` (proto-CRM database). When you run a workflow with contacts, they become entities in `stitch_entities` (workflow instances).

## Task List

- [x] 1. Create stitch_contacts table migration
  - Create migration file for stitch_contacts table
  - Add columns: id, email (unique), name, company, metadata, timestamps
  - Add unique constraint on email
  - Add indexes for performance
  - Add RLS policies for authenticated users
  - Do not run the migration, finish the task
  - _Requirements: All (database foundation)_

- [x] 2. Create POST /api/contacts endpoint
  - Create route file at src/app/api/contacts/route.ts
  - Implement POST handler for creating contacts
  - Validate required fields (email)
  - Handle duplicate emails (return 409)
  - Return 201 on success with created contact
  - Return 400 on validation errors
  - Test: Call endpoint with valid data (verify 201)
  - Test: Call endpoint with duplicate email (verify 409)
  - Test: Call endpoint without email (verify 400)
  - _Requirements: 3.2, 3.4, 3.5, 3.6_

- [x] 3. Create GET /api/contacts endpoint
  - Add GET handler to src/app/api/contacts/route.ts
  - Fetch all contacts from stitch_contacts table
  - Return contacts array with total count
  - Handle errors gracefully
  - Test: Call endpoint (verify contacts returned)
  - _Requirements: 1.2_

- [x] 4. Create useContacts hook
  - Create hook file at src/hooks/useContacts.ts
  - Implement data fetching from GET /api/contacts
  - Add refetch function for manual refresh
  - Add loading and error states
  - Test: Use hook in component (verify data loads)
  - _Requirements: 1.2, 6.1, 6.2_

- [x] 5. Create ContactManager component
  - Create ContactManager component at src/components/contacts/ContactManager.tsx
  - Wire up useContacts hook
  - Display contact list (name, email, company)
  - Add empty state when no contacts exist
  - Add loading state during fetch
  - Add "Import Contacts" button
  - Make component reusable (can be embedded anywhere)
  - Test: Render component in isolation
  - Test: Verify contacts display if any exist
  - Test: Verify empty state shows when no contacts
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. Add contact import button and modal
  - Add "Import Contacts" button to ContactListPanel header
  - Create ContactImportModal component at src/components/contacts/ContactImportModal.tsx
  - Wire up modal open/close state management
  - Add tab navigation (Manual, CSV, Airtable)
  - Test: Click button and verify modal opens
  - Test: Verify modal closes on X, cancel, or outside click
  - Test: Verify tab switching works
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 7. Implement manual contact import
  - Create ManualEntryTab component at src/components/contacts/ManualEntryTab.tsx
  - Add form fields: email (required), name, company
  - Implement form validation (email format, required fields)
  - Wire up form submission to POST /api/contacts
  - Handle 409 (duplicate) response - show message that contact exists
  - Handle 400 (validation) response - show error message
  - Handle 201 (success) response - close modal, trigger contact list refetch
  - Test: Fill form and submit
  - Test: Verify contact appears in list
  - Test: Verify duplicate handling (try adding same email twice)
  - Test: Verify validation (try submitting without email)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 8. Implement CSV import functionality
  - Create CSVImportTab component at src/components/contacts/CSVImportTab.tsx
  - Add file upload area with drag-and-drop
  - Integrate papaparse library for CSV parsing
  - Validate CSV has required columns (email)
  - Display preview of first 10 rows
  - Add "Import" confirmation button
  - Implement batch import with progress indicator
  - Process in batches of 50 contacts
  - Handle 409 responses as skipped contacts (increment skipped count)
  - Handle 400 responses as errors (add to error list)
  - Display results: success count, skipped count, error messages
  - Trigger contact list refetch after successful import
  - Test: Upload valid CSV with all fields
  - Test: Upload CSV with missing optional fields
  - Test: Upload CSV with duplicates (verify skipped count)
  - Test: Upload CSV with missing email (verify error handling)
  - Test: Verify progress indicator shows during import
  - Test: Verify results display correctly
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

- [x] 9. Implement Airtable sync functionality
  - Create AirtableImportTab component at src/components/contacts/AirtableImportTab.tsx
  - Add form for Airtable configuration (base ID, table ID, field mapping)
  - Implement secure credential handling (use server-side storage or Edge Function)
  - Create POST /api/integrations/airtable/sync-contacts endpoint
  - Wire up form submission to API endpoint
  - Display sync progress indicator
  - Handle success response: show success count and skipped count
  - Handle 401 (auth error): show clear message about invalid credentials
  - Handle 400 (validation error): show error about missing email field
  - Handle 500 (CORS error): show clear message about API configuration
  - Trigger contact list refetch after successful sync
  - Test: Configure Airtable credentials and sync
  - Test: Verify contacts imported
  - Test: Verify duplicate handling (skipped count)
  - Test: Verify error handling for missing email field
  - Test: Verify error handling for invalid credentials
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [x] 10. Add empty states and loading indicators
  - Add empty state to ContactListPanel when no contacts exist
  - Add loading state to ContactListPanel during initial fetch
  - Add loading state to import modal during submission
  - Add progress indicators for CSV and Airtable imports
  - Test: View canvas with no contacts (verify empty state)
  - Test: Refresh page (verify loading state shows briefly)
  - Test: Import contacts (verify progress indicators)
  - _Requirements: 1.4, 4.5, 5.3_

- [x] 11. Add error handling and user feedback
  - Add toast notifications for successful imports
  - Add error messages for failed imports
  - Add validation error messages inline on forms
  - Add network error handling with retry option
  - Test: Import contact successfully (verify success toast)
  - Test: Import duplicate contact (verify skip message)
  - Test: Submit form with invalid data (verify inline errors)
  - Test: Simulate network error (verify error message and retry option)
  - _Requirements: 3.6, 4.6, 5.4, 5.9_

- [x] 12. Create demo page for ContactManager (optional)
  - Create page at src/app/contacts-demo/page.tsx
  - Embed ContactManager component
  - Add authentication check
  - Test: Navigate to /contacts-demo
  - Test: Verify ContactManager works end-to-end
  - Note: This is for testing only, can be removed later
  - _Requirements: All (integration testing)_

- [x] 13. Add contact editing functionality
  - Add PATCH handler to src/app/api/contacts/[id]/route.ts
  - Create EditContactModal component
  - Add edit button to each contact in ContactManager
  - Wire up edit modal to open with pre-populated data
  - Handle form submission with PATCH /api/contacts/[id]
  - Handle 409 (duplicate email) and 404 (not found) responses
  - Refresh contact list after successful update
  - Test: Edit contact name, email, company
  - Test: Try to change email to existing one (verify error)
  - Test: Edit non-existent contact (verify 404)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 14. Add contact deletion functionality
  - Add DELETE handler to src/app/api/contacts/[id]/route.ts
  - Add delete button to each contact in ContactManager
  - Create confirmation dialog for deletion
  - Wire up delete confirmation to call DELETE /api/contacts/[id]
  - Handle 404 (not found) and 409 (contact in use) responses
  - Refresh contact list after successful deletion
  - Test: Delete contact (verify confirmation dialog)
  - Test: Confirm deletion (verify contact removed)
  - Test: Cancel deletion (verify contact remains)
  - Test: Delete non-existent contact (verify 404)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise

## Task Details

### Task 1: Create stitch_contacts Table Migration

**Files to create**:
- `stitch-run/supabase/migrations/020_create_contacts_table.sql`

**Implementation**:
```sql
-- Migration 020: Create Contacts Table (Proto-CRM)
-- Creates stitch_contacts table for storing contacts that can be used to seed workflows

CREATE TABLE stitch_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one email per user
  CONSTRAINT unique_contact_email_per_user UNIQUE (user_id, email)
);

-- Indexes for performance
CREATE INDEX idx_contacts_user_id ON stitch_contacts(user_id);
CREATE INDEX idx_contacts_user_email ON stitch_contacts(user_id, email);
CREATE INDEX idx_contacts_name ON stitch_contacts(name);
CREATE INDEX idx_contacts_company ON stitch_contacts(company);

-- RLS Policies
ALTER TABLE stitch_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts"
  ON stitch_contacts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own contacts"
  ON stitch_contacts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own contacts"
  ON stitch_contacts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own contacts"
  ON stitch_contacts FOR DELETE
  USING (user_id = auth.uid());
```

**Testing**:
- Run migration: `supabase db push`
- Verify table exists in Supabase dashboard
- Verify indexes created
- Verify RLS policies active

---

### Task 2: Create POST /api/contacts Endpoint

**Files to create**:
- `src/app/api/contacts/route.ts`

**Implementation**:
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Validate required fields
    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    // Create contact with user_id
    const { data, error } = await supabase
      .from('stitch_contacts')
      .insert({
        user_id: user.id,
        email: body.email,
        name: body.name || null,
        company: body.company || null,
        metadata: body.metadata || {}
      })
      .select()
      .single();
    
    if (error) {
      // Handle duplicate email (per user)
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Contact with this email already exists', code: 'DUPLICATE_CONTACT' },
          { status: 409 }
        );
      }
      throw error;
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Testing**:
- Call with valid data (verify 201)
- Call with duplicate email (verify 409)
- Call without email (verify 400)
- Call with invalid email format (verify 400)

---

### Task 3: Create GET /api/contacts Endpoint

**Files to modify**:
- `src/app/api/contacts/route.ts`

**Implementation**:
```typescript
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch contacts for authenticated user (RLS will enforce this, but explicit is better)
    const { data, error, count } = await supabase
      .from('stitch_contacts')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json({
      contacts: data || [],
      total: count || 0
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Testing**:
- Call endpoint (verify contacts returned)
- Verify contacts ordered by created_at desc

---

### Task 4: Create useContacts Hook

**Files to create**:
- `src/hooks/useContacts.ts`

**Implementation**:
```typescript
import { useState, useEffect, useCallback } from 'react';

interface Contact {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  company: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/contacts');
      if (!response.ok) throw new Error('Failed to fetch contacts');
      
      const data = await response.json();
      setContacts(data.contacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);
  
  return {
    contacts,
    isLoading,
    error,
    refetch: fetchContacts
  };
}
```

**Testing**:
- Use hook in component
- Verify data loads
- Verify refetch works

---

### Task 5: Create ContactManager Component

**Files to create**:
- `src/components/contacts/ContactManager.tsx`

**Implementation**:
```typescript
interface ContactManagerProps {
  onContactSelect?: (contact: Contact) => void;
  selectionMode?: 'single' | 'multiple' | 'none';
  selectedContactIds?: string[];
}

export function ContactManager({
  onContactSelect,
  selectionMode = 'none',
  selectedContactIds = []
}: ContactManagerProps) {
  const { contacts, isLoading, error, refetch } = useContacts();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Render contact list with import button
  // Handle empty state
  // Handle loading state
  // Handle error state
}
```

**Integration checklist**:
- [ ] ContactManager component created
- [ ] useContacts hook integrated
- [ ] Contact list displays
- [ ] Empty state shows
- [ ] Loading state shows
- [ ] Import button works
- [ ] Component is reusable

**Testing**:
- Render component in isolation
- Verify contacts display
- Verify empty state
- Verify loading state

---

## Success Criteria

### For Each Task
- [ ] Code written and follows project conventions
- [ ] Code integrated (imported and rendered in UI)
- [ ] Feature accessible (user can navigate to it)
- [ ] Feature works (user can complete workflow)
- [ ] Manual testing done (verified it works)
- [ ] Build succeeds (npm run build)

### For Overall Feature
- [ ] Users can view contact list on canvas page
- [ ] Users can manually import contacts
- [ ] Users can import contacts from CSV
- [ ] Users can sync contacts from Airtable
- [ ] Contact list refreshes after imports
- [ ] Duplicate contacts are handled correctly (skipped)
- [ ] API keys are handled securely
- [ ] All error cases handled gracefully
- [ ] Empty states and loading indicators present

## Notes

- **New table**: stitch_contacts is separate from stitch_entities
- **User-scoped**: Contacts are scoped to authenticated user (multi-tenancy)
- **Unique per user**: Email is unique per user (not globally unique)
- **Reusable component**: ContactManager can be embedded anywhere (node config, modals, pages)
- **No canvas integration**: This spec does NOT integrate ContactManager into canvas or node config
- **API compliance**: POST /api/contacts must return 409 for duplicates (per user)
- **Authentication**: All endpoints must verify user is authenticated
- **Security**: Airtable API keys must NEVER be in client code
- **Duplicate handling**: Skip and count, don't error
- **Batch imports**: Process in batches of 50, show progress
- **Error handling**: Collect all errors, show comprehensive results
- **Testing**: Manual testing after each task, automated tests are optional
- **Demo page**: Task 12 creates optional demo page for testing ContactManager
- **Future**: Integration with node configuration panels (when implementing specific nodes)
- **Future**: Workflow seeding (selecting contacts to create entities) will be in Phase 3
- **Future**: Add contact_id foreign key to stitch_entities (separate migration)
