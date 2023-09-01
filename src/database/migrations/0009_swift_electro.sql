CREATE TABLE `review` (
	`barcode` varchar(55) NOT NULL,
	`user-id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`rating` tinyint,
	`pros` varchar(4095),
	`cons` varchar(4095),
	`comment` varchar(2047),
	`image` binary,
	CONSTRAINT `review_barcode_user-id` PRIMARY KEY(`barcode`,`user-id`)
);
--> statement-breakpoint
CREATE TABLE `reviews-to-categories` (
	`user-id` varchar(255) NOT NULL,
	`barcode` varchar(55) NOT NULL,
	`category` varchar(31) NOT NULL,
	CONSTRAINT `reviews-to-categories_category` PRIMARY KEY(`category`)
);
--> statement-breakpoint
DROP TABLE `products-to-categories`;--> statement-breakpoint
RENAME TABLE `product-category` TO `category`;--> statement-breakpoint
CREATE INDEX `user-id-index` ON `review` (`user-id`);