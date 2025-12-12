# Requirements: Contact Management (Proto-CRM)

## Introduction

This specification defines the contact management system for Stitch workflows. Contacts represent potential leads, customers, or recipients that can be imported into the system and later used in workflow nodes (like outreach campaigns, newsletters, demo invitations). This is a proto-CRM that stores contacts in Supabase and provides a reusable UI component for managing contacts.

## Glossary

- **Contact**: A person in the contact database (email, name, company) who can be used in workflows
- **Entity**: A contact that has entered a workflow and is traveling through nodes (created when workflow runs)
- **Contact Manager**: A reusable UI component for viewing and importing contacts
- **Contact Import Modal**: A modal dialog for importing contacts through various methods
- **CSV Import**: Bulk contact import from comma-separated value files
- **Airtable Sync**: Contact import from Airtable bases
- **Manual Entry**: Single contact creation through a form
- **Node Configuration**: The panel where users configure node settings (future integration point)

## Requirements

### Requirement 1: Contact Database

**User Story:** As a workflow manager, I want a database to store my contacts, so that I can use them in workflow nodes.

#### Acceptance Criteria

1. WHEN the system is initialized THEN the system SHALL have a stitch_contacts table in the database
2. WHEN a contact is created THEN the system SHALL store the user_id, email, name, company, and metadata
3. WHEN a contact is created THEN the system SHALL enforce email uniqueness per user
4. WHEN a user queries contacts THEN the system SHALL return only contacts belonging to that user
5. WHEN a user is deleted THEN the system SHALL cascade delete all their contacts

### Requirement 2: Contact API Endpoints

**User Story:** As a developer, I want API endpoints for contact management, so that I can integrate contact functionality into the UI.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/contacts with valid data THEN the system SHALL create a contact and return 201
2. WHEN a POST request is made to /api/contacts with duplicate email THEN the system SHALL return 409 with error code DUPLICATE_CONTACT
3. WHEN a POST request is made to /api/contacts without email THEN the system SHALL return 400 with error code VALIDATION_ERROR
4. WHEN a GET request is made to /api/contacts THEN the system SHALL return all contacts for the authenticated user
5. WHEN an unauthenticated request is made to any contact endpoint THEN the system SHALL return 401

### Requirement 3: Contact Manager Component

**User Story:** As a workflow manager, I want a UI component to view and manage my contacts, so that I can access my contact database from anywhere in the application.

#### Acceptance Criteria

1. WHEN the ContactManager component is rendered THEN the system SHALL display a list of contacts with name, email, and company
2. WHEN no contacts exist THEN the system SHALL display an empty state with import instructions
3. WHEN contacts are loading THEN the system SHALL display a loading indicator
4. WHEN the user clicks "Import Contacts" THEN the system SHALL open the contact import modal
5. WHEN the contact list is displayed THEN the system SHALL show contacts ordered by creation date (newest first)

### Requirement 4: Manual Contact Import

**User Story:** As a workflow manager, I want to manually add individual contacts, so that I can quickly add specific people to my database.

#### Acceptance Criteria

1. WHEN the user selects the manual entry tab THEN the system SHALL display a form with fields for name, email, and company
2. WHEN the user submits the form with valid data THEN the system SHALL call POST /api/contacts with the contact data
3. WHEN the contact is successfully created THEN the system SHALL close the modal and refresh the contact list
4. WHEN the user attempts to submit without an email THEN the system SHALL prevent submission and display a validation error
5. WHEN an email already exists in the user's database THEN the system SHALL display a message indicating the contact already exists
6. WHEN the API returns an error THEN the system SHALL display the error message to the user

### Requirement 5: CSV Contact Import

**User Story:** As a workflow manager, I want to import contacts from CSV files, so that I can bulk-add contacts from spreadsheets.

#### Acceptance Criteria

1. WHEN the user selects the CSV import tab THEN the system SHALL display a file upload area
2. WHEN the user uploads a CSV file THEN the system SHALL parse the file and validate required fields
3. WHEN the CSV is valid THEN the system SHALL display a preview of contacts to be imported
4. WHEN the user confirms the import THEN the system SHALL batch create contacts via POST /api/contacts
5. WHEN the import is in progress THEN the system SHALL display a progress indicator
6. WHEN the import completes THEN the system SHALL display results showing success count and any errors
7. WHEN the import succeeds THEN the system SHALL refresh the contact list to show new contacts
8. WHEN a CSV row lacks an email field THEN the system SHALL skip that row and include it in the error report
9. WHEN a CSV row contains an email that already exists THEN the system SHALL skip that row and include it in the skipped count

