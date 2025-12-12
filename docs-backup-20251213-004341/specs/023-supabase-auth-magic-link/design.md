# Design Document: Supabase Auth with Magic Link

## Overview

This design implements passwordless authentication for the Stitch application using Supabase Auth's built-in email OTP (magic link) flow. The system follows Supabase's recommended SSR (Server-Side Rendering) patterns for Next.js App Router, using cookie-based session management with proper middleware integration.

Supabase manages one-time tokens server-side in the `one_time_tokens` table with automatic lifecycle management. The callback endpoint verifies tokens via Supabase's server client, which handles token validation and invalidation.

The authentication system provides:
- Magic link email authentication (passwordless)
- Cookie-based session management compatible with Next.js App Router
- Edge-compatible middleware for session refresh
- Protected routes and API endpoints
- Row Level Security (RLS) policies for multi-tenant data isolation
- Proper separation between user-scoped (anon key + RLS) and system-scoped (service role) operations

## Architecture

### Authentication Flow

```
┌─────────────┐
│   User      │
│ Enters Email│
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  /auth/login        │
│  (Client Component) │
└──────┬──────────────┘
       │ signInWithOtp()
       ▼
┌─────────────────────┐
│  Supabase Auth      │
│  Sends Magic Link   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  User Email         │
│  Clicks Link        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  /auth/callback     │
│  (Route Handler)    │
│  - Verify Token     │
│  - Create Session   │
│  - Set Cookies      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Redirect to App    │
│  (with returnTo)    │
└─────────────────────┘
```

### Middleware Flow

```
┌─────────────────────┐
│  Incoming Request   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Next.js Middleware │
│  (Edge Runtime)     │
└──────┬──────────────┘
       │
       ├─ Static Asset? ──> Skip Auth
       │
       ├─ Health Check? ──> Skip Auth
       │
       ▼
┌─────────────────────┐
│  Create Supabase    │
│  Client (Edge)      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  getUser() from     │
│  Cookies            │
└──────┬──────────────┘
       │
       ├─ Token Expired? ──> Refresh Token
       │                     Update Cookies
       │
       ▼
┌─────────────────────┐
│  Continue Request   │
│  (Updated Cookies)  │
└─────────────────────┘
```

### Verify-and-Refresh Flow (Detailed)

This is the critical flow that handles session refresh in middleware:

```typescript
// Pseudocode for middleware verify-and-refresh
async function updateSession(request: NextRequest) {
  // 1. Create response object that will be modified
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  
  // 2. Create edge-compatible Supabase client
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      // Read cookies from incoming request (read-only)
      getAll() { 
        return request.cookies.getAll() 
      },
      // Write cookies to outgoing response only
      setAll(cookiesToSet) {
        // IMPORTANT: request.cookies is read-only in Edge Runtime
        // We can ONLY set cookies on the response
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })
  
  // 3. Trigger session refresh (automatic if expired)
  // This reads access_token from cookies
  // If expired, uses refresh_token to get new access_token
  // Calls setAll() to update cookies if refreshed
  const { data: { user } } = await supabase.auth.getUser()
  
  // 4. Optionally pass user context to downstream handlers
  // Since updated cookies won't be visible in the same request,
  // use headers to pass user info to server components
  if (user) {
    response.headers.set('x-user-id', user.id)
    response.headers.set('x-user-email', user.email || '')
  }
  
  // 5. Return response with updated cookies
  return { response, user }
}
```

**Key points**:
- The `getUser()` call automatically refreshes expired tokens
- Cookie updates happen through the `setAll()` callback
- Request cookies are **read-only** in Edge Runtime
- Only response cookies can be modified
- Updated cookies are sent to the browser but not visible to same-request handlers
- Use response headers to pass user context to downstream server components
- This runs in Edge Runtime (no Node.js APIs)
- Keep operations minimal for performance

**Important Limitation**: Server components in the same request cycle won't see the updated cookies. They will be available on the next request. To pass user context within the same request, use response headers as shown above.

