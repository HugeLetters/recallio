ALTER TABLE review ADD `id` text(10) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `review_id_unique` ON `review` (`id`);