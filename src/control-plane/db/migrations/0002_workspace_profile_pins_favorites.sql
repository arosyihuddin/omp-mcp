CREATE TABLE `editor_sessions` (
	`root` text PRIMARY KEY NOT NULL,
	`tabs` text NOT NULL,
	`active_path` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`role` text,
	`avatar_color` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_favorites` (
	`path` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_pins` (
	`path` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_prefs` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_recents` (
	`path` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`opened_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workspace_recents_opened_at` ON `workspace_recents` (`opened_at`);
