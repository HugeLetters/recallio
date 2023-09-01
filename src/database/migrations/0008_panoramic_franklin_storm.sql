CREATE TABLE `product` (
	`barcode` varchar(55) NOT NULL,
	CONSTRAINT `product_barcode` PRIMARY KEY(`barcode`)
);
--> statement-breakpoint
CREATE TABLE `product-category` (
	`name` varchar(31) NOT NULL,
	CONSTRAINT `product-category_name` PRIMARY KEY(`name`)
);
--> statement-breakpoint
CREATE TABLE `products-to-categories` (
	`product-barcode` varchar(55) NOT NULL,
	`category-name` varchar(31) NOT NULL,
	CONSTRAINT `products-to-categories_category-name_product-barcode` PRIMARY KEY(`category-name`,`product-barcode`)
);
--> statement-breakpoint
ALTER TABLE `product-name` MODIFY COLUMN `barcode` varchar(55) NOT NULL;--> statement-breakpoint
CREATE INDEX `user-id-index` ON `account` (`userId`);--> statement-breakpoint
CREATE INDEX `user-id-index` ON `session` (`userId`);