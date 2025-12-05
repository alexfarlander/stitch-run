-- Migration 015: Add require_signature field to webhook configs
-- Adds a boolean field to enforce signature validation for webhook endpoints
-- Critical security enhancement

-- Add require_signature column
-- Defaults to false for backward compatibility, but should be true for production
ALTER TABLE stitch_webhook_configs
ADD COLUMN IF NOT EXISTS require_signature BOOLEAN NOT NULL DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN stitch_webhook_configs.require_signature IS
'When true, webhooks without valid signatures will be rejected. Set to true in production for security.';

-- For existing webhook configs with a secret set, enable signature requirement
-- This is a safe migration because it only affects configs that already have secrets
UPDATE stitch_webhook_configs
SET require_signature = true
WHERE secret IS NOT NULL AND secret != '';