### Client Architecture

```
┌──────────────────────────────────────┐
│         Supabase Clients             │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Browser Client                │ │
│  │  - Uses anon key               │ │
│  │  - Cookie-based storage        │ │
│  │  - RLS enabled                 │ │
│  │  - Client components           │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Server Client (SSR)           │ │
│  │  - Uses anon key               │ │
│  │  - Reads from request cookies  │ │
│  │  - RLS enabled                 │ │
│  │  - Server components/routes    │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Admin Client (Service Role)   │ │
│  │  - Uses service role key       │ │
│  │  - Bypasses RLS                │ │
│  │  - System operations only      │ │
│  │  - Server-side only            │ │
│  └────────────────────────────────┘ │
│                                      │
└──────────────────────────────────────┘
```

## Components and Interfaces

### 1. Supabase Client Utilities

**File: `src/lib/supabase/client.ts`**

Update the existing client to support browser-based cookie storage:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )
}
```

**File: `src/lib/supabase/server.ts`**

Update to use SSR-compatible server client with cookie handling:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

**Note**: The `setAll` method in server components cannot set response cookies directly. Cookie updates must happen in route handlers or middleware. Server components can read cookies but updates will only take effect on the next request.

**File: `src/lib/supabase/middleware.ts`**

Create edge-compatible middleware client:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Create a response object to modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Set cookies on the response
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid running complex queries here. Keep middleware fast!
  // This will automatically refresh the session if expired
  const { data: { user } } = await supabase.auth.getUser()
  
  // Optionally pass user context to downstream handlers via headers
  if (user) {
    response.headers.set('x-user-id', user.id)
    response.headers.set('x-user-email', user.email || '')
  }

  return { response, user }
}
```

**Important Notes**:
- Request cookies are read-only in Edge Runtime
- Cookie updates only affect the response, not the current request
- Downstream server components in the same request won't see updated cookies
- Use headers to pass user context to same-request handlers
- Keep middleware operations minimal for performance

**File: `src/lib/supabase/admin.ts`**

Keep existing admin client for system operations:

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function getAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Admin client cannot be used on client-side')
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}
```

**Security Warning**: The service role key bypasses all RLS policies. Only use this client for:
- System operations (webhooks, background jobs)
- Admin functions that require elevated privileges
- Never expose this key to client-side code
- Store in environment secrets only

### 2. Authentication Utilities

**File: `src/lib/auth/session.ts`**

Shared server-side session verification:

```typescript
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export async function getSession(): Promise<{ user: User | null }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('Session verification error:', error)
    return { user: null }
  }
  
  return { user }
}

