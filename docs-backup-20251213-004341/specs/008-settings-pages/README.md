# 006: Settings Pages

## Overview

Phase 4 of the Workflow Management UI refactor focuses on making settings pages fully functional. While the API endpoints, components, and pages exist, they need integration work to ensure users can actually configure webhooks, functions, and schedules end-to-end.

## Status

- **Overall**: 0% Complete
- **Started**: December 10, 2025
- **Last Updated**: December 10, 2025
- **Completed**: Not Started

## Documents

- [Requirements](requirements.md)
- [Design](design.md)
- [Tasks](tasks.md)

## Task Summaries

[Will be populated as tasks are completed]

## Critical Issues

[Will be populated as issues are discovered]

## Next Steps

1. Complete requirements document
2. Complete design document
3. Break down into tasks
4. Begin implementation

## Notes

This spec focuses on Phase 4 from the refactor roadmap: Settings Pages. The goal is to make existing settings functionality accessible and working for users to configure:

- Function Registry (user-provided webhooks)
- Webhook Configurations (with signature validation)
- Email Reply Webhooks (with provider selection)
- Schedule Management (with cron expressions)

Key architectural principles:
- Function registry is for USER-PROVIDED webhooks only (built-in workers stay code-registered)
- Webhook configs reuse `stitch_webhook_configs` table with signature validation ON by default
- Email replies must handle picking correct active run (most recent in `waiting_for_user` status)
- Schedules require `stitch_schedules` table and must integrate with Trigger.dev