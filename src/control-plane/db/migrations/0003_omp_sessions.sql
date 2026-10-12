CREATE TABLE `omp_sessions` (
  `session_id` text PRIMARY KEY NOT NULL,
  `cwd` text NOT NULL,
  `status` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_omp_sessions_cwd_updated_at` ON `omp_sessions` (`cwd`, `updated_at`);
--> statement-breakpoint
CREATE INDEX `idx_omp_sessions_updated_at` ON `omp_sessions` (`updated_at`);
