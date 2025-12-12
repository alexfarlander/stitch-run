# Design: Contact Management (Proto-CRM)

## Overview

The Contact Management system is a proto-CRM that enables users to import and store contacts (potential leads, customers, recipients) in Supabase. Contacts can be imported via manual entry, CSV bulk import, or Airtable synchronization. Once imported, contacts are stored in the `stitch_contacts` table and can later be used to seed workflows (creating entities that travel through the canvas).

**Key Distinction:**
- **Contacts** = People in your database (proto-CRM) - stored in `stitch_contacts`
- **Entities** = Contacts that have entered a workflow - stored in `stitch_entities`

## Architecture

### Component Hierarchy

```
ContactManager (reusable component)
├── ContactList
│   └── ContactListItem[]
└── ContactImportModal
    ├── ManualEntryTab
    ├── CSVImportTab
    └── AirtableImportTab
```

**Integration Points** (out of scope for this spec):
- Can be embedded in node configuration panels
- Can be opened as a standalone modal
- Can be used in settings pages

### Data Flow

1. **Contact List Display**:
   - ContactManager → useContacts hook → GET /api/contacts → Supabase (`stitch_contacts`)

2. **Manual Import**:
   - ManualEntryTab → POST /api/contacts → Supabase → refetch contacts

3. **CSV Import**:
   - CSVImportTab → Parse CSV → Batch POST /api/contacts → Supabase → refetch contacts

4. **Airtable Import**:
   - AirtableImportTab → POST /api/integrations/airtable/sync-contacts → Airtable API → Batch create → Supabase → refetch contacts

5. **Future: Node Integration** (out of scope):
   - Node config panel → Embed ContactManager → User selects contacts → Node stores contact IDs in config

6. **Future: Workflow Execution** (Phase 3):
   - Workflow runs → Node reads contact IDs from config → Creates entities in `stitch_entities` for each contact

## Data Models

### Contact (Database: stitch_contacts)

```typescript
interface Contact {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to auth.users (owner)
  email: string;                 // Required, unique per user
  name: string | null;           // Optional display name
  company: string | null;        // Optional company name
  metadata: Record<string, any>; // Additional custom fields from CSV/Airtable
  created_at: string;            // Timestamp
  updated_at: string;            // Timestamp
}
```

### Import Result

```typescript
interface ImportResult {
  success: number;    // Count of successfully imported contacts
  skipped: number;    // Count of duplicates skipped
  errors: string[];   // Array of error messages
}
```

### CSV Row

```typescript
interface CSVRow {
  email: string;      // Required
  name?: string;      // Optional
  company?: string;   // Optional
  [key: string]: any; // Additional columns stored in metadata
}
```

### Airtable Sync Config

```typescript
interface AirtableSyncConfig {
  airtableConfigId: string;  // Reference to stored credentials (server-side)
  baseId: string;            // Airtable base ID
  tableId: string;           // Airtable table ID
  fieldMapping: {
    email: string;           // Airtable field name for email
    name?: string;           // Airtable field name for name
    company?: string;        // Airtable field name for company
  };
}
```

## Component Architecture

### ContactManager

**Purpose**: Reusable component for viewing, importing, editing, and deleting contacts

**Props**:
```typescript
interface ContactManagerProps {
  onContactSelect?: (contact: Contact) => void;  // Optional: for selecting contacts
  selectionMode?: 'single' | 'multiple' | 'none'; // Optional: default 'none'
  selectedContactIds?: string[];                   // Optional: for controlled selection
  showActions?: boolean;                           // Optional: show edit/delete buttons, default true
}
```

**State**:
```typescript
const [isImportModalOpen, setIsImportModalOpen] = useState(false);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [editingContact, setEditingContact] = useState<Contact | null>(null);
const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
```

**Hooks**:
- `useContacts()` - Fetches and manages contact list

**Integration**: Can be embedded in node config panels, modals, or standalone pages

### EditContactModal

**Purpose**: Modal for editing existing contacts

**Props**:
```typescript
interface EditContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  onContactUpdated: () => void;
}
```

**State**:
```typescript
const [formData, setFormData] = useState({
  email: '',
  name: '',
  company: ''
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
```

**API Call**:
```typescript
PATCH /api/contacts/[id]
Body: {
  email: string,
  name?: string,
  company?: string,
  metadata?: Record<string, any>
}
```

### ContactImportModal

**Purpose**: Multi-tab modal for importing contacts via different methods

**Props**:
```typescript
interface ContactImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void; // Callback to refresh contact list
}
```

**State**:
```typescript
const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'airtable'>('manual');
```

**Integration**: Rendered by ContactListPanel, controlled by modal state

