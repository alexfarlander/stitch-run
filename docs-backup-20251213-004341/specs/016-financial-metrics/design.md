# Design Document

## Overview

The Financial Metrics feature adds real-time financial visibility to the Stitch Business Model Canvas by creating specialized section visualizations for Costs and Revenue. The system calculates key business metrics (CAC, LTV, MRR, churn rate) from entity data stored in the database, providing actionable insights as customers move through their journeys.

This feature extends the existing BMC section architecture by creating custom section components that display financial data rather than acting as simple containers. The metrics calculation service provides a centralized, testable layer for deriving business intelligence from entity metadata.

## Architecture

### Component Hierarchy

```
BMCCanvas
├── SectionNode (existing - container sections)
├── CostsSection (new - financial visualization)
├── RevenueSection (new - financial visualization)
└── EntityOverlay (existing - entity tracking)

Metrics Service (new)
├── calculateTotalCAC()
├── calculateTotalRevenue()
├── calculateMRR()
├── calculateChurnRate()
└── getCustomersByPlan()
```

### Data Flow

1. **Entity Data Storage**: Entities store financial metadata (CAC, LTV, plan) in the `metadata` JSONB field
2. **Metrics Calculation**: The metrics service queries entities and aggregates financial data
3. **Section Rendering**: Costs and Revenue sections fetch calculated metrics and render visualizations
4. **Real-time Updates**: Sections can subscribe to entity changes via Supabase realtime for live updates

## Components and Interfaces

### CostsSection Component

**Location**: `src/components/canvas/sections/CostsSection.tsx`

**Purpose**: Displays expense breakdown and cost trends in a horizontal 5x2 layout

**Props**:
```typescript
interface CostsSectionProps {
  canvasId: string;  // For scoping entity queries
  showDemo?: boolean; // Whether to use demo data
  width?: number;     // Section width (default: 500px for 5x proportion)
  height?: number;    // Section height (default: 200px for 2x proportion)
}
```

**Visual Elements** (left to right):
1. **Left Panel**: Total monthly costs (large number) with warning indicator and month-over-month change
2. **Center Panel**: Mini trend chart showing 6-12 months of cost history
3. **Right Panel**: Category breakdown (API, Infrastructure, Team) with individual costs and percentages

**Demo Values** (when `showDemo` is true):
- API costs: $127/month (72% of total)
- Infrastructure: $50/month (28% of total)
- Team: $0/month
- Total: $177/month
- Trend: Gradual increase over 6 months
- Budget threshold: $200/month (warning at 90%)

### RevenueSection Component

**Location**: `src/components/canvas/sections/RevenueSection.tsx`

**Purpose**: Displays revenue metrics and customer counts in a horizontal 5x2 layout

**Props**:
```typescript
interface RevenueSectionProps {
  canvasId: string;  // For scoping entity queries
  entities?: StitchEntity[]; // Optional pre-fetched entities
  showDemo?: boolean; // Whether to use demo data
  width?: number;     // Section width (default: 500px for 5x proportion)
  height?: number;    // Section height (default: 200px for 2x proportion)
}
```

**Visual Elements** (left to right):
1. **Left Panel**: 
   - MRR (Monthly Recurring Revenue) - large, prominent number
   - Number of paying customers
   - Growth indicator (arrow + percentage)
   - Additional metrics: ARPU, LTV:CAC ratio
2. **Center Panel**: Mini trend chart showing revenue growth over 6-12 months with forecast
3. **Right Panel**: 
   - Revenue breakdown by plan (Starter, Pro, Enterprise)
   - Customer count per plan
   - Percentage of total revenue per plan

**Calculation Logic**:
- Count entities where `entity_type === 'customer'`
- Sum LTV values from customer metadata
- Calculate MRR from plan information (monthly_value or ltv/12)
- Derive growth from historical data or simulated trend
- Calculate ARPU: MRR / customer count
- Calculate LTV:CAC ratio: average LTV / average CAC

### Metrics Calculation Service

**Location**: `src/lib/metrics/calculations.ts`

**Purpose**: Centralized service for deriving financial metrics from entity data