export async function requireAuth(): Promise<User> {
  const { user } = await getSession()
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
}
```

**File: `src/lib/auth/redirect.ts`**

Safe redirect URL validation:

```typescript
export function getSafeRedirectUrl(returnTo: string | null, baseUrl: string): string {
  if (!returnTo) {
    return '/'
  }
  
  try {
    const url = new URL(returnTo, baseUrl)
    const base = new URL(baseUrl)
    
    // Only allow same-origin redirects
    if (url.origin === base.origin) {
      return url.pathname + url.search + url.hash
    }
  } catch {
    // Invalid URL, fall back to root
  }
  
  return '/'
}
```

### 3. Middleware

**File: `middleware.ts`** (root level)

```typescript
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip auth for static assets, health checks, and public API routes
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/public') ||
    pathname === '/favicon.ico' ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Update session and get user (refreshes tokens if needed)
  const { response, user } = await updateSession(request)

  // Protected routes that require authentication
  const protectedPaths = ['/canvas', '/flow', '/library', '/runs']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('returnTo', pathname + request.nextUrl.search)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
}
```

**Performance Note**: Keep middleware operations minimal. Avoid heavy database queries or complex logic. The session refresh is automatic and fast.

### 4. Route Handlers

**File: `src/app/auth/login/page.tsx`**

Login page with magic link form and rate limiting:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')
  const error = searchParams.get('error')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const supabase = createClient()
    
    // Generate CSRF nonce and store in cookie
    const nonce = crypto.randomUUID()
    document.cookie = `auth_nonce=${nonce}; path=/; max-age=600; samesite=lax; secure`
    
    const redirectTo = `${window.location.origin}/auth/callback${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}&nonce=${nonce}` : `?nonce=${nonce}`}`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        // Supabase handles rate limiting server-side
        // Default: 4 requests per hour per email
      },
    })

    setLoading(false)

    if (error) {
      // Handle rate limit errors
      if (error.message.includes('rate limit')) {
        setMessage({ type: 'error', text: 'Too many requests. Please try again later.' })
      } else {
        setMessage({ type: 'error', text: error.message })
      }
    } else {
      setMessage({ type: 'success', text: 'Check your email for the magic link!' })
    }
  }

  return (
    // UI implementation with error display
    // Show error from query param if present
  )
}
```

**File: `src/app/auth/callback/route.ts`**

Callback handler for magic link verification with CSRF protection:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { getSafeRedirectUrl } from '@/lib/auth/redirect'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const returnTo = requestUrl.searchParams.get('returnTo')
  const nonce = requestUrl.searchParams.get('nonce')
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!

  // CSRF protection: verify nonce matches cookie
  const cookieStore = await cookies()
  const storedNonce = cookieStore.get('auth_nonce')?.value
  
  if (nonce && storedNonce && nonce !== storedNonce) {
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=${encodeURIComponent('Invalid authentication request. Please try again.')}`
    )
  }
  
  // Clear nonce cookie
  cookieStore.delete('auth_nonce')

  if (token_hash && type) {
    const supabase = await createClient()
    
    // Verify the OTP token
    // This exchanges the token_hash for a session and sets cookies
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'email',
      token_hash,
    })

    if (error) {
      console.error('Auth callback error:', error)
      
      // Handle specific error types
      if (error.message.includes('expired') || error.message.includes('Token has expired')) {
        return NextResponse.redirect(
          `${baseUrl}/auth/login?error=${encodeURIComponent('Your magic link has expired. Please request a new one.')}`
        )
      }
      
      return NextResponse.redirect(
        `${baseUrl}/auth/login?error=${encodeURIComponent('Invalid authentication link. Please request a new one.')}`
      )
    }
  }

  const redirectUrl = getSafeRedirectUrl(returnTo, baseUrl)
  return NextResponse.redirect(`${baseUrl}${redirectUrl}`)
}
```

**Note**: Supabase magic links contain `token_hash` and `type` parameters. The `verifyOtp` method validates the one-time token and creates a session with cookies.

**File: `src/app/auth/logout/route.ts`**

Logout handler:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json(
      { error: 'Sign out failed. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_BASE_URL!))
}
```

### 5. UI Components

**File: `src/components/auth/user-nav.tsx`**

User navigation component showing auth status:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function UserNav() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <a href="/auth/login">Sign In</a>
  }

  return (
    <div>
      <span>{user.email}</span>
      <form action="/auth/logout" method="POST">
        <button type="submit">Sign Out</button>
      </form>
    </div>
  )
}
```

## Data Models

### User Model (Supabase Auth)

Supabase Auth manages the user table automatically. The relevant fields:

```typescript
interface User {
  id: string                    // UUID
  email: string                 // User's email
  email_confirmed_at: string    // Timestamp of email confirmation
  created_at: string            // Account creation timestamp
  updated_at: string            // Last update timestamp
  last_sign_in_at: string       // Last sign-in timestamp
}
```

### Session Model (Supabase Auth)

Sessions are managed automatically by Supabase:

```typescript
interface Session {
  access_token: string          // JWT access token
  refresh_token: string         // Refresh token
  expires_in: number            // Token expiration in seconds
  expires_at: number            // Expiration timestamp
  token_type: 'bearer'          // Token type
  user: User                    // User object
}
```

### Database Schema Updates

Add `user_id` column to existing tables for RLS:

```sql
-- Add user_id to stitch_canvases
ALTER TABLE stitch_canvases 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Add user_id to stitch_runs
ALTER TABLE stitch_runs 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Add user_id to stitch_entities
ALTER TABLE stitch_entities 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Add user_id to stitch_media
ALTER TABLE stitch_media 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create indexes for RLS policy performance
-- CRITICAL: Without these indexes, RLS checks will be slow on large tables
CREATE INDEX idx_stitch_canvases_user_id ON stitch_canvases(user_id);
CREATE INDEX idx_stitch_runs_user_id ON stitch_runs(user_id);
CREATE INDEX idx_stitch_entities_user_id ON stitch_entities(user_id);
CREATE INDEX idx_stitch_media_user_id ON stitch_media(user_id);

