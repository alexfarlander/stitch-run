# Requirements Document

## Introduction

This feature adds financial visibility to the Stitch Business Model Canvas by creating dedicated Costs and Revenue section visualizations. The system will calculate and display key business metrics derived from entity data, including Customer Acquisition Cost (CAC), Lifetime Value (LTV), Monthly Recurring Revenue (MRR), and churn rate. These metrics provide real-time financial insights as entities move through the canvas.

## Glossary

- **System**: The Stitch financial metrics visualization and calculation system
- **Entity**: A lead, customer, or churned customer tracked in the Stitch system
- **CAC**: Customer Acquisition Cost - the cost to acquire a single customer
- **LTV**: Lifetime Value - the total revenue expected from a customer
- **MRR**: Monthly Recurring Revenue - predictable monthly revenue from subscriptions
- **Churn Rate**: The percentage of customers who have stopped using the service
- **Costs Section**: A BMC section displaying expense breakdowns and trends
- **Revenue Section**: A BMC section displaying revenue metrics and customer counts
- **Metrics Service**: A calculation service that derives financial metrics from entity data

## Requirements

### Requirement 1

**User Story:** As a business owner, I want to see total costs broken down by category, so that I can understand where money is being spent.

#### Acceptance Criteria

1. WHEN the Costs section is rendered THEN the System SHALL display the total monthly costs
2. WHEN the Costs section is rendered THEN the System SHALL display a breakdown showing API costs, infrastructure costs, and team costs
3. WHEN costs exceed a defined threshold THEN the System SHALL display a warning indicator
4. WHEN the Costs section is rendered THEN the System SHALL display a mini chart showing cost trends over time
5. WHERE cost data is unavailable THEN the System SHALL display realistic demo values for API costs and infrastructure costs

### Requirement 2

**User Story:** As a business owner, I want to see revenue metrics and customer counts, so that I can track business growth.

#### Acceptance Criteria

1. WHEN the Revenue section is rendered THEN the System SHALL display the Monthly Recurring Revenue (MRR)
2. WHEN the Revenue section is rendered THEN the System SHALL display the number of paying customers
3. WHEN the Revenue section is rendered THEN the System SHALL display revenue breakdown by plan
4. WHEN the Revenue section is rendered THEN the System SHALL display a mini chart showing revenue trends
5. WHEN revenue changes from the previous period THEN the System SHALL display a growth indicator with percentage and direction arrow

### Requirement 3

**User Story:** As a business analyst, I want metrics calculated from entity data, so that financial insights reflect actual customer journeys.

#### Acceptance Criteria

1. WHEN calculating total CAC THEN the System SHALL sum the CAC values from all entity metadata
2. WHEN calculating total revenue THEN the System SHALL sum the LTV values from customer entities
3. WHEN calculating MRR THEN the System SHALL derive monthly recurring revenue from customer entities with plan information
4. WHEN calculating churn rate THEN the System SHALL compute the percentage of entities with entity_type equal to 'churned'
5. WHEN grouping customers by plan THEN the System SHALL return a breakdown showing count and revenue for each plan type

### Requirement 4

**User Story:** As a developer, I want a centralized metrics calculation service, so that financial calculations are consistent across the application.

#### Acceptance Criteria

1. THE System SHALL provide a calculateTotalCAC function that accepts an array of entities and returns the total acquisition cost
2. THE System SHALL provide a calculateTotalRevenue function that accepts an array of entities and returns the total revenue
3. THE System SHALL provide a calculateMRR function that accepts an array of entities and returns the monthly recurring revenue
4. THE System SHALL provide a calculateChurnRate function that accepts an array of entities and returns the churn percentage
5. THE System SHALL provide a getCustomersByPlan function that accepts an array of entities and returns a breakdown by plan

### Requirement 5

**User Story:** As a user, I want visual trend indicators, so that I can quickly understand if metrics are improving or declining.

#### Acceptance Criteria

1. WHEN rendering trend charts THEN the System SHALL display visual representations using SVG or a charting library
2. WHEN a metric increases from the previous period THEN the System SHALL display an upward arrow indicator
3. WHEN a metric decreases from the previous period THEN the System SHALL display a downward arrow indicator
4. WHEN displaying growth percentages THEN the System SHALL format the percentage with appropriate precision
5. WHEN trend data is insufficient THEN the System SHALL display a neutral indicator or placeholder
