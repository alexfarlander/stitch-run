# Requirements Document

## Introduction

This document specifies the requirements for implementing Supabase Authentication with magic link (passwordless email authentication) in the Stitch application using Supabase's built-in email OTP flow. The system will enable users to authenticate via email without passwords, manage user sessions with proper cookie-based middleware, and protect routes that require authentication. The implementation must follow Supabase's latest SSR patterns for Next.js App Router with proper cookie handling.

## Glossary

- **Magic Link**: A one-time authentication URL sent via email that allows users to sign in without a password
- **Stitch Application**: The Living Business Model Canvas application being developed
- **Supabase Auth**: Supabase's authentication service that handles user management and session tokens
- **SSR Client**: Server-Side Rendering client that reads session data from cookies
- **Cookie Middleware**: Next.js middleware that manages authentication cookies across requests
- **Protected Route**: A page or API endpoint that requires user authentication to access
- **Session**: An authenticated user's active login state stored in secure cookies
- **Auth Callback Route**: The endpoint at /auth/callback that processes magic link tokens and establishes sessions
- **Return URL**: The destination URL to redirect users after successful authentication
- **RLS**: Row Level Security policies in Supabase that restrict database access based on authenticated user
- **Anon Key**: Supabase anonymous/publishable key used with RLS for user-scoped database operations
- **Service Role Key**: Supabase privileged key that bypasses RLS for system-level operations
- **Edge Runtime**: Next.js middleware execution environment with limited Node.js API access
- **Refresh Token**: Long-lived token used to obtain new access tokens without re-authentication

## Requirements

### Requirement 1

**User Story:** As a user, I want to sign in using my email address without a password, so that I can access the Stitch application securely and conveniently.

#### Acceptance Criteria

1. WHEN a user enters their email address and requests a magic link THEN the System SHALL send an authentication email containing a unique one-time login URL pointing to /auth/callback using Supabase's signInWithOtp method
2. WHEN a user clicks the magic link in their email THEN the System SHALL verify the token at the /auth/callback endpoint using Supabase's server client and create an authenticated session
3. WHEN a magic link is used THEN Supabase SHALL invalidate the one-time token in the one_time_tokens table to prevent reuse
4. WHEN a user is successfully authenticated THEN the System SHALL redirect them to the returnTo URL if provided and whitelisted, otherwise to the root path
5. WHEN a magic link expires after the configured timeout THEN the System SHALL reject the authentication attempt and display the error message "Your magic link has expired. Please request a new one."
6. WHEN a magic link contains an invalid or tampered token THEN the System SHALL reject the authentication and display the error message "Invalid authentication link. Please request a new one."
7. WHEN the /auth/callback endpoint receives a redirect URL THEN the System SHALL validate that the URL is same-origin and matches the SUPABASE_SITE_URL origin to prevent open redirect vulnerabilities
8. WHEN a user requests multiple magic links within a short time period THEN the System SHALL rate-limit requests per email address and per IP address to prevent abuse
9. WHEN the sign-in request endpoint is accessed THEN the System SHALL implement CAPTCHA verification to prevent automated abuse

### Requirement 2

**User Story:** As a developer, I want proper cookie-based session management using Next.js middleware, so that user authentication state persists correctly across server and client components.

#### Acceptance Criteria

1. WHEN the application initializes THEN the System SHALL configure Supabase clients to use cookie-based session storage with persistSession set to false for server contexts
2. WHEN a user authenticates THEN the System SHALL store access tokens and refresh tokens in separate cookies with Secure, HttpOnly, SameSite=Lax, Path=/, and appropriate Domain attributes
3. WHEN cookies are set THEN the System SHALL use Supabase Auth-compatible cookie names for access_token, refresh_token, expires_at, and provider_token
4. WHEN a server component needs user data THEN the System SHALL read session information from cookies using the SSR Supabase client
5. WHEN a client component needs user data THEN the System SHALL access session information through the browser Supabase client
6. WHEN the refresh token is used to obtain a new access token THEN the System SHALL perform the refresh operation server-side only and never expose the refresh token to client JavaScript
7. WHEN the Middleware refreshes tokens THEN the System SHALL return a Response with updated set-cookie headers containing the new token values
8. WHEN session cookies are updated THEN the Middleware SHALL synchronize cookie state between Supabase Auth and the Next.js application using the SSR client pattern

### Requirement 3

**User Story:** As a developer, I want to implement Next.js middleware that handles authentication cookies, so that session state is properly managed across all requests.

#### Acceptance Criteria

