-- Fixes: Unknown column 'employment_status_snapshot' in 'field list'
-- Prefer: from project backend folder, run: php artisan migrate
-- Or execute this in MySQL (HeidiSQL / phpMyAdmin / mysql CLI) against `dpwh`:

ALTER TABLE `attendance_records`
  ADD COLUMN `employment_status_snapshot` VARCHAR(255) NULL AFTER `daily_rate`;

-- Backfill from current profile employment status (matches Laravel migration)
UPDATE `attendance_records` AS ar
INNER JOIN `employee_profiles` AS ep ON ep.`id` = ar.`employee_profile_id`
SET ar.`employment_status_snapshot` = COALESCE(ep.`employment_status`, '')
WHERE ar.`employment_status_snapshot` IS NULL;