### ManualEntryTab

**Purpose**: Form for manually adding a single contact

**Props**:
```typescript
interface ManualEntryTabProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}
```

**State**:
```typescript
const [formData, setFormData] = useState({
  email: '',
  name: '',
  company: ''
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
```

**Validation**:
- Email: Required, valid email format

**API Call**:
```typescript
POST /api/contacts
Body: {
  email: string,
  name?: string,
  company?: string
}
```

### CSVImportTab

**Purpose**: Bulk import contacts from CSV file

**Props**:
```typescript
interface CSVImportTabProps {
  onSuccess: (result: ImportResult) => void;
  onError: (error: string) => void;
}
```

**State**:
```typescript
const [file, setFile] = useState<File | null>(null);
const [parsedData, setParsedData] = useState<CSVRow[]>([]);
const [isUploading, setIsUploading] = useState(false);
const [showPreview, setShowPreview] = useState(false);
const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
```

**CSV Parsing**:
- Use `papaparse` library for CSV parsing
- Validate required columns (email)
- Map additional columns to metadata
- Show preview of first 10 rows

**Batch Import Strategy**:
- Process in batches of 50 contacts
- Show progress indicator
- Continue on individual errors, collect error messages
- Return comprehensive result

**API Call**:
```typescript
// Multiple calls in batches
POST /api/contacts (repeated for each batch)
Body: {
  email: string,
  name?: string,
  company?: string,
  metadata?: Record<string, any>
}
```

### AirtableImportTab

**Purpose**: Sync contacts from Airtable base

**Props**:
```typescript
interface AirtableImportTabProps {
  onSuccess: (result: ImportResult) => void;
  onError: (error: string) => void;
}
```

**State**:
```typescript
const [config, setConfig] = useState({
  airtableConfigId: '',  // Reference to stored credentials (server-side)
  baseId: '',
  tableId: '',
  fieldMapping: { email: '' }
});
const [isSyncing, setIsSyncing] = useState(false);
const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
```

**API Call**:
```typescript
POST /api/integrations/airtable/sync-contacts
Body: {
  airtable_config_id: string,  // Reference to stored credentials
  base_id: string,
  table_id: string,
  field_mapping: {
    email: string,
    name?: string,
    company?: string
  }
}

Response: {
  success: number,
  skipped: number,
  errors: string[]
}
```

## API Contracts

### POST /api/contacts

**Purpose**: Create a single contact

**Request**:
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "company": "Acme Inc",
  "metadata": {}
}
```

**Response** (Success - 201):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "company": "Acme Inc",
  "metadata": {},
  "created_at": "2025-12-09T10:00:00Z",
  "updated_at": "2025-12-09T10:00:00Z"
}
```

**Response** (Duplicate - 409):
```json
{
  "error": "Contact with this email already exists",
  "code": "DUPLICATE_CONTACT"
}
```

**Response** (Validation Error - 400):
```json
{
  "error": "Email is required",
  "code": "VALIDATION_ERROR"
}
```

### GET /api/contacts

**Purpose**: Fetch all contacts

**Response** (Success - 200):
```json
{
  "contacts": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "company": "Acme Inc",
      "metadata": {},
      "created_at": "2025-12-09T10:00:00Z",
      "updated_at": "2025-12-09T10:00:00Z"
    }
  ],
  "total": 1
}
```

### PATCH /api/contacts/[id]

**Purpose**: Update an existing contact

**Request**:
```json
{
  "email": "updated@example.com",
  "name": "Updated Name",
  "company": "Updated Company",
  "metadata": {}
}
```

**Response** (Success - 200):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "email": "updated@example.com",
  "name": "Updated Name",
  "company": "Updated Company",
  "metadata": {},
  "created_at": "2025-12-09T10:00:00Z",
  "updated_at": "2025-12-09T10:30:00Z"
}
```

**Response** (Not Found - 404):
```json
{
  "error": "Contact not found",
  "code": "NOT_FOUND"
}
```

**Response** (Duplicate Email - 409):
```json
{
  "error": "Contact with this email already exists",
  "code": "DUPLICATE_CONTACT"
}
```

### DELETE /api/contacts/[id]

**Purpose**: Delete a contact

**Response** (Success - 200):
```json
{
  "message": "Contact deleted successfully"
}
```

**Response** (Not Found - 404):
```json
{
  "error": "Contact not found",
  "code": "NOT_FOUND"
}
```

**Response** (Cannot Delete - 409):
```json
{
  "error": "Cannot delete contact: referenced by active entities",
  "code": "CONTACT_IN_USE"
}
```

### POST /api/integrations/airtable/sync-contacts

**Purpose**: Sync contacts from Airtable

**Security Note**: This endpoint must be implemented server-side only. Airtable API keys must NEVER be sent from the client.

**Request**:
```json
{
  "airtable_config_id": "uuid",  // Reference to stored credentials
  "base_id": "appXXXXXXXXXXXXXX",
  "table_id": "tblXXXXXXXXXXXXXX",
  "field_mapping": {
    "email": "Email",
    "name": "Full Name",
    "company": "Company"
  }
}
```

**Response** (Success - 200):
```json
{
  "success": 45,
  "skipped": 5,
  "errors": [
    "Row 3: Missing email field",
    "Row 7: Missing email field"
  ]
}
```

## Database Schema

### stitch_contacts Table (NEW)

```sql
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

