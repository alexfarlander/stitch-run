# Financial Sections Testing Guide

## Quick Start

### 1. Start the Development Server

```bash
cd stitch-run
npm run dev
```

### 2. Test the Components

#### CostsSection
Navigate to: `http://localhost:3000/test-costs-section`

**What to verify:**
- [ ] Total costs displayed: $177
- [ ] Month-over-month change with arrow indicator
- [ ] Budget threshold bar showing 88.5% usage
- [ ] Mini trend chart with 6 data points
- [ ] Category breakdown:
  - API: $127 (72%)
  - Infrastructure: $50 (28%)
  - Team: $0 (0%)
- [ ] Demo badge in top-right corner
- [ ] Amber color scheme with glow effect
- [ ] Warning indicator appears (AlertTriangle icon)

#### RevenueSection
Navigate to: `http://localhost:3000/test-revenue-section`

**What to verify:**
- [ ] MRR displayed: $4,800
- [ ] Customer count: 24 customers
- [ ] Growth indicator with percentage and arrow
- [ ] ARPU displayed: $200
- [ ] LTV:CAC ratio: 3.2x
- [ ] Mini trend chart with historical (solid) and forecast (dashed) lines
- [ ] Plan breakdown:
  - Starter: 12 users, $1,200 (33%)
  - Pro: 9 users, $1,800 (50%)
  - Enterprise: 3 users, $600 (17%)
- [ ] Demo badge in top-right corner
- [ ] Emerald color scheme with glow effect

## Visual Verification Checklist

### Layout & Dimensions
- [ ] Both sections use 5x2 horizontal proportion (500px × 200px)
- [ ] Three-panel layout with vertical dividers
- [ ] Consistent spacing and padding
- [ ] Larger size variants render correctly (700px × 250px)

### Typography
- [ ] Large numbers are prominent and readable (3xl font)
- [ ] Labels are uppercase with tracking-wider
- [ ] Proper font size hierarchy throughout
- [ ] All text is legible against dark background

