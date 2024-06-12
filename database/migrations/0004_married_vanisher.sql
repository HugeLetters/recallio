ALTER TABLE `user` ADD `role` text(15);--> statement-breakpoint
ALTER TABLE `user` ADD `is_banned` integer DEFAULT false NOT NULL;