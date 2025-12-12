# Implementation Plan

- [x] 1. Create metrics calculation service with core functions
  - Implement calculateTotalCAC, calculateTotalRevenue, calculateMRR, calculateChurnRate, getCustomersByPlan
  - Handle missing metadata gracefully (default to 0)
  - Validate entity types before calculations
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 1.1 Write property test for CAC calculation
  - **Property 1: CAC calculation is sum of entity CAC values**
  - **Validates: Requirements 3.1, 4.1**

- [x] 1.2 Write property test for revenue calculation
  - **Property 2: Revenue calculation includes only customers**
  - **Validates: Requirements 3.2, 4.2**

- [x] 1.3 Write property test for MRR calculation
  - **Property 3: MRR calculation uses monthly values**
  - **Validates: Requirements 3.3, 4.3**

- [x] 1.4 Write property test for churn rate calculation
  - **Property 4: Churn rate is percentage of churned entities**
  - **Validates: Requirements 3.4, 4.4**

- [x] 1.5 Write property test for plan breakdown
  - **Property 5: Plan breakdown sums to total customers**
  - **Validates: Requirements 3.5, 4.5**

- [x] 2. Add additional metrics functions
  - Implement calculateARPU (MRR / customer count)
  - Implement calculateLTVtoCAC (average LTV / average CAC)
  - Implement calculateTotalCosts (sum of cost categories)
  - _Requirements: 1.2_

- [x] 2.1 Write property test for cost total calculation
  - **Property 6: Cost total equals sum of categories**
  - **Validates: Requirements 1.2**

- [x] 3. Create demo data generation utilities
  - Implement generateTrendData for historical time-series
  - Implement generateForecast for future projections
  - Create realistic growth patterns (5-15% month-over-month)
  - Add slight randomness for realism
  - _Requirements: 1.4, 2.4_

- [x] 4. Create cost configuration module
  - Define CostConfig interface
  - Create DEFAULT_COST_CONFIG with demo values
  - Support configurable cost categories
  - Implement threshold warning logic
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 5. Build CostsSection component with horizontal layout
  - Create component at src/components/canvas/sections/CostsSection.tsx
  - Implement 5x2 horizontal layout (500px x 200px default)
  - Left panel: Total costs with warning indicator and month-over-month change
  - Center panel: Mini trend chart (6-12 months)
  - Right panel: Category breakdown with percentages
  - Support demo mode with realistic values
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 5.1 Write unit tests for CostsSection rendering
  - Test demo mode displays correct values
  - Test warning indicator appears when threshold exceeded
  - Test category breakdown sums to total

- [x] 6. Build RevenueSection component with horizontal layout
  - Create component at src/components/canvas/sections/RevenueSection.tsx
  - Implement 5x2 horizontal layout (500px x 200px default)
  - Left panel: MRR, customer count, growth indicator, ARPU, LTV:CAC
  - Center panel: Mini trend chart with forecast
  - Right panel: Plan breakdown with counts and percentages
  - Fetch entities from database using canvasId
  - Calculate metrics using metrics service
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 6.1 Write unit tests for RevenueSection rendering
  - Test metrics calculated correctly from entities
  - Test plan breakdown displays all plans
  - Test growth indicator shows correct direction

- [x] 7. Implement growth indicator logic
  - Create utility function to determine growth direction
  - Support upward, downward, and neutral indicators
  - Format percentage with appropriate precision
  - Handle edge cases (no previous data, equal values)
  - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [x] 7.1 Write property test for growth indicator direction
  - **Property 7: Growth indicator direction matches value change**
  - **Validates: Requirements 5.2, 5.3**

- [x] 8. Create mini chart component
  - Build reusable TrendChart component
  - Support line and area chart styles
  - Minimal design (no axes labels, smooth curves)
  - Use gradient colors matching section theme
  - Size: 100-150px wide, 40-60px tall
  - Use Recharts or custom SVG
  - _Requirements: 1.4, 2.4_

- [x] 9. Integrate financial sections into BMC
  - Register 'costs-section' and 'revenue-section' node types in BMCCanvas
  - Add sections to Financial category area
  - Ensure proper z-index and positioning
  - Verify entity overlay renders correctly over sections
  - Test drill-down navigation if applicable
  - _Requirements: 1.1, 2.1_

- [ ]* 9.1 Write integration tests for BMC financial sections
  - Test sections render in BMC canvas
  - Test sections fetch and display entity data
  - Test real-time updates when entities change

- [x] 10. Add demo mode toggle and indicators
  - Create UI toggle to switch between demo and real data
  - Add visual indicators (badge/watermark) for demo mode
  - Store demo preference in local state or config
  - Ensure smooth transition between modes
  - _Requirements: 1.5_

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