**Interface**:
```typescript
/**
 * Calculate total Customer Acquisition Cost from all entities
 * Sums the CAC value from entity metadata
 */
export function calculateTotalCAC(entities: StitchEntity[]): number;

/**
 * Calculate total revenue from customer entities
 * Sums LTV values from entities with type 'customer'
 */
export function calculateTotalRevenue(entities: StitchEntity[]): number;

/**
 * Calculate Monthly Recurring Revenue
 * Derives MRR from customer entities with plan information
 * Assumes plan metadata contains monthly_value or similar
 */
export function calculateMRR(entities: StitchEntity[]): number;

/**
 * Calculate churn rate as percentage
 * Returns (churned_count / total_customers) * 100
 */
export function calculateChurnRate(entities: StitchEntity[]): number;

/**
 * Group customers by plan with counts and revenue
 * Returns breakdown of customers per plan with aggregated metrics
 */
export function getCustomersByPlan(entities: StitchEntity[]): PlanBreakdown[];

/**
 * Calculate Average Revenue Per User
 * Returns MRR / customer count
 */
export function calculateARPU(entities: StitchEntity[]): number;

/**
 * Calculate LTV to CAC ratio
 * Returns average LTV / average CAC
 */
export function calculateLTVtoCAC(entities: StitchEntity[]): number;

/**
 * Calculate total costs from cost configuration
 * Returns sum of all cost categories
 */
export function calculateTotalCosts(config: CostConfig): number;

/**
 * Generate historical trend data for demo purposes
 * Creates realistic time-series data with growth patterns
 */
export function generateTrendData(
  baseValue: number,
  periods: number,
  growthRate: number
): TrendDataPoint[];

/**
 * Generate forecast data based on current trend
 * Projects future values using linear or exponential growth
 */
export function generateForecast(
  historicalData: TrendDataPoint[],
  periodsAhead: number
): TrendDataPoint[];

interface PlanBreakdown {
  plan: string;
  count: number;
  revenue: number;
  mrr: number;
  percentage: number; // Percentage of total revenue
}
```

**Implementation Notes**:
- All functions are pure (no side effects)
- Handle missing metadata gracefully (default to 0)
- Validate entity_type before calculations
- Support both real and demo data

## Data Models

### Entity Metadata Extensions

The existing `EntityMetadata` interface already supports financial fields:

```typescript
interface EntityMetadata {
  source?: string;           // "linkedin", "seo", "referral"
  campaign?: string;         // UTM campaign
  cac?: number;              // Customer acquisition cost
  ltv?: number;              // Lifetime value
  plan?: string;             // Current plan ("starter", "pro", "enterprise")
  monthly_value?: number;    // Monthly subscription value (for MRR)
  [key: string]: any;
}
```

**New Conventions**:
- `cac`: Numeric value representing acquisition cost in dollars
- `ltv`: Numeric value representing lifetime value in dollars
- `plan`: String identifier for subscription plan
- `monthly_value`: Numeric value for MRR calculation (defaults to ltv/12 if not present)

### Cost Configuration

**Location**: `src/lib/metrics/cost-config.ts`

```typescript
interface CostConfig {
  api_costs: number;
  infrastructure_costs: number;
  team_costs: number;
  threshold: number; // Warning threshold
}

export const DEFAULT_COST_CONFIG: CostConfig = {
  api_costs: 127,
  infrastructure_costs: 50,
  team_costs: 0,
  threshold: 200,
};
```

### Trend Data Structure

For mini charts, use a simple time-series structure:

```typescript
interface TrendDataPoint {
  period: string;  // "Jan", "Feb", or ISO date
  value: number;
}

type TrendData = TrendDataPoint[];
```

**Demo Trend Generation**:
- Generate 6-12 data points
- Apply realistic growth curve (e.g., 5-15% month-over-month)
- Add slight randomness for realism

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, I identified that requirements 4.1-4.5 are redundant with 3.1-3.5 (they test the same calculation functions), and requirements 5.2 and 5.3 can be combined into a single property about growth indicator direction. This gives us 7 unique, non-redundant properties.

### Property 1: CAC calculation is sum of entity CAC values
*For any* array of entities, the total CAC returned by calculateTotalCAC should equal the sum of all individual CAC values from entity metadata, treating missing or invalid values as zero.
**Validates: Requirements 3.1, 4.1**

### Property 2: Revenue calculation includes only customers
*For any* array of entities with mixed types (lead, customer, churned), the total revenue returned by calculateTotalRevenue should only sum LTV values from entities where entity_type equals 'customer', excluding all other entity types.
**Validates: Requirements 3.2, 4.2**

