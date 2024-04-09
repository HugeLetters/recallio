CREATE TABLE `file_delete_queue` (
	`file_key` text(255) PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_meta` (
	`barcode` text(55) PRIMARY KEY NOT NULL,
	`public_review_count` integer DEFAULT 0 NOT NULL,
	`public_total_rating` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS `review_barcode_index`;--> statement-breakpoint
DROP INDEX IF EXISTS `review_name_index`;--> statement-breakpoint
DROP INDEX IF EXISTS `review_rating_index`;--> statement-breakpoint
DROP INDEX IF EXISTS `review_updated_at_index`;--> statement-breakpoint
DROP INDEX IF EXISTS `review_is_private_index`;--> statement-breakpoint
DROP INDEX IF EXISTS `reviews_to_categories_barcode_index`;--> statement-breakpoint
DROP INDEX IF EXISTS `reviews_to_categories_category_index`;--> statement-breakpoint
ALTER TABLE review ADD `id` text(11) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `review_id_unique` ON `review` (`id`);--> statement-breakpoint
CREATE INDEX `review_is_private_idx` ON `review` (`is_private`);--> statement-breakpoint
CREATE INDEX `review_product_review_list_by_updated_index` ON `review` (`barcode`,`is_private`,`updated_at`);--> statement-breakpoint
CREATE INDEX `review_product_review_list_by_rating_index` ON `review` (`barcode`,`is_private`,`rating`);