1. WHEN any request is made to application routes THEN the Middleware SHALL execute before the request reaches route handlers
2. WHEN the Middleware processes requests to static assets, health check endpoints, or public API routes THEN the System SHALL skip authentication processing for paths matching /_next/, /favicon.ico, /api/health, and file extensions
3. WHEN the Middleware processes a request THEN the System SHALL use an edge-compatible Supabase client that reads cookies from the request and supplies them to supabase-js
4. WHEN session tokens are refreshed THEN the Middleware SHALL update the response cookies with new token values using Web API set-cookie headers
5. WHEN the Middleware completes THEN the System SHALL pass the updated request and response to the next handler
6. WHEN authentication state changes THEN the Middleware SHALL ensure cookie consistency across subsequent requests
7. WHEN the Middleware runs in the edge runtime THEN the System SHALL only use Web APIs and Deno-compatible libraries without Node.js modules
8. WHEN the Middleware performs session refresh THEN the System SHALL keep operations minimal and fast without heavy database queries

### Requirement 4

**User Story:** As a user, I want to sign out of my account, so that I can end my session and protect my account security.

#### Acceptance Criteria

1. WHEN a user clicks the sign out button THEN the System SHALL call supabase.auth.signOut server-side to invalidate the current session
2. WHEN a session is invalidated THEN the System SHALL clear all authentication cookies and revoke the refresh token in auth.refresh_tokens
3. WHEN sign out completes successfully THEN the System SHALL redirect the user to the login page
4. WHEN a signed-out user attempts to access protected routes THEN the System SHALL redirect them to the login page with the intended destination preserved in the returnTo parameter
5. WHEN sign out fails due to network issues THEN the System SHALL clear cookies locally immediately, attempt server revoke asynchronously, and display the error message "Sign out failed. Please try again."
6. WHEN the session expires naturally THEN the System SHALL display the message "Your session has expired. Please sign in again." on the login page

### Requirement 5

**User Story:** As a developer, I want to protect specific routes and API endpoints, so that only authenticated users can access them.

#### Acceptance Criteria

1. WHEN an unauthenticated user attempts to access a protected route THEN the System SHALL redirect them to /auth/login with the current path stored in the returnTo parameter
2. WHEN an authenticated user accesses a protected route THEN the System SHALL allow the request to proceed
3. WHEN a protected API endpoint receives a request THEN the System SHALL use a shared server-side verifier function that reads cookies, calls supabase.auth.getUser, and validates the session before processing
4. WHEN session verification fails on an API endpoint THEN the System SHALL return a 401 Unauthorized response with the error message "Authentication required"
5. WHEN a user's session expires while on a protected route THEN the System SHALL redirect them to /auth/login and preserve the intended destination URL in the returnTo parameter
6. WHEN the shared verifier function is called THEN the System SHALL read cookies from the request, validate the session using the server Supabase client, and return the authenticated user or null
7. WHEN API routes need high performance THEN the System MAY optionally verify JWT token signatures locally with cached JWKs instead of calling Supabase for every request
8. WHEN role-based access control is needed THEN the System SHALL check custom JWT claims from auth.jwt() to verify user roles

### Requirement 6

**User Story:** As a user, I want to see my authentication status in the application UI, so that I know whether I am logged in and can access my account information.

#### Acceptance Criteria

1. WHEN a user is authenticated THEN the System SHALL display the user's email address in the navigation bar
2. WHEN a user is not authenticated THEN the System SHALL display a sign-in button in the navigation bar
3. WHEN the authentication state changes THEN the UI SHALL update immediately using Supabase's onAuthStateChange subscription
4. WHEN a user's session is loading THEN the System SHALL display a loading indicator in the authentication UI
5. WHEN displaying user information THEN the System SHALL handle missing or incomplete user data gracefully
6. WHEN the page initially loads THEN the System SHALL use server component SSR to render the initial authentication state to avoid UI flicker

### Requirement 7

**User Story:** As a developer, I want to create reusable Supabase client utilities for server and client contexts, so that authentication works correctly in all parts of the application.

#### Acceptance Criteria

1. WHEN creating a server-side Supabase client THEN the System SHALL use the createServerSupabaseClient pattern that reads cookies from the request and supplies them to supabase-js with the anon key
2. WHEN creating a client-side Supabase client THEN the System SHALL use browser cookie storage for session management with the anon key
3. WHEN a server component needs database access for user-scoped operations THEN the System SHALL use the server client with RLS enabled
4. WHEN a client component needs database access for user-scoped operations THEN the System SHALL use the browser client with RLS enabled
5. WHEN the admin client is needed for system operations THEN the System SHALL provide a service-role client that bypasses Row Level Security for server-side operations only
6. WHEN external webhooks or system processes need database access THEN the System SHALL use the service-role client with the service role key
7. WHEN user-facing routes need database access THEN the System SHALL use the anon key client with RLS policies enforcing user ownership
8. WHEN the service role key is configured THEN the System SHALL store it in environment secrets and never expose it to client-side code

### Requirement 8

**User Story:** As a system administrator, I want to configure email templates and authentication settings in Supabase, so that magic link emails are properly branded and functional.

#### Acceptance Criteria

