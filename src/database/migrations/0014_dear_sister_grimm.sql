ALTER TABLE `review` MODIFY COLUMN `updated-at` datetime NOT NULL DEFAULT NOW();--> statement-breakpoint
CREATE INDEX `name-index` ON `review` (`name`);--> statement-breakpoint
CREATE INDEX `rating-index` ON `review` (`rating`);--> statement-breakpoint
CREATE INDEX `updated-at-index` ON `review` (`updated-at`);--> statement-breakpoint
CREATE INDEX `barcode-index` ON `reviews-to-categories` (`barcode`);--> statement-breakpoint
CREATE INDEX `category-index` ON `reviews-to-categories` (`category`);