-- Enable RLS on tables
ALTER TABLE stitch_canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE stitch_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stitch_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE stitch_media ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for stitch_canvases
CREATE POLICY "Users can view their own canvases"
  ON stitch_canvases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own canvases"
  ON stitch_canvases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own canvases"
  ON stitch_canvases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own canvases"
  ON stitch_canvases FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for stitch_runs
CREATE POLICY "Users can view runs for their canvases"
  ON stitch_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stitch_canvases
      WHERE stitch_canvases.id = stitch_runs.canvas_id
      AND stitch_canvases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert runs for their canvases"
  ON stitch_runs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stitch_canvases
      WHERE stitch_canvases.id = stitch_runs.canvas_id
      AND stitch_canvases.user_id = auth.uid()
    )
  );

-- Similar policies for stitch_entities and stitch_media
-- (Full SQL in migration file)
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Magic link authentication creates valid sessions

*For any* valid magic link token, when the /auth/callback endpoint processes the token, the system should create an authenticated session with valid cookies
**Validates: Requirements 1.2**

### Property 2: Expired magic links are rejected

*For any* expired magic link token, when the /auth/callback endpoint processes the token, the system should reject the authentication and redirect to login with an error message
**Validates: Requirements 1.5**

### Property 3: Invalid tokens are rejected

*For any* invalid or tampered magic link token, when the /auth/callback endpoint processes the token, the system should reject the authentication and redirect to login with an error message
**Validates: Requirements 1.6**

### Property 4: Same-origin redirect validation

*For any* redirect URL provided to the callback endpoint, the system should only redirect to same-origin URLs and reject cross-origin redirects
**Validates: Requirements 1.7**

### Property 5: Middleware refreshes expired tokens

*For any* request with an expired access token but valid refresh token, the middleware should obtain a new access token and update the response cookies
**Validates: Requirements 2.6, 3.4**

### Property 6: Cookie attributes are secure

*For any* authentication cookie set by the system, the cookie should have Secure, HttpOnly, and SameSite=Lax attributes
**Validates: Requirements 2.2**

### Property 7: Protected routes redirect unauthenticated users

*For any* unauthenticated request to a protected route, the middleware should redirect to /auth/login with the original path in the returnTo parameter
**Validates: Requirements 5.1**

### Property 8: Protected API endpoints return 401 for unauthenticated requests

*For any* unauthenticated request to a protected API endpoint, the endpoint should return a 401 Unauthorized response
**Validates: Requirements 5.4**

### Property 9: RLS policies enforce user ownership for canvases

*For any* authenticated user querying stitch_canvases, the database should only return canvases where the user_id matches the authenticated user's ID
**Validates: Requirements 9.1**

### Property 10: RLS policies enforce user ownership for runs

*For any* authenticated user querying stitch_runs, the database should only return runs associated with canvases owned by the user
**Validates: Requirements 9.2**

### Property 11: Service role client bypasses RLS

*For any* database query using the service role client, the database should bypass all RLS policies and return all matching records
**Validates: Requirements 9.6**

### Property 12: Sign out clears session and cookies

