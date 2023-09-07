ALTER TABLE `review` RENAME COLUMN `image` TO `image-key`;--> statement-breakpoint
ALTER TABLE `review` MODIFY COLUMN `rating` tinyint NOT NULL;