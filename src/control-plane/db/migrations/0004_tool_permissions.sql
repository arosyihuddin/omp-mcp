ALTER TABLE `tool_configs` ADD `permission_override` text;
--> statement-breakpoint
CREATE TABLE `tool_permission_groups` (
  `section` text PRIMARY KEY NOT NULL,
  `permission` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `tool_permission_groups` (`section`, `permission`, `updated_at`) VALUES
  ('read_only', 'always_allow', CURRENT_TIMESTAMP),
  ('edit_delete', 'require_approval', CURRENT_TIMESTAMP),
  ('other', 'require_approval', CURRENT_TIMESTAMP);