-- Index for fast lookups by user
CREATE INDEX idx_contacts_user_id ON stitch_contacts(user_id);

-- Index for email lookups within user scope
CREATE INDEX idx_contacts_user_email ON stitch_contacts(user_id, email);

-- Index for name searches (future)
CREATE INDEX idx_contacts_name ON stitch_contacts(name);

-- Index for company searches (future)
CREATE INDEX idx_contacts_company ON stitch_contacts(company);
```

### RLS Policies

```sql
-- Users can only view their own contacts
CREATE POLICY "Users can view own contacts"
  ON stitch_contacts FOR SELECT
  USING (user_id = auth.uid());

-- Users can only create contacts for themselves
CREATE POLICY "Users can create own contacts"
  ON stitch_contacts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can only update their own contacts
CREATE POLICY "Users can update own contacts"
  ON stitch_contacts FOR UPDATE
  USING (user_id = auth.uid());

-- Users can only delete their own contacts
CREATE POLICY "Users can delete own contacts"
  ON stitch_contacts FOR DELETE
  USING (user_id = auth.uid());
```

**Note**: Contacts are scoped to the authenticated user (not per-canvas, but per-user). Each user has their own contact database that can be used across all their workflows.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Contact uniqueness

*For any* email address, creating a contact with an existing email should result in the contact being skipped and included in the skipped count, not creating a duplicate.

**Validates: Requirements 3.5, 4.9, 5.7**

### Property 2: Required field validation

*For any* contact creation attempt, if the email is missing or invalid, the system should reject the creation and return a validation error.

**Validates: Requirements 3.4**

### Property 3: Import result consistency

*For any* batch import operation, the sum of success count, skipped count, and error count should equal the total number of input records.

**Validates: Requirements 4.6, 5.4**

### Property 4: Contact list refresh after import

*For any* successful import operation (manual, CSV, or Airtable), the contact list should be refetched and display the newly imported contacts.

**Validates: Requirements 6.1, 6.2**

## Error Handling

### Client-Side Errors

1. **Validation Errors**:
   - Display inline error messages below form fields
   - Prevent form submission until errors are resolved
   - Use red text and border colors for error states

2. **Network Errors**:
   - Display toast notification with retry option
   - Log error to console for debugging
   - Maintain form state so user doesn't lose data

3. **File Upload Errors**:
   - Validate file type (must be .csv)
   - Validate file size (max 10MB)
   - Display clear error message if validation fails

### Server-Side Errors

1. **Duplicate Contact (409)**:
   - Skip the contact
   - Include in skipped count
   - Continue processing remaining contacts

2. **Validation Error (400)**:
   - Return specific error message
   - Include field name in error
   - Client displays error to user

3. **Authentication Error (401)**:
   - Return clear message about invalid credentials
   - Suggest checking API key or permissions
   - Don't expose internal error details

4. **CORS Error (500)**:
   - Return clear message about configuration issue
   - Suggest checking API settings
   - Log detailed error server-side

## Testing Strategy

### Unit Tests

1. **CSV Parsing**:
   - Test valid CSV with all fields
   - Test CSV with missing optional fields
   - Test CSV with missing required fields
   - Test CSV with extra columns (should go to metadata)
   - Test empty CSV file

2. **Validation Functions**:
   - Test email validation (valid/invalid formats)
   - Test required field validation

3. **Duplicate Detection**:
   - Test duplicate email (should skip)

### Integration Tests

1. **Manual Import Flow**:
   - Create contact via form
   - Verify contact appears in list
   - Verify contact persisted to database
   - Test duplicate handling

2. **CSV Import Flow**:
   - Upload valid CSV
   - Verify preview displays
   - Confirm import
   - Verify all contacts created
   - Verify contact list refreshed

3. **Airtable Sync Flow**:
   - Configure Airtable credentials
   - Trigger sync
   - Verify contacts imported
   - Verify duplicate handling
   - Verify error handling

## Performance Considerations

### Contact List Loading

- **Pagination**: Load contacts in pages of 50
- **Virtual Scrolling**: Use react-window for lists > 100 contacts
- **Debounced Search**: If search is added, debounce by 300ms

### CSV Import

- **Batch Processing**: Process in batches of 50 contacts
- **Progress Updates**: Update UI every batch
- **Worker Thread**: Consider using Web Worker for large files (>1000 rows)

### Airtable Sync

- **Rate Limiting**: Respect Airtable API rate limits (5 requests/second)
- **Batch Requests**: Fetch records in batches of 100
- **Timeout**: Set 30-second timeout for sync operation

## Security Considerations

### Input Validation

- **Email Sanitization**: Validate and sanitize email addresses
- **SQL Injection Prevention**: Use parameterized queries
- **XSS Prevention**: Sanitize all user input before display

### API Security

- **Authentication**: Verify user is authenticated before operations
- **Rate Limiting**: Limit API calls to prevent abuse
- **API Key Storage**: Never expose Airtable API keys in client code

### Data Privacy

- **RLS Policies**: Enforce row-level security on all queries
- **Audit Logging**: Log all contact creation/modification
- **Data Encryption**: Encrypt sensitive fields at rest

## Trade-offs and Decisions

### Decision 1: User-Scoped Contact Database

**Options Considered**:
- Option A: Contacts are global (shared across all users)
- Option B: Contacts are per-user (scoped to authenticated user)
- Option C: Contacts are per-canvas

**Decision**: Option B - User-scoped contact database

**Rationale**:
- Security: Users should only see their own contacts
- Multi-tenancy: Stitch is a multi-client platform
- Privacy: Contact data must be isolated per user/organization
- Reusability: Contacts can still be used across all of a user's workflows
- Aligns with CRM concept (each user has their own contact database)

### Decision 2: Skip Duplicates vs Update

**Options Considered**:
- Option A: Skip duplicates and report in skipped count
- Option B: Update existing contacts with new data
- Option C: Error on duplicates

**Decision**: Option A - Skip duplicates

**Rationale**:
- Prevents accidental data overwrites
- Simpler implementation
- Clear feedback to user about what happened
- Aligns with common import patterns

### Decision 3: Separate Contacts from Entities with Foreign Key

**Options Considered**:
- Option A: Store contacts in separate `stitch_contacts` table, entities reference contacts
- Option B: Reuse `stitch_entities` table for contacts
- Option C: Separate tables with no relationship

**Decision**: Option A - Separate table with foreign key relationship

**Rationale**:
- Clear separation of concerns (contacts = database, entities = workflow instances)
- Entities have workflow-specific fields (current_node_id, edge_progress)
- Contacts are reusable, entities are single-use
- Foreign key maintains data integrity (each entity has a contact)
- Enables tracking which contacts have been used in workflows
- Easier to understand and maintain

**Implementation Note**: `stitch_entities` will need a migration to add `contact_id` foreign key. This will be done in a future task/spec.

## Dependencies

### External Libraries

- `papaparse`: CSV parsing (^5.4.1)
- `react-window`: Virtual scrolling for large lists (^1.8.10)
- `zod`: Schema validation (^3.22.4)

### Internal Dependencies

- `LeftSidePanel`: Existing reusable panel component
- `POST /api/contacts`: New API endpoint to create
- `GET /api/contacts`: New API endpoint to create
- `POST /api/integrations/airtable/sync-contacts`: New API endpoint to create

### Database Dependencies

- `stitch_contacts` table (NEW - needs migration)
- RLS policies for security

## Implementation Notes

### Phase 2: Contact Management

**Task 1**: Create stitch_contacts table migration
**Task 2**: Create POST /api/contacts endpoint
**Task 3**: Create GET /api/contacts endpoint
**Task 4**: Create useContacts hook
**Task 5**: Create ContactManager component
**Task 6**: Add contact import button and modal
**Task 7**: Implement manual contact import
**Task 8**: Implement CSV import
**Task 9**: Implement Airtable sync
**Task 10**: Add empty states and loading indicators
**Task 11**: Add error handling and user feedback
**Task 12**: Create demo page to test ContactManager (optional)
**Task 13**: Add contact editing functionality
**Task 14**: Add contact deletion functionality
**Task 15**: Final checkpoint

## Future Enhancements (Out of Scope)

- Contact search and filtering
- Contact tags and segmentation
- Contact detail view with history
- Contact export to CSV
- Bulk contact operations (select multiple, bulk delete, bulk edit)
- Contact selection mode (for choosing contacts in node config)
- Integration with specific node types (Send Email, Create Outreach, etc.)
- Workflow seeding/execution (creating entities from contacts) - Phase 3
