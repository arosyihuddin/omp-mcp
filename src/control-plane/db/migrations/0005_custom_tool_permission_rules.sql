ALTER TABLE `tool_configs` ADD `custom_rule` text;
--> statement-breakpoint
ALTER TABLE `tool_permission_groups` ADD `custom_rule` text NOT NULL DEFAULT 'approval';