*For any* authenticated user who signs out, the system should invalidate the session on the server and clear all authentication cookies
**Validates: Requirements 4.1, 4.2**

## Error Handling

### Authentication Errors

| Error Scenario | HTTP Status | Error Message | User Action |
|---------------|-------------|---------------|-------------|
| Invalid magic link | 302 Redirect | "Invalid authentication link. Please request a new one." | Redirect to /auth/login |
| Expired magic link | 302 Redirect | "Your magic link has expired. Please request a new one." | Redirect to /auth/login |
| Email send failure | 200 OK | "Failed to send magic link. Please try again." | Stay on login page |
| Session expired | 302 Redirect | "Your session has expired. Please sign in again." | Redirect to /auth/login |
| Sign out failure | 500 Error | "Sign out failed. Please try again." | Show error, clear local state |
| Unauthorized API access | 401 Unauthorized | "Authentication required" | Return JSON error |
| Cross-origin redirect | 302 Redirect | None (silent redirect to /) | Redirect to root |

### Middleware Error Handling

- If session refresh fails, allow request to proceed without user context
- Protected routes will handle redirect based on missing user
- Log errors for monitoring but don't block requests

### RLS Error Handling

- Empty result sets for unauthorized access (no error thrown)
- Service role operations log errors but don't expose to users
- Client-side queries handle empty results gracefully

## Testing Strategy

### Unit Tests

1. **Redirect URL Validation**
   - Test `getSafeRedirectUrl` with same-origin URLs (should allow)
   - Test with cross-origin URLs (should reject)
   - Test with malformed URLs (should fall back to /)
   - Test with relative paths (should allow)

2. **Session Verification**
   - Test `getSession` with valid session (should return user)
   - Test with expired session (should return null)
   - Test with no session (should return null)
   - Test `requireAuth` with no session (should throw error)

### Property-Based Tests

Property-based tests will use **fast-check** library (already installed) to generate random inputs and verify universal properties.

1. **Property 1: Magic link authentication creates valid sessions**
   - Generate random valid tokens
   - Process through callback handler
   - Verify session is created with valid cookies

2. **Property 4: Same-origin redirect validation**
   - Generate random URLs (same-origin and cross-origin)
   - Verify only same-origin URLs are allowed
   - Verify cross-origin URLs redirect to /

3. **Property 5: Middleware refreshes expired tokens**
   - Generate requests with expired access tokens
   - Verify middleware updates cookies with new tokens

4. **Property 6: Cookie attributes are secure**
   - Generate random authentication responses
   - Verify all cookies have Secure, HttpOnly, SameSite=Lax

5. **Property 7: Protected routes redirect unauthenticated users**
   - Generate random protected paths
   - Verify unauthenticated requests redirect to login with returnTo

6. **Property 9: RLS policies enforce user ownership for canvases**
   - Generate random users and canvases
   - Verify users can only query their own canvases

7. **Property 10: RLS policies enforce user ownership for runs**
   - Generate random users and runs
   - Verify users can only query runs for their canvases

### Integration Tests

1. **Magic Link Flow**
   - Request magic link
   - Verify email sent (use Supabase email preview or test SMTP, not real mailbox)
   - Extract magic link from test email
   - Visit magic link URL
   - Verify session created
   - Verify redirect to correct destination
   
   **Note**: Do not rely on external email delivery in CI. Use Supabase's email preview feature or configure a test SMTP server.

2. **Protected Route Access**
   - Access protected route without auth (should redirect)
   - Sign in
   - Access protected route (should allow)
   - Sign out
   - Access protected route (should redirect)

3. **API Authentication**
   - Call protected API without auth (should return 401)
   - Sign in
   - Call protected API (should return 200)

4. **Session Lifecycle**
   - Sign in
   - Wait for token expiration
   - Make request (should refresh token)
   - Verify new cookies set

5. **RLS Policies**
   - Create canvas as User A
   - Query as User A (should return canvas)
   - Query as User B (should return empty)
   - Query with service role (should return all)

