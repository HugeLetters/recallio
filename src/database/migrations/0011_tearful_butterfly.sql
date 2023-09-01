DROP TABLE `product`;--> statement-breakpoint
DROP INDEX `user-id-index` ON `review`;--> statement-breakpoint
ALTER TABLE `review` MODIFY COLUMN `image` varchar(255);--> statement-breakpoint
CREATE INDEX `barcode-index` ON `review` (`barcode`);