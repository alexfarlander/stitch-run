# Demo Mode Toggle Feature

## Overview

The demo mode toggle allows users to switch between demo data and live data in the financial sections (CostsSection and RevenueSection). This feature satisfies Requirement 1.5 from the financial-metrics specification.

## Implementation

### Components

1. **DemoModeToggle** (`DemoModeToggle.tsx`)
   - Reusable toggle component with visual indicators
   - Shows current mode (Demo/Live) with text label
   - Animated toggle switch with icons (Eye/EyeOff)
   - Color-coded: amber for demo mode, emerald for live mode

2. **CostsSection** (updated)
   - Integrated DemoModeToggle in top-right corner
   - Local state management using `useState`
   - Shows "Demo Data" badge when in demo mode
   - Smooth transitions between modes

3. **RevenueSection** (updated)
   - Integrated DemoModeToggle in top-right corner
   - Local state management using `useState`
   - Shows "Demo Data" badge when in demo mode
   - Fetches real entity data when toggled to live mode

### Features

- **Visual Indicators**: Clear badges and color-coded toggles
- **Local State Storage**: Each section maintains its own demo mode preference
- **Smooth Transitions**: No page reload required when switching modes
- **Independent Control**: Each section can be toggled independently
- **Accessibility**: Focus states and keyboard navigation support

## Usage

### In Components

```typescript
import { DemoModeToggle } from '@/components/canvas/sections';

function MyComponent() {
  const [showDemo, setShowDemo] = useState(true);
  
  return (
    <div>
      <DemoModeToggle showDemo={showDemo} onToggle={setShowDemo} />
      {/* Your content */}
    </div>
  );
}
```

### In Financial Sections

The toggle is automatically included in both CostsSection and RevenueSection. Users can click the toggle in the top-right corner to switch between demo and live data.

## Testing

To test the demo mode toggle:

1. Visit `/test-costs-section` or `/test-revenue-section`
2. Click the toggle switch in the top-right corner
3. Observe the smooth transition between demo and live modes
4. Verify the badge appears/disappears appropriately
5. Check that the toggle color changes (amber ↔ emerald)

## Requirements Coverage

This implementation satisfies the following requirements:

- **1.5**: WHERE cost data is unavailable THEN the System SHALL display realistic demo values
- Creates UI toggle to switch between demo and real data ✓
- Adds visual indicators (badge/watermark) for demo mode ✓
- Stores demo preference in local state ✓
- Ensures smooth transition between modes ✓