### Colors & Styling
- [ ] CostsSection: Amber (#f59e0b) theme
- [ ] RevenueSection: Emerald (#10b981) theme
- [ ] Glowing border effects visible
- [ ] Dark slate background with backdrop blur
- [ ] Proper contrast for all text elements

### Icons & Indicators
- [ ] DollarSign icon in RevenueSection header
- [ ] Users icon for customer count
- [ ] TrendingUp/TrendingDown arrows for growth
- [ ] AlertTriangle for cost warnings (CostsSection)
- [ ] All icons properly sized and colored

### Charts
- [ ] CostsSection: Line chart with area fill
- [ ] RevenueSection: Line chart with forecast (dashed)
- [ ] Data points visible on both charts
- [ ] Period labels (start and end month)
- [ ] Smooth curves and proper scaling

### Demo Mode
- [ ] Demo badge visible in both components
- [ ] Demo data displays correctly
- [ ] No console errors or warnings

## Functional Testing

### Data Integration (RevenueSection)

To test with real data:

1. **Create test entities in Supabase:**
```sql
-- Insert test customer entities
INSERT INTO stitch_entities (canvas_id, name, entity_type, metadata, journey)
VALUES 
  ('test-canvas-id', 'Test Customer 1', 'customer', 
   '{"ltv": 2400, "monthly_value": 200, "plan": "Pro", "cac": 500}'::jsonb, 
   '[]'::jsonb),
  ('test-canvas-id', 'Test Customer 2', 'customer', 
   '{"ltv": 1200, "monthly_value": 100, "plan": "Starter", "cac": 300}'::jsonb, 
   '[]'::jsonb);
```

2. **Update test page to use real canvas ID:**
```typescript
const mockNodeProps = {
  data: {
    canvasId: 'test-canvas-id', // Use actual canvas ID
    showDemo: false, // Disable demo mode
  },
  // ... rest of props
};
```

3. **Verify calculations:**
- [ ] MRR = sum of monthly_value fields
- [ ] Customer count = number of 'customer' entities
- [ ] ARPU = MRR / customer count
- [ ] Plan breakdown shows correct counts and percentages

### Metrics Calculation

Test the metrics service functions directly:

```typescript
import { 
  calculateMRR, 
  calculateARPU, 
  calculateLTVtoCAC,
  getCustomersByPlan 
} from '@/lib/metrics/calculations';

// Test with sample entities
const testEntities = [
  { entity_type: 'customer', metadata: { ltv: 2400, monthly_value: 200, plan: 'Pro' } },
  { entity_type: 'customer', metadata: { ltv: 1200, monthly_value: 100, plan: 'Starter' } },
];

console.log('MRR:', calculateMRR(testEntities)); // Should be 300
console.log('ARPU:', calculateARPU(testEntities)); // Should be 150
console.log('Plans:', getCustomersByPlan(testEntities));
```

## Performance Testing

### Load Testing
- [ ] Component renders quickly with demo data
- [ ] Component handles 100+ entities without lag
- [ ] Memoization prevents unnecessary recalculations
- [ ] Chart rendering is smooth

### Memory Testing
- [ ] No memory leaks when mounting/unmounting
- [ ] useEffect cleanup works correctly
- [ ] Supabase queries don't accumulate

## Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on macOS)

Verify:
- [ ] SVG charts render correctly
- [ ] Backdrop blur effect works
- [ ] Glow effects visible
- [ ] Font rendering is consistent

## Responsive Testing

While the component has fixed dimensions, test:
- [ ] Component doesn't break at different viewport sizes
- [ ] Text doesn't overflow containers
- [ ] Charts scale properly within their containers

## Integration Testing

### BMC Canvas Integration (Future)

When integrating into BMCCanvas:

1. **Register node types:**
```typescript
import { CostsSection, RevenueSection } from '@/components/canvas/sections';

const nodeTypes = {
  'costs-section': CostsSection,
  'revenue-section': RevenueSection,
  // ... other types
};
```

2. **Add to canvas:**
```typescript
const nodes = [
  {
    id: 'costs-1',
    type: 'costs-section',
    position: { x: 100, y: 100 },
    data: { canvasId: 'bmc-canvas-id', showDemo: false },
  },
  {
    id: 'revenue-1',
    type: 'revenue-section',
    position: { x: 100, y: 350 },
    data: { canvasId: 'bmc-canvas-id', showDemo: false },
  },
];
```

3. **Verify:**
- [ ] Sections render in canvas
- [ ] Sections are draggable
- [ ] Entity overlay renders over sections
- [ ] Real-time updates work (when implemented)

## Troubleshooting

### Common Issues

**Issue: Component not rendering**
- Check that canvasId is provided
- Verify Supabase connection
- Check browser console for errors

**Issue: Demo data not showing**
- Verify showDemo prop is true
- Check DEFAULT_COST_CONFIG is imported correctly
- Verify demo data structure matches interface

**Issue: Charts not visible**
- Check SVG rendering in browser dev tools
- Verify data points are being generated
- Check CSS for overflow: hidden issues

**Issue: Metrics showing 0**
- Verify entities have correct metadata structure
- Check entity_type filtering
- Verify calculation functions are working

## Automated Testing (Future)

Consider adding:
- [ ] Unit tests for metrics calculations
- [ ] Component rendering tests (React Testing Library)
- [ ] Visual regression tests (Playwright/Chromatic)
- [ ] Integration tests with Supabase

## Documentation

Refer to:
- `README.md` - Component overview and usage
- `VERIFICATION.md` - Implementation verification
- `REVENUE_SECTION_SUMMARY.md` - Detailed implementation notes
- Design document: `.kiro/specs/financial-metrics/design.md`
- Requirements: `.kiro/specs/financial-metrics/requirements.md`

## Feedback & Issues

When testing, note:
- Visual inconsistencies
- Performance issues
- Calculation errors
- UX improvements
- Missing features

Report issues with:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

