# Tenancy Strategy (Hybrid Default)

This document applies a hybrid tenancy posture: pooled multi-tenant cells for the default SKU, and dedicated cells for customers that need stronger isolation, residency, or bespoke networking. A control plane assigns tenants to cells and orchestrates lifecycle, releases, and observability.

## 1) Requirements / Drivers
- Isolation & compliance: SOC2 baseline; optional PCI/HIPAA-ready hardening for dedicated cells (private networking, per-tenant keys, stricter logging/retention).
- Data residency: place tenants or cells per region; default to closest allowed region.
- Performance & noisy neighbors: size cells to small pools (e.g., 20–50 medium tenants) with per-tenant quotas.
- Customization tolerance: limited per-tenant config/flags in pooled; broader config and network options in dedicated.
- SLOs: set per-tenant SLOs (availability, latency); use error budgets to gate rollouts.
- Ops capacity: automation-first (IaC + CI/CD); minimal manual steps to add or move a tenant.

## 2) Tiering Policy (Pooled vs Dedicated)
- Pooled (default): shared app + shared DB/schema with strict tenant scoping; enabled for most customers.
- Dedicated cell: isolated app + DB + VPC; offered for regulated, high-ARR, or spiky tenants. Premium price to cover infra + SRE.
- Residency: choose cell region to satisfy data locality. Dedicated cells default to single-region primary + cross-region backups.
- Upgrade: same codebase for both tiers; feature flags govern tenant exposure.

## 3) Data Isolation Model
- Tenant identity: every table with tenant data includes `tenant_id`; service layer requires tenant context per request/job.
- Row-level security: enable Postgres RLS with policies scoped to `tenant_id`; block ad hoc queries without tenant guardrails.
- Access paths: enforce tenant scoping in data access layer (e.g., repository/ORM hooks); background jobs carry tenant context.
- Encryption: at-rest via cloud KMS; optional per-tenant keys for dedicated cells or sensitive tenants.
- Backups: per-tenant logical backups in pooled; full cluster backups in dedicated. Verify restores via periodic drills.
- Escalation: for extreme isolation, move a tenant from pooled to a dedicated cell (documented migration path).

## 4) Provisioning (IaC + CI/CD)
- Templates: single Terraform/Pulumi stack per cell (app services, DB, cache, bucket, secrets, networking, observability sinks).
- Pooled cell creation: apply stack → register cell in control plane → create shared schema with RLS → add to routing table.
- Dedicated cell creation: same template with flags for private networking (VPC peering/PrivateLink), per-cell KMS keys, isolated buckets.
- Tenant onboarding (pooled): allocate tenant id → insert config/limits → run schema migrations (idempotent) → provision API keys/secrets.
- Tenant onboarding (dedicated): stamp cell → run migrations → load base config → hand off endpoints/peering details.
- Migrations: one migration stream; run against each cell with automation and health checks.
- Cell sizing: start with minimal node/db class; autoscale within bounds; track per-tenant quotas (CPU/QPS/storage/job concurrency).

## 5) Release, Rollback, Drift, Patching
- Release train: trunk-based with staged rollouts; deploy to canary cell → pooled cells → dedicated cells, gated by SLO/error budgets.
- Feature flags: control tenant exposure; support per-tenant/per-cell rollout and quick disable.
- Rollback: keep last-good artifacts; fast rollback per cell; DB migrations follow safe patterns (online/backward-compatible, gated forwards).
- Drift detection: regularly compare applied IaC state vs live; auto-remediate or alert on drift.
- Patching: scheduled OS/DB patch windows per cell; urgent security patches via expedited lane; notify dedicated customers.

## 6) Cost Model & Pricing Guardrails
- Components to model: compute/app, DB, cache, storage/egress, observability, backups, SRE time.
- Pooled economics: low per-tenant marginal cost; enforce quotas to avoid resource theft; rebalance tenants across cells if saturation trends.
- Dedicated economics: minimum ARR to cover base cell cost; include setup fee; meter overages on storage/egress and premium support.
- Review quarterly: recompute cell density targets and ARR thresholds; adjust pricing and quotas.

## 7) Observability, Support, and DR
- Telemetry tagging: include `tenant_id` (and `cell_id`) on logs/metrics/traces; build per-tenant dashboards.
- Alerts: per-cell health alerts; tenant-level error-rate/latency alerts for top customers; page SRE for dedicated SLAs.
- Tracing: sample by tenant importance; capture async job spans with tenant context.
- Backups/restore: daily full + PITR where supported; document RPO/RTO by tier; run restore drills at least quarterly.
- Runbooks: tenant move between cells (pooled→pooled, pooled→dedicated); hotfix/rollback; incident comms with templates.
- Security: least-privilege service accounts; rotate secrets per cell; audit access with tenant/cell tags.
