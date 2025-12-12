# Implementation Plan

- [x] 1. Create shared utilities for production-side items
  - Create utility functions for timestamp formatting (relative time)
  - Create utility function for number formatting (comma separators)
  - Create utility function for status-to-color mapping
  - Create shared TypeScript interfaces for item props
  - _Requirements: 1.3, 4.3, 5.3, 5.4_

- [ ]* 1.1 Write property test for timestamp formatting
  - **Property 2: Timestamp formatting consistency**
  - **Validates: Requirements 1.3, 4.3, 5.4**

- [ ]* 1.2 Write property test for number formatting
  - **Property 5: Record count formatting**
  - **Validates: Requirements 5.3**

- [x] 1.3 Write property test for status color mapping
  - **Property 1: Status indicator color consistency**
  - **Validates: Requirements 1.5, 1.6, 1.7, 3.7, 3.8, 3.9, 4.5, 4.6, 4.7, 5.6, 5.7**

- [x] 2. Implement IntegrationItem component
  - Create `src/components/canvas/items/IntegrationItem.tsx`
  - Implement component with API name, status indicator, last ping time
  - Add optional usage indicator with percentage bar
  - Apply purple/indigo color scheme for production infrastructure
  - Use status-to-color utility for indicator styling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [ ]* 2.1 Write property test for IntegrationItem required data rendering
  - **Property 7: Required data rendering**
  - **Validates: Requirements 1.1, 1.2**

- [ ]* 2.2 Write property test for IntegrationItem optional data rendering
  - **Property 8: Optional data conditional rendering**
  - **Validates: Requirements 1.4**

- [x] 3. Implement PersonItem component
  - Create `src/components/canvas/items/PersonItem.tsx`
  - Implement component with avatar (image or placeholder), name, role
  - Add status indicator (online/offline/busy)
  - Add type badge (👤 for human, 🤖 for AI)
  - Apply warm color scheme for human presence
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [ ]* 3.1 Write property test for PersonItem type badge display
  - **Property 4: Type badge display consistency**
  - **Validates: Requirements 3.5, 3.6**

- [ ]* 3.2 Write property test for PersonItem required data rendering
  - **Property 7: Required data rendering**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [x] 4. Implement CodeItem component
  - Create `src/components/canvas/items/CodeItem.tsx`
  - Implement component with deployment name, status indicator
  - Add last deploy time with timestamp formatting
  - Add optional external link icon for repo/deployment URLs
  - Apply blue/cyan color scheme for tech focus
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ]* 4.1 Write property test for CodeItem required data rendering
  - **Property 7: Required data rendering**
  - **Validates: Requirements 4.1, 4.2**

- [ ]* 4.2 Write property test for CodeItem optional data rendering
  - **Property 8: Optional data conditional rendering**
  - **Validates: Requirements 4.4**

- [x] 5. Implement DataItem component
  - Create `src/components/canvas/items/DataItem.tsx`
  - Implement component with data source name, type icon
  - Add formatted record count using number formatting utility
  - Add last sync time with timestamp formatting
  - Add status indicator
  - Apply green/emerald color scheme for data focus
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ]* 5.1 Write property test for DataItem required data rendering
  - **Property 7: Required data rendering**
  - **Validates: Requirements 5.1, 5.2, 5.5**

- [x] 6. Implement health check API endpoint
  - Create `src/app/api/integrations/health/route.ts`
  - Implement GET handler that checks environment variables
  - Check for: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SHOTSTACK_API_KEY, ELEVENLABS_API_KEY, MINIMAX_API_KEY
  - Return status "connected" if key exists and is non-empty
  - Return status "disconnected" if key is missing or empty
  - Include lastPing timestamp in response
  - Return all integration statuses in response array
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

- [x] 6.1 Write property test for health check API key validation
  - **Property 3: Health check API key validation**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 6.2 Write property test for health check completeness
  - **Property 9: Health check completeness**
  - **Validates: Requirements 2.6**

- [ ]* 6.3 Write property test for health check timestamp update
  - **Property 10: Health check timestamp update**
  - **Validates: Requirements 2.5**

- [x] 7. Verify production-side visual distinction
  - Review all four components to ensure consistent production-side styling
  - Verify color schemes are distinct from customer-side components
  - Verify status indicators use consistent color mapping
  - Test components in BMC canvas context
  - _Requirements: 6.1, 6.2_

- [ ]* 7.1 Write property test for production-side visual distinction
  - **Property 6: Production-side visual distinction**
  - **Validates: Requirements 6.1, 6.2**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
