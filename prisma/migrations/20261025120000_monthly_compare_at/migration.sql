-- The 1-month plan is a launch price: 299 now, 399 regular. Confirmed by the owner.
UPDATE "plans" SET "compare_at_paise" = 39900 WHERE "months" = 1 AND "is_custom" = false AND "compare_at_paise" IS NULL;
