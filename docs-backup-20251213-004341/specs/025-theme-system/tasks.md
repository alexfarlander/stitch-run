# Implementation Plan

- [x] 1. Set up theme infrastructure and type definitions
  - Create theme types and interfaces in `src/lib/themes/types.ts`
  - Define ThemeMode, ThemeColors, ThemeConfig, and ThemeRegistry interfaces
  - Include canvas-specific color tokens in ThemeColors
  - _Requirements: 3.1, 3.4_

- [x] 2. Create theme definition files
  - [x] 2.1 Create light theme definition
    - Implement `src/lib/themes/definitions/light.ts`
    - Define all color tokens using oklch format
    - Include fallback hex values for older browsers
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Create dark theme definition
    - Implement `src/lib/themes/definitions/dark.ts`
    - Define all color tokens using oklch format
    - Include fallback hex values for older browsers
    - _Requirements: 1.1, 1.2_

  - [x] 2.3 Migrate Halloween theme to new system
    - Create `src/lib/themes/definitions/halloween.ts`
    - Extract existing Halloween colors from globals.css
    - Convert to new theme configuration format
    - _Requirements: 3.3_

  - [x] 2.4 Write property test for theme configuration completeness
    - **Property 4: Theme registry completeness**
    - **Validates: Requirements 3.4**

- [x] 3. Implement theme registry
  - Create `src/lib/themes/registry.ts`
  - Implement getThemeRegistry() function
  - Implement getThemeById() function
  - Auto-register all theme definitions
  - Support 'system' theme mode
  - _Requirements: 3.2, 3.4_

- [ ] 4. Create theme utility functions
  - Create `src/lib/themes/utils.ts`
  - Implement applyTheme() to set CSS variables
  - Implement getStoredTheme() to read from localStorage
  - Implement setStoredTheme() to write to localStorage
  - Implement getSystemTheme() to detect system preference
  - Handle localStorage errors gracefully
  - _Requirements: 1.3, 1.5, 6.5_

- [ ] 5. Implement ThemeProvider component
  - Create `src/lib/themes/theme-provider.tsx`
  - Implement ThemeContext with createContext
  - Implement ThemeProvider with state management
  - Handle theme initialization (stored, system, or default)
  - Implement setTheme function with localStorage sync
  - Listen to system preference changes
  - Resolve 'system' theme to actual light/dark
  - Provide resolvedTheme in context value
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 6.5_

- [x] 6. Create useTheme hook
  - Implement useTheme() hook in theme-provider.tsx
  - Throw error if used outside ThemeProvider
  - Export hook for component use
  - _Requirements: 1.2_

- [x] 7. Update globals.css with theme transition styles
  - Add theme-loading class styles to disable transitions
  - Add transition styles for theme switching
  - Add prefers-reduced-motion media query
  - Update existing theme CSS variables structure
  - Add canvas-specific CSS variables
  - _Requirements: 7.1, 7.4, 7.5_

- [x] 8. Implement blocking theme script
  - Create inline script in root layout
  - Read theme from localStorage
  - Detect system preference
  - Resolve 'system' theme to light/dark
  - Apply theme class to document root
  - Add theme-loading class
  - Remove theme-loading class after paint
  - Handle errors with fallback to dark theme
  - _Requirements: 6.1, 6.3, 6.4_

- [x] 9. Integrate ThemeProvider into root layout
  - Update `src/app/layout.tsx`
  - Add suppressHydrationWarning to html tag
  - Wrap children with ThemeProvider
  - Ensure provider is client component
  - _Requirements: 1.1, 6.2_

- [x] 10. Create ThemeSwitcher component
  - Create `src/components/theme-switcher.tsx`
  - Implement dropdown menu with shadcn components
  - List all available themes from registry
  - Show current theme as selected
  - Include 'System' option
  - Handle theme selection
  - Add appropriate icons (Sun, Moon, Palette)
  - Support keyboard navigation
  - Add ARIA labels for accessibility
  - _Requirements: 2.1, 2.2, 2.4, 2.5_

- [x] 11. Integrate ThemeSwitcher into Navigation component
  - ~~Update `src/components/Navigation.tsx`~~ (Navigation only used on library page)
  - ✅ Integrated into LeftSidePanel (canvas pages)
  - ✅ Positioned at bottom of icon strip
  - ✅ Always visible on canvas pages
  - ✅ Fixed hydration error
  - ✅ Fixed icon visibility in light mode
  - _Requirements: 2.1_
  - _Status: **COMPLETE**_

- [ ] 12. Implement theme transition debouncing
  - Add debounce logic to setTheme function
  - Set debounce delay to 50ms
  - Cancel pending transitions on new theme selection
  - _Requirements: 7.3_

- [ ] 13. Add theme color validation
  - Create Zod schema for ThemeConfig validation
  - Validate themes at build time
  - Add runtime validation in development mode
  - Log validation errors to console
  - _Requirements: 3.4_

- [ ] 14. Implement accessibility contrast validation
  - Create contrast ratio calculation utility
  - Validate all theme color combinations
  - Ensure WCAG AA compliance (4.5:1 minimum)
  - Log warnings for non-compliant combinations
  - _Requirements: 4.5_

- [x] 15. Update canvas components to use theme colors
  - Update node components to use CSS variables
  - Update edge components to use CSS variables
  - Update entity visualization to use CSS variables
  - Ensure all canvas elements respond to theme changes
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 16. Update panel components to use theme colors
  - Update RightSidePanel to use CSS variables
  - Update EventsLogPanel to use CSS variables
  - Update EntityDetailContent to use CSS variables
  - Update AIAssistantContent to use CSS variables
  - _Requirements: 4.2_

- [ ] 17. Test theme system across all pages
  - Verify theme switching on home page
  - Verify theme switching on canvas pages
  - Verify theme switching on library page
  - Verify theme persistence across navigation
  - Verify no visual glitches during transitions
  - _Requirements: 1.2, 4.1, 4.2, 4.3, 4.4_

- [ ] 18. Write unit tests for theme utilities
  - Test getStoredTheme with valid and invalid values
  - Test setStoredTheme with localStorage errors
  - Test getSystemTheme with different preferences
  - Test applyTheme CSS variable application
  - _Requirements: 1.3, 1.5, 6.5_

- [ ] 19. Write unit tests for ThemeProvider
  - Test theme initialization with stored preference
  - Test theme initialization with system preference
  - Test theme initialization with no preference
  - Test setTheme updates state and localStorage
  - Test system preference change listener
  - Test 'system' theme resolution
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ] 20. Write unit tests for ThemeSwitcher
  - Test renders all available themes
  - Test shows current theme as selected
  - Test clicking theme triggers setTheme
  - Test keyboard navigation works
  - Test dropdown opens and closes
  - Test 'System' option is available
  - _Requirements: 2.1, 2.2, 2.4, 2.5_

- [ ] 21. Write integration tests for full theme switching flow
  - Test complete theme switch from light to dark
  - Test complete theme switch to Halloween
  - Test theme persistence after page refresh
  - Test 'system' theme follows OS changes
  - Test CSS variables update correctly
  - Test no hydration warnings
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 4.4, 6.2_

- [x] 22. Create theme system documentation
  - Document how to add new themes
  - Document theme configuration format
  - Document using theme colors in components
  - Document testing theme changes
  - Add code examples and best practices
  - _Requirements: 5.5_

- [ ] 23. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
