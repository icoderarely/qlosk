-- Landing page pricing: an optional regular price shown struck out beside the real price.
ALTER TABLE "plans" ADD COLUMN "compare_at_paise" INTEGER;

-- 6 months and 1 year: the monthly price times the months (299 x 6 = 1,794; 299 x 12 = 3,588).
-- The 1-month plan stays empty: its strike-through is set only if a higher price is the genuine regular price.
UPDATE "plans" SET "compare_at_paise" = 179400 WHERE "months" = 6  AND "is_custom" = false AND "compare_at_paise" IS NULL;
UPDATE "plans" SET "compare_at_paise" = 358800 WHERE "months" = 12 AND "is_custom" = false AND "compare_at_paise" IS NULL;
