-- Plans: Monthly, Half yearly and Yearly are the standard plans; anything else is
-- a custom length set per shop (17 months and so on). Safe to run whether or not
-- the earlier standard_plans migration has been applied.
ALTER TABLE "plans" ADD COLUMN "is_custom" BOOLEAN NOT NULL DEFAULT false;

-- Any length that is not 1, 6 or 12 months (the old "5 years" plan, for one) is custom.
UPDATE "plans" SET "is_custom" = true WHERE "months" NOT IN (1, 6, 12);

-- Standard plans that do not exist yet.
INSERT INTO "plans" ("id", "name", "months", "price_paise", "is_custom")
SELECT gen_random_uuid(), v.name, v.months, v.price, false
FROM (VALUES ('Monthly', 1, 29900), ('Half yearly', 6, 119900), ('Yearly', 12, 199900)) AS v(name, months, price)
WHERE NOT EXISTS (SELECT 1 FROM "plans" p WHERE p."months" = v.months AND p."is_custom" = false);

-- Standard names, whatever they were called before.
UPDATE "plans" SET "name" = 'Monthly'     WHERE "months" = 1  AND "is_custom" = false;
UPDATE "plans" SET "name" = 'Half yearly' WHERE "months" = 6  AND "is_custom" = false;
UPDATE "plans" SET "name" = 'Yearly'      WHERE "months" = 12 AND "is_custom" = false;

-- Launch prices where none is set yet (prices edited in admin stay).
UPDATE "plans" SET "price_paise" = 29900  WHERE "months" = 1  AND "is_custom" = false AND "price_paise" = 0;
UPDATE "plans" SET "price_paise" = 119900 WHERE "months" = 6  AND "is_custom" = false AND "price_paise" = 0;
UPDATE "plans" SET "price_paise" = 199900 WHERE "months" = 12 AND "is_custom" = false AND "price_paise" = 0;