### Test Configuration

Each property-based test should run a minimum of 100 iterations to ensure comprehensive coverage of the input space.

## Monitoring and Security

### Authentication Event Logging

**File: `src/lib/auth/logger.ts`**

```typescript
export interface AuthEvent {
  type: 'sign_in_attempt' | 'sign_in_success' | 'sign_in_failure' | 'sign_out' | 'token_refresh_failure'
  userId?: string
  email?: string
  ipAddress?: string
  userAgent?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export async function logAuthEvent(event: AuthEvent): Promise<void> {
  // Log to your monitoring service (e.g., Sentry, DataDog, CloudWatch)
  console.log('[AUTH]', JSON.stringify(event))
  
  // Optionally store in database for audit trail
  // await supabase.from('auth_audit_log').insert(event)
}
```

### Rate Limiting

Supabase provides built-in rate limiting for auth endpoints:
- Default: 4 magic link requests per hour per email
- Configurable in Supabase Dashboard → Authentication → Rate Limits

For additional protection, implement client-side rate limiting:

```typescript
// Track last request time in localStorage
const RATE_LIMIT_KEY = 'auth_last_request'
const RATE_LIMIT_WINDOW = 60000 // 1 minute

function checkRateLimit(): boolean {
  const lastRequest = localStorage.getItem(RATE_LIMIT_KEY)
  if (lastRequest) {
    const elapsed = Date.now() - parseInt(lastRequest)
    if (elapsed < RATE_LIMIT_WINDOW) {
      return false
    }
  }
  localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString())
  return true
}
```

### Security Checklist

- [ ] Store `SUPABASE_SERVICE_ROLE_KEY` in environment secrets only
- [ ] Configure `SUPABASE_SITE_URL` and redirect URLs per environment
- [ ] Implement CSRF mitigation with nonces
- [ ] Add rate limiting for magic link requests (per-email and per-IP)
- [ ] Implement server-side shared verifier for protected endpoints
- [ ] Ensure cookies use Secure, HttpOnly, SameSite, Path, and Domain attributes
- [ ] Add automated tests: unit, integration, and e2e for magic link and RLS
- [ ] Add monitoring/alerts for auth failure spikes and suspicious activity
- [ ] Add database indexes for columns used in RLS policies (user_id, owner_user_id)
- [ ] Test RLS policies with both anon and service role keys
- [ ] Validate same-origin redirects to prevent open-redirect attacks
- [ ] Never expose service role key to client-side code

## Implementation Notes

### Package Dependencies

Install the Supabase SSR package for Next.js App Router support:

```bash
npm install @supabase/ssr
```

The existing `@supabase/supabase-js` package will continue to be used for the admin client.

### Environment Variables

Required environment variables (already documented in .env.example):

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`: Anon/publishable key (public, used with RLS)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server-side only, bypasses RLS)
- `NEXT_PUBLIC_BASE_URL`: Application base URL for callbacks

**Security Requirements**:
- Store `SUPABASE_SERVICE_ROLE_KEY` in environment secrets only
- Never expose service role key to client-side code
- Never commit service role key to version control
- Use separate keys for development, staging, and production

### Supabase Configuration

In Supabase Dashboard → Authentication → URL Configuration:

1. Set **Site URL** to match `NEXT_PUBLIC_BASE_URL`
2. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)
3. Configure **Email Templates** for magic link emails
4. Set **Session Timeout** (default: 1 hour)
5. Set **Refresh Token Expiration** (default: 30 days)

### Migration Strategy

1. Add `user_id` columns to existing tables
2. Create RLS policies (initially permissive)
3. Implement authentication system
4. Test with new users
5. Migrate existing data (assign to admin user or prompt for ownership)
6. Enable strict RLS policies
7. Update existing queries to work with RLS

### Backward Compatibility

- Existing service role operations continue to work unchanged
- New user-scoped operations use anon key + RLS
- Gradual migration: tables can have RLS enabled one at a time
- Admin client remains available for system operations
