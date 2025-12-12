# Theme System Design Document

## Overview

The theme system will provide a flexible, extensible infrastructure for managing visual themes in the Stitch application. The system will support light and dark modes based on shadcn/ui conventions, preserve the existing Halloween dark theme as a custom theme option, and enable future theme additions without modifying component code.

The implementation leverages Tailwind CSS v4's native CSS variable system, React Context for state management, and Next.js App Router patterns for SSR-safe theme initialization. The architecture prioritizes zero-flash theme loading, accessibility compliance, and developer experience.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App Router                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  RootLayout (layout.tsx)                               │ │
│  │  ├─ <html> with theme class                            │ │
│  │  ├─ Blocking theme script (prevents flash)             │ │
│  │  └─ ThemeProvider (client component)                   │ │
│  │     ├─ Theme state management                          │ │
│  │     ├─ Local storage sync                              │ │
│  │     └─ Theme switching logic                           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ Theme Context
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │ Theme   │          │  Canvas │          │  Panel  │
   │Switcher │          │Components│         │Components│
   │Component│          │         │          │         │
   └─────────┘          └─────────┘          └─────────┘
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                    CSS Variables (globals.css)
                              │
                    ┌─────────▼──────────┐
                    │  Tailwind v4       │
                    │  Color Utilities   │
                    └────────────────────┘
```

### Component Hierarchy

1. **Theme Script** (inline blocking script in `<head>`)
   - Reads theme from localStorage
   - Applies theme class to `<html>` before paint
   - Prevents flash of incorrect theme
   
   ```html
   <script>
     (function() {
       try {
         const stored = localStorage.getItem('stitch-theme');
         const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
         
         let theme = stored || 'system';
         let resolvedTheme = theme;
         
         if (theme === 'system') {
           resolvedTheme = systemPreference;
         }
         
         // Apply theme class immediately
         document.documentElement.classList.add(resolvedTheme);
         
         // Disable transitions on initial load
         document.documentElement.classList.add('theme-loading');
         
         // Re-enable transitions after paint
         setTimeout(() => {
           document.documentElement.classList.remove('theme-loading');
         }, 0);
       } catch (e) {
         // Fallback to dark theme
         document.documentElement.classList.add('dark');
       }
     })();
   </script>
   ```

2. **ThemeProvider** (React Context Provider)
   - Manages theme state
   - Provides theme switching functions
   - Syncs with localStorage
   - Handles system preference detection

3. **ThemeSwitcher** (UI Component)
   - Dropdown menu in navigation
   - Lists available themes
   - Shows current theme
   - Triggers theme changes

4. **Theme Configurations** (JSON/TS files)
   - Define color tokens for each theme
   - Specify CSS variable mappings
   - Include metadata (name, description, icon)

## Components and Interfaces

### Theme Configuration Interface

```typescript
// src/lib/themes/types.ts

export type ThemeMode = 'light' | 'dark' | 'halloween' | 'system' | string;

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
  // Canvas-specific colors for Stitch's visual workflow system
  canvasNodeBackground: string;
  canvasNodeBorder: string;
  canvasNodeActive: string;
  canvasEdge: string;
  canvasEdgeActive: string;
  canvasSelection: string;
}

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  description?: string;
  icon?: string;
  colors: ThemeColors;
}

export interface ThemeRegistry {
  themes: ThemeConfig[];
  defaultTheme: ThemeMode;
}
```

### Theme Context Interface

```typescript
// src/lib/themes/theme-context.tsx

export interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  themes: ThemeConfig[];
  systemTheme: 'light' | 'dark';
  resolvedTheme: 'light' | 'dark' | string; // Actual theme applied (resolves 'system' to light/dark)
}
```

### Theme Provider Component

```typescript
// src/lib/themes/theme-provider.tsx

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode, ThemeConfig, ThemeContextValue } from './types';
import { getThemeRegistry } from './registry';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Implementation details in tasks
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

### Theme Switcher Component

```typescript
// src/components/theme-switcher.tsx

'use client';

import { useTheme } from '@/lib/themes/theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Moon, Sun, Palette } from 'lucide-react';

export function ThemeSwitcher() {
  // Implementation details in tasks
}
```

## Data Models

### Theme Registry Structure

The theme registry will be a centralized configuration that auto-discovers theme files:

```typescript
// src/lib/themes/registry.ts

import { ThemeConfig, ThemeRegistry } from './types';
import lightTheme from './definitions/light';
import darkTheme from './definitions/dark';
import halloweenTheme from './definitions/halloween';

export function getThemeRegistry(): ThemeRegistry {
  return {
    themes: [
      lightTheme,
      darkTheme,
      halloweenTheme,
    ],
    defaultTheme: 'dark',
  };
}

export function getThemeById(id: string): ThemeConfig | undefined {
  const registry = getThemeRegistry();
  return registry.themes.find(theme => theme.id === id);
}
```

### Theme Definition Files

Each theme will be defined in a separate file for maintainability:

