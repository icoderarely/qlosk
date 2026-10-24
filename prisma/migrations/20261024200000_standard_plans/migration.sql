-- The three standard plans and their launch prices (1 month 299, 6 months 1,199,
-- 1 year 1,999). Existing plan rows are renamed, missing ones are added, and a
-- price is only filled in where none is set, so prices edited in admin stay.
UPDATE "plans" SET "name" = '1 month' WHERE "name" = 'Monthly';
UPDATE "plans" SET "name" = '1 year'  WHERE "name" = 'Yearly';

INSERT INTO "plans" ("id", "name", "months", "price_paise")
SELECT gen_random_uuid(), v.name, v.months, 0
FROM (VALUES ('1 month', 1), ('6 months', 6), ('1 year', 12)) AS v(name, months)
WHERE NOT EXISTS (SELECT 1 FROM "plans" p WHERE p."months" = v.months);

UPDATE "plans" SET "price_paise" = 29900  WHERE "months" = 1  AND "price_paise" = 0;
UPDATE "plans" SET "price_paise" = 119900 WHERE "months" = 6  AND "price_paise" = 0;
UPDATE "plans" SET "price_paise" = 199900 WHERE "months" = 12 AND "price_paise" = 0;