### Property 3: MRR calculation uses monthly values
*For any* array of customer entities with plan information, the MRR returned by calculateMRR should equal the sum of monthly_value fields from entity metadata, falling back to ltv/12 when monthly_value is absent or invalid.
**Validates: Requirements 3.3, 4.3**

### Property 4: Churn rate is percentage of churned entities
*For any* array of entities, the churn rate returned by calculateChurnRate should equal (count of entities with entity_type='churned' / count of entities with entity_type='customer' or 'churned') * 100, returning 0 when no customers or churned entities exist.
**Validates: Requirements 3.4, 4.4**

### Property 5: Plan breakdown sums to total customers
*For any* array of customer entities, the sum of counts across all plan breakdowns returned by getCustomersByPlan should equal the total number of entities with entity_type='customer'.
**Validates: Requirements 3.5, 4.5**

### Property 6: Cost total equals sum of categories
*For any* cost configuration object, the total monthly costs should equal the sum of api_costs, infrastructure_costs, and team_costs fields.
**Validates: Requirements 1.2**

### Property 7: Growth indicator direction matches value change
*For any* two consecutive metric values (previous and current), when current > previous the growth indicator should show upward direction, when current < previous it should show downward direction, and when current equals previous it should show neutral or no change.
**Validates: Requirements 5.2, 5.3**

## Error Handling

### Missing Entity Data

**Scenario**: Entity metadata lacks financial fields (cac, ltv, plan)

**Handling**:
- Treat missing numeric fields as 0
- Treat missing plan as "unknown" or exclude from plan breakdown
- Log warning for entities missing critical financial data
- Continue calculation without throwing errors

### Invalid Numeric Values

**Scenario**: Entity metadata contains non-numeric or negative values

**Handling**:
- Validate numeric fields before calculation
- Treat invalid values as 0
- Log validation errors for debugging
- Provide clear error messages in development mode

### Empty Entity Arrays

**Scenario**: No entities exist for the canvas

**Handling**:
- Return 0 for all numeric calculations
- Return empty array for plan breakdowns
- Display "No data" state in UI components
- Optionally show demo data with clear indicator

### Database Query Failures

**Scenario**: Supabase query fails when fetching entities

**Handling**:
- Catch and log database errors
- Display error state in UI with retry option
- Fall back to demo data if configured
- Prevent component crash with error boundaries

## Testing Strategy

### Unit Testing

**Framework**: Vitest (existing project standard)

**Test Coverage**:

1. **Metrics Calculations**:
   - Test each calculation function with known inputs
   - Test edge cases (empty arrays, missing metadata)
   - Test invalid data handling
   - Test zero and negative values

2. **Component Rendering**:
   - Test CostsSection renders with demo data
   - Test RevenueSection renders with entity data
   - Test warning indicators appear correctly
   - Test growth indicators show correct direction

3. **Data Transformations**:
   - Test trend data generation
   - Test plan breakdown grouping
   - Test percentage calculations

### Property-Based Testing

**Framework**: fast-check (TypeScript PBT library)

**Configuration**: Minimum 100 iterations per property test

**Property Tests**:

1. **Property 1: CAC Summation**
   - Generate random arrays of entities with CAC values
   - Verify calculateTotalCAC equals manual sum
   - **Feature: financial-metrics, Property 1: CAC calculation is sum of entity CAC values**

2. **Property 2: Revenue Customer Filter**
   - Generate mixed entity types (lead, customer, churned)
   - Verify calculateTotalRevenue only includes customers
   - **Feature: financial-metrics, Property 2: Revenue calculation includes only customers**

3. **Property 3: MRR Monthly Values**
   - Generate customers with various plan configurations
   - Verify calculateMRR uses monthly_value or ltv/12
   - **Feature: financial-metrics, Property 3: MRR calculation uses monthly values**

4. **Property 4: Churn Rate Percentage**
   - Generate entities with various type distributions
   - Verify calculateChurnRate returns correct percentage
   - **Feature: financial-metrics, Property 4: Churn rate is percentage of churned entities**

5. **Property 5: Plan Breakdown Totals**
   - Generate customers with random plan assignments
   - Verify getCustomersByPlan counts sum to total
   - **Feature: financial-metrics, Property 5: Plan breakdown sums to total customers**