```typescript
// src/lib/themes/definitions/light.ts

import { ThemeConfig } from '../types';

const lightTheme: ThemeConfig = {
  id: 'light',
  name: 'Light',
  description: 'Clean light theme',
  icon: 'sun',
  colors: {
    background: 'oklch(1 0 0)',
    foreground: 'oklch(0.145 0 0)',
    // ... all other color tokens
  },
};

export default lightTheme;
```

### Local Storage Schema

```typescript
// Storage key: 'stitch-theme'
// Storage value: ThemeMode (string)

interface ThemeStorage {
  key: 'stitch-theme';
  value: ThemeMode;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Theme persistence round-trip
*For any* valid theme selection, storing the theme to localStorage and then reading it back should return the same theme value
**Validates: Requirements 1.3, 1.5**

### Property 2: System preference detection
*For any* system color scheme preference (light or dark), when no stored theme exists, the Theme System should apply a theme that matches the system preference
**Validates: Requirements 1.1**

### Property 3: Theme application consistency
*For any* theme change, all CSS variables defined in the theme configuration should be applied to the document root
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 4: Theme registry completeness
*For any* theme in the registry, the theme configuration must contain all required color tokens as defined in ThemeColors interface
**Validates: Requirements 3.4**

### Property 5: SSR hydration consistency
*For any* stored theme preference, the theme class applied by the blocking script before hydration should match the theme class set by React after hydration, preventing hydration warnings
**Validates: Requirements 6.2**

### Property 6: Theme switcher availability
*For any* page in the application, the theme switcher component should be rendered and accessible in the navigation header
**Validates: Requirements 2.1**

### Property 7: Keyboard navigation support
*For any* theme option in the theme switcher, users should be able to navigate to and select the option using only keyboard inputs
**Validates: Requirements 2.5**

### Property 8: Accessibility contrast compliance
*For any* theme, the contrast ratio between foreground and background colors should meet WCAG AA standards (minimum 4.5:1 for normal text)
**Validates: Requirements 4.5**

## Error Handling

### Theme Loading Errors

**Scenario**: Theme configuration file is malformed or missing required properties

**Handling**:
- Validate theme configurations at build time using TypeScript
- Provide runtime validation with Zod schema
- Fall back to default dark theme if validation fails
- Log error to console in development mode
- Display user-friendly error message in theme switcher

### LocalStorage Errors

**Scenario**: localStorage is unavailable (private browsing, storage quota exceeded)

**Handling**:
- Wrap localStorage access in try-catch blocks
- Fall back to in-memory state if localStorage fails
- Detect system preference as fallback
- Continue functioning without persistence
- Log warning to console

### System Preference Detection Errors

**Scenario**: `window.matchMedia` is unavailable or returns unexpected values

**Handling**:
- Check for `window.matchMedia` availability
- Default to 'dark' theme if detection fails
- Provide manual override through theme switcher
- Log detection failure in development mode

### Hydration Mismatch Errors

**Scenario**: Server-rendered theme differs from client preference

**Handling**:
- Use blocking script to prevent mismatches
- Suppress React hydration warnings for theme class
- Re-apply correct theme immediately after hydration
- Use `suppressHydrationWarning` on `<html>` tag

### Theme Transition Errors

**Scenario**: Rapid theme switching causes visual glitches

**Handling**:
- Debounce theme changes with 50ms delay
- Cancel pending transitions when new theme selected
- Use CSS `transition-behavior: allow-discrete` for smooth changes
- Disable transitions during initial load

## Testing Strategy

### Unit Testing

**Framework**: Vitest with React Testing Library

**Test Coverage**:

1. **Theme Provider Tests**
   - Theme state initialization with system preference
   - Theme state initialization with stored preference
   - Theme switching updates state correctly
   - localStorage sync on theme change
   - Context value provides correct theme data

2. **Theme Switcher Tests**
   - Renders all available themes
   - Shows current theme as selected
   - Clicking theme option triggers setTheme
   - Keyboard navigation works correctly
   - Dropdown opens and closes properly

3. **Theme Registry Tests**
   - getThemeRegistry returns all themes
   - getThemeById finds correct theme
   - getThemeById returns undefined for invalid ID
   - All themes have required properties

4. **Theme Utilities Tests**
   - applyTheme sets correct CSS variables
   - getStoredTheme reads from localStorage
   - setStoredTheme writes to localStorage
   - getSystemTheme detects preference correctly

### Property-Based Testing

**Framework**: fast-check (JavaScript property-based testing library)

**Configuration**: Each property test will run a minimum of 100 iterations

**Property Tests**:

1. **Property 1: Theme persistence round-trip**
   - Generate random valid theme IDs
   - Store theme to localStorage
   - Read theme from localStorage
   - Assert stored value equals retrieved value
   - **Feature: theme-system, Property 1: Theme persistence round-trip**

2. **Property 2: System preference detection**
   - Generate random system preferences (light/dark)
   - Mock matchMedia with generated preference
   - Clear localStorage
   - Initialize theme system
   - Assert applied theme matches system preference
   - **Feature: theme-system, Property 2: System preference detection**

3. **Property 3: Theme application consistency**
   - Generate random theme configurations
   - Apply theme to document
   - Read CSS variables from document root
   - Assert all theme colors are applied correctly
   - **Feature: theme-system, Property 3: Theme application consistency**

4. **Property 4: Theme registry completeness**
   - For each theme in registry
   - Validate theme has all required color tokens
   - Assert no missing properties
   - **Feature: theme-system, Property 4: Theme registry completeness**

5. **Property 7: Keyboard navigation support**
   - Generate random sequences of keyboard events
   - Simulate keyboard navigation through theme options
   - Assert all themes can be reached and selected
   - **Feature: theme-system, Property 7: Keyboard navigation support**

### Integration Testing

1. **Full Theme Switching Flow**
   - Render app with ThemeProvider
   - Open theme switcher
   - Select different theme
   - Verify CSS variables updated
   - Verify localStorage updated
   - Verify UI reflects new theme

2. **SSR Theme Loading**
   - Server-render page with theme script
   - Verify theme class applied before hydration
   - Hydrate React app
   - Verify no hydration warnings
   - Verify theme persists after hydration

3. **Cross-Component Theme Application**
   - Render multiple component types (canvas, panels, nodes)
   - Switch theme
   - Verify all components update colors
   - Verify no visual glitches during transition

### Accessibility Testing

1. **Contrast Ratio Validation**
   - For each theme
   - Calculate contrast ratios for all text/background combinations
   - Assert ratios meet WCAG AA standards (4.5:1 minimum)

2. **Keyboard Navigation**
   - Navigate theme switcher with Tab key
   - Select theme with Enter/Space
   - Close dropdown with Escape
   - Verify focus management

3. **Screen Reader Compatibility**
   - Verify theme switcher has proper ARIA labels
   - Verify current theme is announced
   - Verify theme changes are announced

### Visual Regression Testing

1. **Theme Appearance**
   - Capture screenshots of key pages in each theme
   - Compare against baseline images
   - Flag unexpected visual changes

2. **Transition Smoothness**
   - Record theme switching animations
   - Verify no flashing or jarring changes
   - Verify transition duration within spec (150-300ms)

## Implementation Notes

### Tailwind CSS v4 Integration

Tailwind v4 uses CSS variables natively, so theme colors will be defined directly in `globals.css` using the `@theme` directive. The theme system will update these CSS variables dynamically:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... other mappings */
}
```

