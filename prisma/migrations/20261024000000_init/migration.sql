-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "shop_status" AS ENUM ('building', 'preview', 'live', 'quiet', 'expired', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "page_state" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "link_type" AS ENUM ('whatsapp', 'call', 'google_review', 'wifi', 'maps', 'instagram', 'facebook', 'youtube', 'website', 'menu', 'custom');

-- CreateEnum
CREATE TYPE "qr_status" AS ENUM ('unassigned', 'assigned', 'retired');

-- CreateEnum
CREATE TYPE "bot_reason" AS ENUM ('crawler', 'no_token', 'duplicate', 'rate_limit', 'spike_review');

-- CreateEnum
CREATE TYPE "admin_role" AS ENUM ('owner', 'admin', 'viewer');

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "price_paise" INTEGER NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "shop_type" TEXT,
    "area" TEXT,
    "city" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "wa_message" TEXT,
    "logo_url" TEXT,
    "cover_url" TEXT,
    "status" "shop_status" NOT NULL DEFAULT 'building',
    "owner_name" TEXT,
    "owner_whatsapp" TEXT,
    "notes" TEXT,
    "plan_id" UUID,
    "plan_started_at" TIMESTAMP(3),
    "plan_ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_pages" (
    "shop_id" UUID NOT NULL,
    "state" "page_state" NOT NULL,
    "config" JSONB NOT NULL,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "shop_pages_pkey" PRIMARY KEY ("shop_id","state")
);

-- CreateTable
CREATE TABLE "slug_history" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "old_slug" TEXT NOT NULL,

    CONSTRAINT "slug_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "type" "link_type" NOT NULL,
    "label" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "code" VARCHAR(6) NOT NULL,
    "shop_id" UUID,
    "status" "qr_status" NOT NULL DEFAULT 'unassigned',
    "batch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "scan_events" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "shop_id" UUID,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_hash" TEXT,
    "ua_family" TEXT,
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "bot_reason" "bot_reason",

    CONSTRAINT "scan_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click_events" (
    "id" BIGSERIAL NOT NULL,
    "shop_id" UUID NOT NULL,
    "link_id" UUID,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_hash" TEXT,
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "bot_reason" "bot_reason",

    CONSTRAINT "click_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_stats" (
    "shop_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "scans" INTEGER NOT NULL DEFAULT 0,
    "taps" INTEGER NOT NULL DEFAULT 0,
    "bot_scans" INTEGER NOT NULL DEFAULT 0,
    "bot_taps" INTEGER NOT NULL DEFAULT 0,
    "taps_by_link" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("shop_id","day")
);

-- CreateTable
CREATE TABLE "change_log" (
    "id" UUID NOT NULL,
    "shop_id" UUID,
    "user_email" TEXT NOT NULL,
    "what" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undo_payload" JSONB,

    CONSTRAINT "change_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "email" TEXT NOT NULL,
    "role" "admin_role" NOT NULL DEFAULT 'admin',

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "shops_slug_key" ON "shops"("slug");

-- CreateIndex
CREATE INDEX "shops_status_idx" ON "shops"("status");

-- CreateIndex
CREATE INDEX "shops_plan_id_idx" ON "shops"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "slug_history_old_slug_key" ON "slug_history"("old_slug");

-- CreateIndex
CREATE INDEX "slug_history_shop_id_idx" ON "slug_history"("shop_id");

-- CreateIndex
CREATE INDEX "links_shop_id_position_idx" ON "links"("shop_id", "position");

-- CreateIndex
CREATE INDEX "qr_codes_shop_id_idx" ON "qr_codes"("shop_id");

-- CreateIndex
CREATE INDEX "qr_codes_batch_id_idx" ON "qr_codes"("batch_id");

-- CreateIndex
CREATE INDEX "scan_events_shop_id_at_idx" ON "scan_events"("shop_id", "at");

-- CreateIndex
CREATE INDEX "scan_events_code_at_idx" ON "scan_events"("code", "at");

-- CreateIndex
CREATE INDEX "scan_events_at_idx" ON "scan_events"("at");

-- CreateIndex
CREATE INDEX "click_events_shop_id_at_idx" ON "click_events"("shop_id", "at");

-- CreateIndex
CREATE INDEX "click_events_link_id_at_idx" ON "click_events"("link_id", "at");

-- CreateIndex
CREATE INDEX "click_events_at_idx" ON "click_events"("at");

-- CreateIndex
CREATE INDEX "change_log_shop_id_at_idx" ON "change_log"("shop_id", "at");

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_pages" ADD CONSTRAINT "shop_pages_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slug_history" ADD CONSTRAINT "slug_history_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_log" ADD CONSTRAINT "change_log_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

