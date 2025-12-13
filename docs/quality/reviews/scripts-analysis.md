# Scripts Directory Analysis

## Overview
This document categorizes the contents of the `scripts/` directory to determine what is critical infrastructure and what can be safely deleted.

## Categories

### 1. Critical Infrastructure (MUST KEEP)
*Scripts required for deployment, database management, and testing.*

| File | Purpose |
|------|---------|
| `reset-and-seed.ts` | **Master orchestrator** for resetting and seeding the database. Critical dev tool. |
| `seed-*.ts` (e.g., `seed-clockwork.ts`) | Individual seeders used by `reset-and-seed.ts`. Contains hardcoded demo data logic. |
| `apply-migration.ts` | Development utility to run SQL migrations. |
| `scripts/tests/*` | **The Core Test Suite**. Contains 100+ files including property-based and integration tests. |

### 2. Useful Utilities (KEEP RECOMMENDED)
*Scripts that are helpful for debugging or manual tasks.*

| File | Purpose |
|------|---------|
| `test-worker.ts` | Robust CLI tool for testing AI workers (Claude, Shotstack, etc.) in isolation. |
| `verify-all.ts` | Master verification script running extensive system health checks (topology, FKs, etc.). *Note: Currently has variable naming errors.* |
| `test-all-webhooks.sh` | Bash script for manual webhook endpoint testing. |
| `migrate-to-versions.ts` | Logic to migrate legacy flows to the new versioning system. Useful reference even if run once. |

### 3. Tests & Verification (DECIDE)
*One-off test scripts. Many overlap with the `verify-all.ts` suite.*

| File | Purpose |
|------|---------|
| `verify-*.ts` | Individual verification scripts. Most are aggregated by `verify-all.ts` but can be run standalone. |
| `test-*.ts` (misc) | Various specific tests (e.g., `test-financial-display.ts`). Likely redundant if covered by `tests/`. |

### 4. Legacy / Junk (DELETE)
*Obsolete scripts or empty files.*

| File | Purpose |
|------|---------|
| `test-mcp-node-creation.ts` | **Empty file** (0 bytes). |
| `delete-simple-test-flow.ts` | One-off cleanup script for a specific test flow. |
| `check-bmc-canvas.ts` | Likely superseded by `verify-bmc.ts`. |

## Recommendation
**DO NOT DELETE the `scripts/` directory.**

It contains critical infrastructure, including the entire project test suite (`scripts/tests/`) and the database seeding mechanisms required to run the application locally.

**Action Plan:**
1.  **Delete Junk:** Remove empty files like `test-mcp-node-creation.ts` and obvious one-offs.
2.  **Keep & Fix Utilities:** The `verify-*.ts` scripts are valuable for system health. The variable naming errors found previously should be fixed to restore their utility, rather than deleting them.
3.  **Preserve Tests:** The `scripts/tests/` folder is vital for regression testing.
