ALTER TABLE `reviews-to-categories` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `reviews-to-categories` ADD PRIMARY KEY(`barcode`,`category`,`user-id`);