1. WHEN the authentication system is configured THEN the System SHALL set the Supabase Site URL to match NEXT_PUBLIC_BASE_URL for the current environment
2. WHEN configuring redirect URLs THEN the System SHALL add the /auth/callback endpoint to the allowed redirect URLs list for each environment in the Supabase dashboard
3. WHEN a magic link email is sent THEN the Email SHALL contain clear instructions, branding, and a link pointing to the configured Site URL with /auth/callback path
4. WHEN configuring email templates THEN the System SHALL support customization of email content, styling, and sender information in the Supabase dashboard
5. WHEN setting authentication policies THEN the System SHALL configure session timeout duration, refresh token expiration, and magic link TTL in the Supabase dashboard
6. WHEN magic links are generated THEN the System SHALL use the Site URL configured for the current environment
7. WHEN deploying to different environments THEN the System SHALL require separate Supabase Site URL configuration for development, staging, and production
8. WHEN testing email flows THEN the System SHALL use a dedicated sending domain or the Supabase dashboard email preview in staging environments

### Requirement 9

**User Story:** As a developer, I want Row Level Security policies on database tables, so that users can only access their own data and system operations can bypass RLS when needed.

#### Acceptance Criteria

1. WHEN RLS policies are created for stitch_canvases THEN the System SHALL allow users to read and write only canvases where they are the owner
2. WHEN RLS policies are created for stitch_runs THEN the System SHALL allow users to read and write only runs associated with canvases they own
3. WHEN RLS policies are created for stitch_entities THEN the System SHALL allow users to read and write only entities associated with canvases they own
4. WHEN RLS policies are created for stitch_journey_events THEN the System SHALL allow users to read only journey events for entities they own
5. WHEN a user attempts to access data they do not own THEN the Database SHALL return an empty result set without error
6. WHEN the service role client is used THEN the Database SHALL bypass all RLS policies and allow full access
7. WHEN RLS is enabled on a table THEN the System SHALL ensure all existing queries continue to function with proper user context
8. WHEN RLS policies are created THEN the System SHALL create database indexes on user_id and ownership columns used by the policies
9. WHEN complex permission checks are needed THEN the System SHALL use SECURITY DEFINER helper functions and revoke execute permissions from anon and authenticated roles
10. WHEN testing RLS policies THEN the System SHALL simulate authenticated and unauthenticated requests using both anon and service role keys


### Requirement 10

**User Story:** As a developer, I want comprehensive tests for the authentication system, so that I can verify all authentication flows work correctly and securely.

#### Acceptance Criteria

1. WHEN testing middleware cookie refresh THEN the Test SHALL verify that expired access tokens are refreshed and new cookies are set in the response
2. WHEN testing protected route redirects THEN the Test SHALL verify that unauthenticated requests to protected routes redirect to /auth/login with returnTo parameter
3. WHEN testing protected API endpoints THEN the Test SHALL verify that requests without valid sessions receive 401 Unauthorized responses
4. WHEN testing magic link success flow THEN the Test SHALL verify that valid magic link tokens create sessions and redirect to the correct destination using test SMTP or Supabase email preview
5. WHEN testing magic link expiry THEN the Test SHALL verify that expired tokens are rejected with appropriate error messages
6. WHEN testing RLS policies with authenticated users THEN the Test SHALL verify that users can access their own data using generated test users
7. WHEN testing RLS policies with unauthorized access THEN the Test SHALL verify that users cannot access data belonging to other users
8. WHEN testing session lifecycle THEN the Test SHALL verify that sessions expire after the configured timeout and trigger re-authentication
9. WHEN testing open-redirect prevention THEN the Test SHALL verify that invalid returnTo URLs are rejected and redirect to the root path
10. WHEN testing token tampering THEN the Test SHALL verify that modified tokens are rejected with appropriate error messages
11. WHEN testing replay attacks THEN the Test SHALL verify that used magic link tokens cannot be reused
12. WHEN testing the shared verifier function THEN the Test SHALL use mocked cookies to verify session validation logic


### Requirement 11

**User Story:** As a system administrator, I want monitoring and security controls for authentication events, so that I can detect and prevent abuse of the authentication system.

#### Acceptance Criteria

1. WHEN authentication events occur THEN the System SHALL log all sign-in attempts, token refresh failures, and sign-outs with timestamps and user identifiers
2. WHEN failed sign-in attempts spike THEN the System SHALL trigger monitoring alerts for suspicious activity
3. WHEN magic link requests exceed rate limits THEN the System SHALL log the blocked requests with IP addresses and email addresses
4. WHEN CSRF attacks are attempted THEN the System SHALL implement CSRF mitigation by tying returnTo parameters to short-lived nonces stored in cookies or one_time_tokens.flow_state
5. WHEN monitoring authentication metrics THEN the System SHALL track successful sign-ins, failed attempts, token refresh rates, and session durations
6. WHEN security incidents are detected THEN the System SHALL provide audit logs for investigation and compliance purposes