### Requirement 6: Airtable Contact Sync

**User Story:** As a workflow manager, I want to sync contacts from Airtable, so that I can import my existing contact database.

#### Acceptance Criteria

1. WHEN the user selects the Airtable sync tab THEN the system SHALL display a form for Airtable credentials and field mapping
2. WHEN the user submits valid Airtable credentials THEN the system SHALL call POST /api/integrations/airtable/sync-contacts
3. WHEN the sync is in progress THEN the system SHALL display a progress indicator
4. WHEN the sync completes successfully THEN the system SHALL display the count of synced contacts and skipped contacts
5. WHEN the sync completes THEN the system SHALL refresh the contact list to show new contacts
6. WHEN an Airtable record lacks an email field THEN the system SHALL reject that record early and include it in the error report
7. WHEN an Airtable record contains an email that already exists THEN the system SHALL skip that record and include it in the skipped count
8. WHEN the API returns an authentication error THEN the system SHALL display a clear error message about invalid credentials
9. WHEN the API returns a CORS error THEN the system SHALL display a clear error message about API configuration

### Requirement 7: Contact List Refresh

**User Story:** As a workflow manager, I want the contact list to update after imports, so that I can immediately see newly added contacts.

#### Acceptance Criteria

1. WHEN a contact is successfully imported via any method THEN the system SHALL trigger a refetch of the contact list
2. WHEN the contact list refetch completes THEN the system SHALL display the updated list including new contacts
3. WHEN multiple contacts are imported in batch THEN the system SHALL refetch the list once after all imports complete
4. WHEN the refetch is in progress THEN the system SHALL display a loading indicator on the contact list

### Requirement 8: Contact Editing

**User Story:** As a workflow manager, I want to edit existing contacts, so that I can keep my contact information up to date.

#### Acceptance Criteria

1. WHEN the user clicks on a contact in the list THEN the system SHALL open an edit contact modal
2. WHEN the edit modal is displayed THEN the system SHALL pre-populate the form with current contact data
3. WHEN the user submits the edit form with valid data THEN the system SHALL call PATCH /api/contacts/[id] with the updated data
4. WHEN the contact is successfully updated THEN the system SHALL close the modal and refresh the contact list
5. WHEN the user attempts to change the email to one that already exists THEN the system SHALL display a validation error
6. WHEN the API returns an error THEN the system SHALL display the error message to the user

### Requirement 9: Contact Deletion

**User Story:** As a workflow manager, I want to delete contacts I no longer need, so that I can keep my contact database clean.

#### Acceptance Criteria

1. WHEN the user clicks the delete button on a contact THEN the system SHALL show a confirmation dialog
2. WHEN the user confirms deletion THEN the system SHALL call DELETE /api/contacts/[id]
3. WHEN the contact is successfully deleted THEN the system SHALL remove it from the list and show a success message
4. WHEN the user cancels deletion THEN the system SHALL close the confirmation dialog without deleting
5. WHEN the API returns an error THEN the system SHALL display the error message to the user
6. WHEN a contact is referenced by entities THEN the system SHALL prevent deletion and show an appropriate message

## Non-Functional Requirements

### Performance

1. Contact list SHALL load within 2 seconds for up to 10,000 contacts
2. CSV import SHALL process at least 100 contacts per second
3. Contact list refresh SHALL complete within 1 second after import

### Usability

1. Import modal SHALL provide clear feedback for all user actions
2. Error messages SHALL be specific and actionable
3. Progress indicators SHALL show during all async operations
4. Empty states SHALL guide users toward import actions

### Data Integrity

1. Email field SHALL be required for all contacts
2. Duplicate emails SHALL be handled gracefully (skip and report in skipped count)
3. Failed imports SHALL not leave partial data in the database
4. User isolation SHALL be enforced (users can only see their own contacts)

## Out of Scope

- Contact filtering and search (will be addressed in future spec)
- Contact detail view (will be addressed in future spec)
- Integration with node configuration panels (will be addressed when implementing specific node types)
- Contact selection for workflow runs (will be addressed in Phase 3: Run Management)
- Contact tags and segmentation (future enhancement)
- Bulk contact operations (select multiple, bulk delete, bulk edit)
