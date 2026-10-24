-- The "5 years" plan is gone. Deleted when no shop is on it; otherwise it becomes
-- a custom "60 months" plan so those shops keep their plan and dates.
DELETE FROM "plans" p
WHERE p."name" = '5 years'
  AND NOT EXISTS (SELECT 1 FROM "shops" s WHERE s."plan_id" = p."id");

UPDATE "plans" SET "name" = '60 months', "is_custom" = true WHERE "name" = '5 years';
