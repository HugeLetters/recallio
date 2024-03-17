CREATE TABLE `category` (
	`name` text(25) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review` (
	`user_id` text(255) NOT NULL,
	`barcode` text(55) NOT NULL,
	`name` text(60) NOT NULL,
	`rating` integer NOT NULL,
	`pros` text(2047),
	`cons` text(2047),
	`comment` text(2047),
	`image_key` text(255),
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`is_private` integer DEFAULT true NOT NULL,
	PRIMARY KEY(`user_id`, `barcode`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reviews_to_categories` (
	`user_id` text(255) NOT NULL,
	`barcode` text(55) NOT NULL,
	`category` text(25) NOT NULL,
	PRIMARY KEY(`user_id`, `barcode`, `category`),
	FOREIGN KEY (`category`) REFERENCES `category`(`name`) ON UPDATE restrict ON DELETE restrict,
	FOREIGN KEY (`barcode`,`user_id`) REFERENCES `review`(`barcode`,`user_id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `account` (
	`user_id` text(255) NOT NULL,
	`type` text(255) NOT NULL,
	`provider` text(255) NOT NULL,
	`provider_account_id` text(255) NOT NULL,
	`refresh_token` text(255),
	`access_token` text(511),
	`expires_at` integer,
	`token_type` text(255),
	`scope` text(255),
	`id_token` text(2047),
	`session_state` text(255),
	`refresh_token_expires_in` integer,
	PRIMARY KEY(`provider`, `provider_account_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`session_token` text(255) PRIMARY KEY NOT NULL,
	`user_id` text(255) NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`name` text(31) NOT NULL,
	`email` text(255) NOT NULL,
	`email_verified` integer DEFAULT (unixepoch()),
	`image` text(255)
);
--> statement-breakpoint
CREATE TABLE `verification_token` (
	`identifier` text(255) NOT NULL,
	`token` text(255) NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE INDEX `review_barcode_index` ON `review` (`barcode`);--> statement-breakpoint
CREATE INDEX `review_name_index` ON `review` (`name`);--> statement-breakpoint
CREATE INDEX `review_rating_index` ON `review` (`rating`);--> statement-breakpoint
CREATE INDEX `review_updated_at_index` ON `review` (`updated_at`);--> statement-breakpoint
CREATE INDEX `review_is_private_index` ON `review` (`is_private`);--> statement-breakpoint
CREATE INDEX `reviews_to_categories_barcode_index` ON `reviews_to_categories` (`barcode`);--> statement-breakpoint
CREATE INDEX `reviews_to_categories_category_index` ON `reviews_to_categories` (`category`);--> statement-breakpoint
CREATE INDEX `account_user_id_index` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_user_id_index` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_expires_index` ON `session` (`expires`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `verification_token_expires_index` ON `verification_token` (`expires`);