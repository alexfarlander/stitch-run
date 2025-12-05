# Error Tracking Setup Guide

This document explains how to set up error tracking for the Stitch platform.

## Current Setup

The application currently includes a basic error tracking system with:

- **Global Error Boundary**: Catches React errors and prevents app crashes
- **Console Logging**: All errors are logged to the console with structured data
- **Error Tracking Module**: Centralized error handling in `/src/lib/error-tracking.ts`
- **Placeholder for Sentry**: Code is prepared for easy Sentry integration

## Integrating Sentry (Recommended for Production)

### 1. Create a Sentry Account

1. Go to https://sentry.io and sign up
2. Create a new project for "Next.js"
3. Copy your DSN (Data Source Name)

### 2. Install Sentry

```bash
npm install @sentry/nextjs
```

### 3. Run Sentry Wizard

```bash
npx @sentry/wizard@latest -i nextjs
```

This will:
- Create `sentry.client.config.js`
- Create `sentry.server.config.js`
- Create `sentry.edge.config.js`
- Update `next.config.js`
- Add Sentry to your build process

### 4. Configure Environment Variables

Add to `.env.local`:

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
NEXT_PUBLIC_ENVIRONMENT=production
SENTRY_AUTH_TOKEN=your-auth-token  # For source maps upload

# Optional: Control sample rate
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
```

### 5. Update Error Tracking Module

In `/src/lib/error-tracking.ts`, uncomment the Sentry integration code:

```typescript
// Before
// if (sentryDSN) {
//   Sentry.init({...});
// }

// After
if (sentryDSN) {
  Sentry.init({
    dsn: sentryDSN,
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Sentry event:', event);
      }
      return event;
    },
  });
}
```

### 6. Test Error Tracking

Create a test page at `/app/test-error/page.tsx`:

```typescript
'use client';

import { trackError } from '@/lib/error-tracking';
import { Button } from '@/components/ui/button';

export default function TestErrorPage() {
  const throwError = () => {
    throw new Error('Test error from button click');
  };

  const trackCustomError = () => {
    trackError(new Error('Custom tracked error'), {
      tags: { test: 'true' },
      level: 'warning',
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Error Tracking Test</h1>
      <div className="space-y-4">
        <Button onClick={throwError}>
          Throw Unhandled Error
        </Button>
        <Button onClick={trackCustomError}>
          Track Custom Error
        </Button>
      </div>
    </div>
  );
}
```

### 7. Verify in Sentry Dashboard

1. Trigger test errors
2. Go to your Sentry dashboard
3. Verify errors are appearing with:
   - Error messages
   - Stack traces
   - Component stacks
   - User context
   - Tags and metadata

## Error Tracking Features

### Automatic Error Capture

The following errors are automatically captured:

- **React Component Errors**: Via Error Boundary
- **Unhandled Promise Rejections**: Via global handlers
- **Window Errors**: Via global handlers

### Manual Error Tracking

Track errors manually:

```typescript
import { trackError } from '@/lib/error-tracking';

try {
  // Your code
} catch (error) {
  trackError(error as Error, {
    tags: {
      module: 'webhook-processing',
      endpoint: 'stripe',
    },
    level: 'error',
    userId: user.id,
  });
}
```

### Track Messages (Non-Errors)

```typescript
import { trackMessage } from '@/lib/error-tracking';

trackMessage('User completed onboarding', {
  level: 'info',
  tags: { flow: 'onboarding' },
});
```

### Set User Context

```typescript
import { setUserContext, clearUserContext } from '@/lib/error-tracking';

// After login
setUserContext({
  id: user.id,
  email: user.email,
  username: user.name,
});

// On logout
clearUserContext();
```

### Wrap Functions with Error Tracking

```typescript
import { withErrorTracking } from '@/lib/error-tracking';

const processWebhook = withErrorTracking(
  async (data) => {
    // Your code
  },
  { tags: { module: 'webhook' } }
);
```

## Best Practices

### 1. Set Appropriate Sample Rates

- **Development**: 100% (to catch all errors during testing)
- **Staging**: 50% (balance between coverage and cost)
- **Production**: 10-20% (reduce volume while maintaining visibility)

```typescript
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
```

### 2. Use Tags for Filtering

Tags help you filter and group errors:

```typescript
trackError(error, {
  tags: {
    module: 'workflow-execution',
    nodeType: 'worker',
    workerType: 'claude',
    environment: 'production',
  },
});
```

### 3. Add Context to Errors

```typescript
trackError(error, {
  workflowId: run.flow_id,
  runId: run.id,
  nodeId: node.id,
  attemptNumber: 3,
});
```

### 4. Filter Sensitive Data

Configure Sentry to filter sensitive information:

```typescript
Sentry.init({
  beforeSend(event) {
    // Remove sensitive data
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['Cookie'];
    }
    return event;
  },
});
```

### 5. Set Up Alerts

In Sentry dashboard:
1. Go to **Alerts** → **Create Alert Rule**
2. Set conditions (e.g., "Error count > 10 in 5 minutes")
3. Configure notifications (email, Slack, PagerDuty)

## Monitoring and Alerts

### Recommended Alerts

1. **High Error Rate**: More than 10 errors per minute
2. **New Error**: First occurrence of a new error type
3. **Regression**: Error that was marked as resolved reappears
4. **Critical Path Errors**: Errors in webhook processing or workflow execution

### Performance Monitoring

Enable performance monitoring to track:
- API response times
- Database query duration
- Worker execution times
- Page load performance

```typescript
Sentry.init({
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,  // Enable profiling
});
```

## Alternative Error Tracking Services

If not using Sentry, you can integrate other services:

### Rollbar

```bash
npm install rollbar
```

### Bugsnag

```bash
npm install @bugsnag/js @bugsnag/plugin-react
```

### LogRocket

```bash
npm install logrocket
```

### Custom Logging Endpoint

Create a custom API endpoint:

```typescript
// /app/api/log-error/route.ts
export async function POST(request: Request) {
  const errorData = await request.json();

  // Store in database
  await db.insert('error_logs', errorData);

  // Send to external service
  await sendToLoggingService(errorData);

  return Response.json({ success: true });
}
```

## Troubleshooting

### Errors Not Appearing in Sentry

1. Verify DSN is set correctly
2. Check network tab for Sentry requests
3. Ensure source maps are uploaded
4. Check sample rate isn't filtering out errors

### Source Maps Not Working

1. Verify `sentry.properties` is configured
2. Check auth token has correct permissions
3. Run `npx @sentry/wizard@latest -i sourcemaps`

### Too Many Errors

1. Increase sample rate threshold
2. Set up error grouping rules
3. Mark known issues as "Ignored"
4. Fix high-frequency errors first

## Cost Optimization

Sentry pricing is based on:
- Number of errors captured
- Number of performance transactions
- Data retention period

To optimize costs:

1. **Use Sample Rates**: Don't capture 100% in production
2. **Filter Noisy Errors**: Ignore known, non-critical errors
3. **Set Up Quotas**: Limit errors per project
4. **Archive Old Events**: Reduce retention period

## Summary

Error tracking is now integrated with:
- ✅ Global error boundary
- ✅ Structured error logging
- ✅ Easy Sentry integration
- ✅ Manual error tracking API
- ✅ User context tracking
- ✅ Event tracking

To complete setup for production:
1. Install Sentry
2. Configure environment variables
3. Uncomment Sentry code
4. Set up alerts in Sentry dashboard
5. Test error tracking
