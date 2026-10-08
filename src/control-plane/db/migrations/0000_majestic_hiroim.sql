CREATE TABLE IF NOT EXISTS `tool_call_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` text NOT NULL,
	`request_id` text,
	`session_id` text,
	`tool_name` text NOT NULL,
	`status` text NOT NULL,
	`approval` text,
	`duration_ms` integer,
	`arguments` text,
	`error` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_tool_call_logs_timestamp` ON `tool_call_logs` (`timestamp`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_tool_call_logs_tool_name` ON `tool_call_logs` (`tool_name`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_tool_call_logs_session_id` ON `tool_call_logs` (`session_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tool_configs` (
	`tool_name` text PRIMARY KEY NOT NULL,
	`exposed` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_tool_configs_updated_at` ON `tool_configs` (`updated_at`);