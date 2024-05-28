CREATE TABLE `log` (
	`log` text(512) NOT NULL,
	`type` text(15) NOT NULL,
	`user_id` text(255),
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `log_created_at_index` ON `log` (`created_at`);