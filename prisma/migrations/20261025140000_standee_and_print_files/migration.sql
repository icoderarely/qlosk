-- Slice 6: standee designer choices on the shop, and a log of every generated print file.
ALTER TABLE "shops"
  ADD COLUMN "standee_design"   TEXT NOT NULL DEFAULT 'arch',
  ADD COLUMN "standee_theme"    TEXT NOT NULL DEFAULT 'match',
  ADD COLUMN "standee_headline" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "standee_size"     TEXT NOT NULL DEFAULT 'A5',
  ADD CONSTRAINT "shops_standee_design_check"   CHECK ("standee_design" IN ('arch', 'ticket', 'badge')),
  ADD CONSTRAINT "shops_standee_theme_check"    CHECK ("standee_theme" IN ('match', 'blush', 'marigold', 'daylight', 'graphite')),
  ADD CONSTRAINT "shops_standee_headline_check" CHECK (char_length("standee_headline") < 40),
  ADD CONSTRAINT "shops_standee_size_check"     CHECK ("standee_size" IN ('A5', 'A4'));

CREATE TYPE "print_kind" AS ENUM ('pdf', 'png', 'sheet');

CREATE TABLE "print_files" (
  "id"         UUID         NOT NULL,
  "shop_id"    UUID,
  "kind"       "print_kind" NOT NULL,
  "design"     TEXT,
  "theme"      TEXT,
  "size"       TEXT         NOT NULL,
  "created_by" TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "file_url"   TEXT         NOT NULL,
  CONSTRAINT "print_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "print_files_shop_id_created_at_idx" ON "print_files"("shop_id", "created_at");

ALTER TABLE "print_files"
  ADD CONSTRAINT "print_files_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
