# Canvas Sections

Specialized section components for the Business Model Canvas that display financial and operational metrics.

## Overview

Unlike regular `SectionNode` components that act as containers for items, these section components are self-contained visualizations that display calculated metrics and data.

## Components

### RevenueSection

Displays revenue metrics and customer counts in a horizontal 5x2 layout.

**Features:**
- Monthly Recurring Revenue (MRR) prominently displayed
- Customer count with user icon
- Growth indicator with percentage and direction arrow
- Additional metrics: ARPU (Average Revenue Per User), LTV:CAC ratio
- Mini trend chart with 6 months historical + 3 months forecast
- Plan breakdown with customer counts and revenue percentages
- Demo mode support
- Real-time entity data integration

**Props:**
```typescript
interface RevenueSectionData {
  canvasId: string;   // Canvas ID for fetching entities
  showDemo?: boolean; // Use demo data (default: true)
  width?: number;     // Section width (default: 500px)
  height?: number;    // Section height (default: 200px)
}
```

**Demo Data:**
- MRR: $4,800/month
- Customer count: 24 customers
- ARPU: $200
- LTV:CAC: 3.2x
- Plan breakdown:
  - Starter: 12 users, $1,200 MRR (33.3%)
  - Pro: 9 users, $1,800 MRR (50.0%)
  - Enterprise: 3 users, $600 MRR (16.7%)

**Visual Design:**
- Emerald color scheme matching growth/revenue theme
- Horizontal layout with three panels:
  1. Left: Primary metrics (MRR, customer count, growth, ARPU, LTV:CAC)
  2. Center: Mini trend chart with forecast (dashed line)
  3. Right: Plan breakdown with counts and percentages
- Glowing border effect
- Demo mode badge in top-right corner

**Requirements Satisfied:**
- 2.1: Display Monthly Recurring Revenue (MRR)
- 2.2: Display number of paying customers
- 2.3: Display revenue breakdown by plan
- 2.4: Mini chart showing revenue trends with forecast
- 2.5: Growth indicator with percentage and direction arrow

**Data Integration:**
- Fetches entities from Supabase using `canvasId`
- Calculates metrics using the metrics service:
  - `calculateMRR()` for monthly recurring revenue
  - `calculateARPU()` for average revenue per user
  - `calculateLTVtoCAC()` for lifetime value to acquisition cost ratio
  - `getCustomersByPlan()` for plan breakdown
- Falls back to demo data when no entities exist or in demo mode

### CostsSection

Displays expense breakdown and cost trends in a horizontal 5x2 layout.

**Features:**
- Total monthly costs with warning indicator
- Month-over-month change indicator
- Budget threshold progress bar
- Mini trend chart (6 months of historical data)
- Category breakdown with percentages (API, Infrastructure, Team)
- Demo mode support

**Props:**
```typescript
interface CostsSectionData {
  canvasId: string;   // Canvas ID for scoping queries
  showDemo?: boolean; // Use demo data (default: true)
  width?: number;     // Section width (default: 500px)
  height?: number;    // Section height (default: 200px)
}
```

**Demo Data:**
- API costs: $127/month (72%)
- Infrastructure: $50/month (28%)
- Team: $0/month (0%)
- Total: $177/month
- Budget threshold: $200/month
- Warning triggers at 90% of threshold

**Visual Design:**
- Amber color scheme matching Financial category
- Horizontal layout with three panels:
  1. Left: Primary metrics (total, MoM change, threshold)
  2. Center: Mini trend chart
  3. Right: Category breakdown
- Glowing border effect
- Demo mode badge in top-right corner

**Requirements Satisfied:**
- 1.1: Display total monthly costs
- 1.2: Show breakdown by category
- 1.3: Warning indicator when threshold exceeded
- 1.4: Mini trend chart
- 1.5: Demo mode support

## Usage

### In BMC Canvas

Register the sections as custom node types:

```typescript
import { CostsSection, RevenueSection } from '@/components/canvas/sections';

const nodeTypes = {
  'costs-section': CostsSection,
  'revenue-section': RevenueSection,
  // ... other node types
};
```

### Testing

Test pages are available for visual verification:
- `/test-costs-section` - CostsSection component
- `/test-revenue-section` - RevenueSection component

## Implementation Notes

### Demo Mode

Currently, the component always uses demo data from `DEFAULT_COST_CONFIG`. Future iterations will:
- Fetch real cost data from configuration or database
- Support toggling between demo and real data
- Allow customization of cost categories

### Trend Data Generation

The component generates realistic trend data using the `generateTrendData` utility:
- 6 months of historical data
- 5% month-over-month growth rate
- Slight randomness for realism

### Styling

The component uses:
- Tailwind CSS for styling
- Amber color scheme (#f59e0b) for Financial category
- Custom SVG for mini trend chart
- Lucide icons for indicators

## Future Enhancements

1. **Real Data Integration**: Connect to actual cost tracking system
2. **Configurable Categories**: Allow custom cost categories
3. **Interactive Charts**: Click to drill down into detailed cost analysis
4. **Export Functionality**: Export cost data as CSV or PDF
5. **Alerts**: Email/notification when costs exceed thresholds
6. **Forecasting**: Show projected costs based on trends
