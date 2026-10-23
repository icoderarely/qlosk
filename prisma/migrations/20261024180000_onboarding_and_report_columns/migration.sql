-- Slice 8: onboarding stage, a bot reason for admin decisions, and the extra
-- daily_stats columns the reports read.
ALTER TYPE "bot_reason" ADD VALUE IF NOT EXISTS 'marked_bot';

CREATE TYPE "onboarding_stage" AS ENUM ('lead', 'building', 'preview_sent', 'printing', 'live');

ALTER TABLE "shops"
  ADD COLUMN "stage" "onboarding_stage" NOT NULL DEFAULT 'building',
  ADD COLUMN "stage_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing shops start where their status says they are.
UPDATE "shops" SET
  "stage" = (CASE "status"
    WHEN 'building' THEN 'building'
    WHEN 'preview' THEN 'preview_sent'
    ELSE 'live'
  END)::"onboarding_stage",
  "stage_changed_at" = "created_at";

ALTER TABLE "daily_stats"
  ADD COLUMN "held_scans" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "flag_reasons" JSONB NOT NULL DEFAULT '{}';
