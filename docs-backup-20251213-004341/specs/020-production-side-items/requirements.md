# Requirements Document

## Introduction

This specification defines the UI components and functionality for the production side of the Business Model Canvas (BMC). The production side consists of four sections: Integrations, People, Code, and Data. Each section requires specialized item components that display relevant status information and provide visual distinction from the customer-facing side of the canvas. These components will enable users to monitor the health and status of their technical infrastructure, team members, deployments, and data sources at a glance.

## Glossary

- **BMC (Business Model Canvas)**: A strategic management template with 12 standard sections representing different aspects of a business
- **Production Side**: The four BMC sections (Integrations, People, Code, Data) that represent the technical and operational infrastructure
- **Customer Side**: The BMC sections (Marketing, Sales, Support, etc.) that represent customer-facing operations
- **Section Item**: A visual component displayed within a BMC section that represents a specific resource or entity
- **Integration**: An external API or service connected to the system (e.g., Claude API, Supabase, Shotstack)
- **Health Check**: A function that verifies the connectivity and operational status of an integration
- **AI Agent**: An automated agent that performs tasks within the system
- **Deployment**: A code asset that has been deployed to a runtime environment
- **Data Source**: A database, spreadsheet, or other data storage system tracked by the application
- **Status Indicator**: A visual element showing the current operational state of a resource

## Requirements

### Requirement 1

**User Story:** As a business operator, I want to see the status of all my integrations in the Integrations section, so that I can quickly identify connectivity issues with external APIs.

#### Acceptance Criteria

1. WHEN an integration item is rendered THEN the System SHALL display the API name as a text label
2. WHEN an integration item is rendered THEN the System SHALL display a status indicator showing one of three states: connected, disconnected, or error
3. WHEN an integration item is rendered THEN the System SHALL display the last ping time as a formatted timestamp
4. WHEN an integration item is rendered THEN the System SHALL optionally display a usage indicator showing API consumption metrics
5. WHEN the status is "connected" THEN the System SHALL display a green visual indicator
6. WHEN the status is "disconnected" THEN the System SHALL display a gray visual indicator
7. WHEN the status is "error" THEN the System SHALL display a red visual indicator

### Requirement 2

**User Story:** As a system administrator, I want a health check function that verifies integration connectivity, so that integration status information remains current and accurate.

#### Acceptance Criteria

1. WHEN the health check function executes THEN the System SHALL verify the presence of required API keys for each integration
2. WHEN an API key is configured THEN the System SHALL mark the integration status as "connected"
3. WHEN an API key is missing THEN the System SHALL mark the integration status as "disconnected"
4. WHEN an API key verification fails THEN the System SHALL mark the integration status as "error"
5. WHEN the health check completes THEN the System SHALL update the last ping time to the current timestamp
6. WHEN the health check function is invoked THEN the System SHALL return status information for all configured integrations

### Requirement 3

**User Story:** As a team leader, I want to see all team members and AI agents in the People section, so that I can understand who is working on the business.

#### Acceptance Criteria

1. WHEN a person item is rendered THEN the System SHALL display an avatar image or placeholder
2. WHEN a person item is rendered THEN the System SHALL display the person's name as a text label
3. WHEN a person item is rendered THEN the System SHALL display the person's role (e.g., "Founder", "AI Assistant", "Sales Agent")
4. WHEN a person item is rendered THEN the System SHALL display a status indicator showing online, offline, or busy state
5. WHEN a person item is rendered THEN the System SHALL display a type badge indicating Human (👤) or AI (🤖)
6. WHEN the person is an AI agent THEN the System SHALL visually distinguish it from human team members
7. WHEN a person item is rendered with online status THEN the System SHALL display a green status indicator
8. WHEN a person item is rendered with offline status THEN the System SHALL display a gray status indicator
9. WHEN a person item is rendered with busy status THEN the System SHALL display a yellow status indicator

### Requirement 4

**User Story:** As a developer, I want to see deployment status in the Code section, so that I can monitor the health of my code assets.

#### Acceptance Criteria

1. WHEN a code item is rendered THEN the System SHALL display the deployment name as a text label
2. WHEN a code item is rendered THEN the System SHALL display a status indicator showing deployed, building, or failed state
3. WHEN a code item is rendered THEN the System SHALL display the last deploy time as a formatted timestamp
4. WHEN a code item is rendered THEN the System SHALL optionally display a link to the repository or deployment URL
5. WHEN the status is "deployed" THEN the System SHALL display a green visual indicator
6. WHEN the status is "building" THEN the System SHALL display a blue visual indicator
7. WHEN the status is "failed" THEN the System SHALL display a red visual indicator

### Requirement 5

**User Story:** As a data analyst, I want to see all data sources in the Data section, so that I can monitor data availability and freshness.

#### Acceptance Criteria

1. WHEN a data item is rendered THEN the System SHALL display the data source name as a text label
2. WHEN a data item is rendered THEN the System SHALL display a type icon indicating database, spreadsheet, or chart
3. WHEN a data item is rendered THEN the System SHALL display a record count with formatted numbers (e.g., "1,234 leads")
4. WHEN a data item is rendered THEN the System SHALL display the last sync time as a formatted timestamp
5. WHEN a data item is rendered THEN the System SHALL display a status indicator showing the operational state
6. WHEN the data source is operational THEN the System SHALL display a green status indicator
7. WHEN the data source has issues THEN the System SHALL display a red status indicator

### Requirement 6

**User Story:** As a business operator, I want the production side sections to be visually distinct from customer-facing sections, so that I can quickly identify which part of the canvas I'm viewing.

#### Acceptance Criteria

1. WHEN production side items are rendered THEN the System SHALL apply a distinct color scheme different from customer side items
2. WHEN production side items are rendered THEN the System SHALL use consistent styling across all four production sections (Integrations, People, Code, Data)
3. WHEN production side items are rendered THEN the System SHALL maintain visual hierarchy with clear labels and status indicators
4. WHEN production side items are rendered THEN the System SHALL use iconography that clearly represents technical infrastructure