### Theme Transition CSS

Theme transitions will be controlled via CSS classes to ensure smooth color changes:

```css
/* Disable transitions during initial load */
html.theme-loading,
html.theme-loading * {
  transition: none !important;
}

/* Enable smooth transitions for theme switching */
html:not(.theme-loading) {
  transition: background-color 200ms ease-in-out, color 200ms ease-in-out;
}

html:not(.theme-loading) * {
  transition: background-color 200ms ease-in-out, 
              color 200ms ease-in-out, 
              border-color 200ms ease-in-out,
              box-shadow 200ms ease-in-out;
}

/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  html,
  html * {
    transition: none !important;
  }
}
```

### Color Format and Fallback Strategy

The theme system uses oklch color format for better perceptual uniformity and wider color gamut. For browsers that don't support oklch (pre-2023 browsers), we'll use CSS `@supports` to provide fallbacks:

```css
:root {
  /* Fallback for older browsers */
  --background: #ffffff;
  --foreground: #0a0a0a;
  
  /* Modern oklch colors (will override if supported) */
  @supports (color: oklch(0% 0 0)) {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
  }
}
```

Alternatively, theme definitions can include both formats:

```typescript
export interface ThemeColorValue {
  oklch: string;
  fallback: string; // hex or rgb
}
```

### Next.js App Router Considerations

1. **Server Components**: ThemeProvider must be a Client Component ('use client')
2. **Layout Integration**: Provider wraps children in root layout
3. **Metadata**: Theme color meta tag updates dynamically
4. **Script Injection**: Blocking script in `<head>` prevents flash

### Performance Optimizations

1. **CSS Variable Updates**: Use `document.documentElement.style.setProperty()` for instant updates
2. **Debounced Transitions**: Prevent rapid theme switching from causing performance issues
3. **Lazy Theme Loading**: Load theme configurations on-demand if registry grows large
4. **Memoization**: Memoize theme context value to prevent unnecessary re-renders

### Browser Compatibility

- **CSS Variables**: Supported in all modern browsers (Chrome 49+, Firefox 31+, Safari 9.1+)
- **localStorage**: Supported universally, with fallback for private browsing
- **matchMedia**: Supported universally for system preference detection
- **oklch Colors**: Supported in modern browsers, with fallback to hex/rgb if needed

### Migration Strategy

1. **Phase 1**: Implement theme infrastructure without changing existing styles
2. **Phase 2**: Add theme switcher to navigation
3. **Phase 3**: Test theme switching across all pages
4. **Phase 4**: Document theme system for developers
5. **Phase 5**: Enable theme persistence by default

### Developer Experience

1. **Adding New Themes**: Create new file in `src/lib/themes/definitions/`, export from registry
2. **Theme Utilities**: Provide helper functions for common theme operations
3. **TypeScript Support**: Full type safety for theme configurations
4. **Documentation**: Include examples and best practices in code comments
5. **Dev Tools**: Consider adding theme preview/testing tools in development mode
