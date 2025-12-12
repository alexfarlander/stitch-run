# Implementation Plan

- [x] 1. Install dependencies and verify SDK versions
  - Install @supabase/ssr package
  - Lock package versions in package.json
  - Verify exported function names (createServerClient, createBrowserClient, verifyOtp)
  - Test imports to confirm API compatibility
  - _Requirements: 7.1, 7.2_

- [x] 2. Update Supabase client utilities
- [x] 2.1 Update browser client for cookie-based auth
  - Modify src/lib/supabase/client.ts to use createBrowserClient from @supabase/ssr
  - Configure for cookie-based session storage
  - _Requirements: 2.1, 7.2_

- [x] 2.2 Update server client for SSR with cookie handling
  - Modify src/lib/supabase/server.ts to use createServerClient from @supabase/ssr
  - Implement cookie getAll/setAll handlers using next/headers
  - Add try/catch for setAll in server components
  - _Requirements: 2.4, 7.1_

- [x] 2.3 Create middleware client for edge runtime
  - Create src/lib/supabase/middleware.ts with updateSession function
  - Implement edge-compatible cookie handling (read-only request, write response)
  - Add user context headers (x-user-id, x-user-email) for same-request availability
  - Add token expiry check before refresh to avoid unnecessary refreshes
  - _Requirements: 2.6, 2.7, 3.3, 3.4, 3.7_

- [x] 2.4 Update admin client with security checks
  - Modify src/lib/supabase/admin.ts (or create if needed)
  - Add service role key validation
  - Add client-side usage prevention
  - Rename import to avoid collision (createSupabaseClient)
  - _Requirements: 7.5, 7.6, 7.8_

- [x] 3. Create authentication utilities
- [x] 3.1 Create session verification helper
  - Create src/lib/auth/session.ts with getSession and requireAuth functions
  - Implement shared server-side verifier for protected endpoints
  - _Requirements: 5.3, 5.6_

- [x] 3.2 Create redirect URL validation helper
  - Create src/lib/auth/redirect.ts with getSafeRedirectUrl function
  - Implement same-origin validation
  - Add whitelist check against SUPABASE_SITE_URL
  - _Requirements: 1.4, 1.7_

- [x] 3.3 Create authentication event logger
  - Create src/lib/auth/logger.ts with logAuthEvent function
  - Define AuthEvent interface
  - Implement logging to monitoring service
  - _Requirements: 11.1, 11.2_

- [x] 4. Implement Next.js middleware
- [x] 4.1 Create root middleware file
  - Create middleware.ts at project root
  - Implement static asset and health check exclusions
  - Call updateSession for session refresh
  - Implement protected route redirects
  - Add matcher config for proper path filtering
  - _Requirements: 3.1, 3.2, 3.5, 5.1_

- [x] 5. Create authentication routes
- [x] 5.1 Create login page
  - Create src/app/auth/login/page.tsx
  - Implement email input form
  - Add CSRF nonce generation and cookie storage
  - Call signInWithOtp with emailRedirectTo
  - Handle rate limit errors
  - Display error messages from query params
  - _Requirements: 1.1, 1.8, 1.9, 6.2_

- [x] 5.2 Create callback route handler
  - Create src/app/auth/callback/route.ts
  - Implement CSRF nonce verification
  - Call verifyOtp with token_hash and type parameters
  - Handle expired and invalid token errors with specific messages
  - Implement safe redirect with returnTo validation
  - Log authentication events
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 5.3 Create logout route handler
  - Create src/app/auth/logout/route.ts
  - Call supabase.auth.signOut server-side
  - Clear authentication cookies
  - Handle network failures gracefully
  - Redirect to login page
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 6. Create UI components
- [x] 6.1 Create user navigation component
  - Create src/components/auth/user-nav.tsx
  - Display user email when authenticated
  - Display sign-in button when not authenticated
  - Subscribe to onAuthStateChange for real-time updates
  - Use server component SSR for initial state
  - Handle loading states
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 7. Update existing code to use new clients
- [x] 7.1 Update API routes to use server client
  - Replace direct supabase imports with createClient from server.ts
  - Ensure proper cookie handling in route handlers
  - _Requirements: 2.4, 7.1_

- [x] 7.2 Update client components to use browser client
  - Replace direct supabase imports with createClient from client.ts
  - _Requirements: 2.5, 7.2_

- [x] 7.3 Update system operations to use admin client
  - Identify webhook handlers and background jobs
  - Replace with getAdminClient for service role operations
  - _Requirements: 7.5, 7.6_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