6. **Property 6: Cost Category Summation**
   - Generate random cost configurations
   - Verify total equals sum of categories
   - **Feature: financial-metrics, Property 6: Cost total equals sum of categories**

7. **Property 7: Growth Direction Consistency**
   - Generate pairs of metric values
   - Verify growth indicator direction matches comparison
   - **Feature: financial-metrics, Property 7: Growth indicator direction matches value change**

### Integration Testing

**Scope**: Test components with real Supabase queries

**Test Cases**:
- Fetch entities from test database
- Calculate metrics from real data
- Render sections with database-backed data
- Verify real-time updates when entities change

**Note**: Integration tests are important but secondary to property-based tests for coverage.

## Visual Design

### Color Scheme

**Costs Section**:
- Primary: Amber (#f59e0b) - matches Financial category
- Warning: Red (#ef4444) - for threshold exceeded
- Background: Dark slate with amber glow

**Revenue Section**:
- Primary: Emerald (#10b981) - represents growth
- Accent: Cyan (#06b6d4) - for highlights
- Background: Dark slate with emerald glow

### Typography

- **Large Numbers**: 2xl-3xl font size, bold weight
- **Labels**: xs-sm font size, uppercase, tracking-wider
- **Breakdown Items**: sm font size, regular weight

### Chart Style

**Mini Trend Charts**:
- Type: Line chart or area chart
- Size: 100-150px wide, 40-60px tall
- Style: Minimal, no axes labels, smooth curves
- Color: Gradient from primary color
- Library: Recharts or custom SVG

### Layout

Both sections use a **horizontal layout with 5x2 proportion** (wide and short):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 💰 COSTS / REVENUE                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  $X,XXX  ↑ +X%    │  ┌──────────────┐  │  Category 1: $XXX                │
│  Primary Metric   │  │  Mini Chart  │  │  Category 2: $XXX                │
│                   │  └──────────────┘  │  Category 3: $XXX                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Layout Structure** (left to right):
1. **Primary Metric Area** (left): Large number with growth indicator
2. **Trend Chart** (center): Mini line/area chart showing historical trend
3. **Breakdown** (right): Category breakdown or plan details

## Implementation Notes

### Section Integration

The new financial sections should integrate with the existing BMC architecture:

1. **Node Type Registration**: Register `costs-section` and `revenue-section` node types in BMCCanvas
2. **Section Positioning**: Place in Financial category area of BMC
3. **Drill-down Support**: Optionally support drill-down to detailed financial workflows
4. **Entity Overlay**: Ensure entity dots render correctly over financial sections

### Performance Considerations

**Entity Query Optimization**:
- Cache entity queries when possible
- Use Supabase select to fetch only needed fields
- Consider pagination for large entity counts
- Debounce real-time updates to prevent excessive re-renders

**Calculation Efficiency**:
- Memoize calculation results
- Avoid recalculating on every render
- Use React.useMemo for expensive computations
- Consider web workers for very large datasets (future optimization)

### Demo Mode

**Purpose**: Allow users to see financial sections without real data

**Implementation**:
- Add `showDemo` prop to both section components
- Generate realistic demo entities with financial metadata
- Clearly indicate demo mode with badge or watermark
- Provide toggle to switch between demo and real data

### Demo Visualizations

**Include in Initial Implementation**:

The following features should be implemented with demo/simulated data for visualization purposes:

1. **Historical Trend Storage**: Generate 6-12 months of simulated historical data for trend charts
2. **Configurable Cost Categories**: Allow demo mode to show different cost category configurations
3. **Budget Alerts**: Display warning indicators when costs approach or exceed thresholds
4. **Comparison with Previous Periods**: Show month-over-month or period-over-period comparisons
5. **Forecasting**: Display simple linear projections for next 1-3 months based on current trends
6. **Multiple Metrics**: Show additional metrics like:
   - Average Revenue Per User (ARPU)
   - Customer Lifetime Value to CAC ratio (LTV:CAC)
   - Burn rate (for costs)
   - Gross margin

**Implementation Approach**:
- Use realistic demo data generation algorithms
- Clearly mark demo/projected data with visual indicators
- Make it easy to swap demo data for real data in future
- Store demo configurations in a separate config file
