CREATE TABLE `account` (
	`userId` varchar(255) NOT NULL,
	`type` varchar(255) NOT NULL,
	`provider` varchar(255) NOT NULL,
	`providerAccountId` varchar(255) NOT NULL,
	`refresh_token` varchar(255),
	`access_token` varchar(511),
	`expires_at` int,
	`token_type` varchar(255),
	`scope` varchar(255),
	`id_token` varchar(2047),
	`session_state` varchar(255),
	`refresh_token_expires_in` int,
	CONSTRAINT `account_provider_providerAccountId` PRIMARY KEY(`provider`,`providerAccountId`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`sessionToken` varchar(255) NOT NULL,
	`userId` varchar(255) NOT NULL,
	`expires` timestamp NOT NULL,
	CONSTRAINT `session_sessionToken` PRIMARY KEY(`sessionToken`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`emailVerified` timestamp(3) DEFAULT (CURRENT_TIMESTAMP),
	`image` varchar(255),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires` timestamp NOT NULL,
	CONSTRAINT `verificationToken_identifier_token` PRIMARY KEY(`identifier`,`token`)
);
--> statement-breakpoint
CREATE TABLE `category` (
	`name` varchar(31) NOT NULL,
	CONSTRAINT `category_name` PRIMARY KEY(`name`)
);
--> statement-breakpoint
CREATE TABLE `review` (
	`user-id` varchar(255) NOT NULL,
	`barcode` varchar(55) NOT NULL,
	`name` varchar(255) NOT NULL,
	`rating` tinyint NOT NULL,
	`pros` varchar(4095),
	`cons` varchar(4095),
	`comment` varchar(2047),
	`image-key` varchar(255),
	`updated-at` datetime NOT NULL DEFAULT NOW(),
	`is-private` boolean NOT NULL DEFAULT true,
	CONSTRAINT `review_barcode_user-id` PRIMARY KEY(`user-id`,`barcode`)
);
--> statement-breakpoint
CREATE TABLE `reviews-to-categories` (
	`user-id` varchar(255) NOT NULL,
	`barcode` varchar(55) NOT NULL,
	`category` varchar(31) NOT NULL,
	CONSTRAINT `reviews-to-categories_barcode_category_user-id` PRIMARY KEY(`user-id`,`barcode`,`category`)
);
--> statement-breakpoint
CREATE INDEX `user-id-index` ON `account` (`userId`);--> statement-breakpoint
CREATE INDEX `user-id-index` ON `session` (`userId`);--> statement-breakpoint
CREATE INDEX `expires-index` ON `session` (`expires`);--> statement-breakpoint
CREATE INDEX `expires-index` ON `verificationToken` (`expires`);--> statement-breakpoint
CREATE INDEX `barcode-index` ON `review` (`barcode`);--> statement-breakpoint
CREATE INDEX `name-index` ON `review` (`name`);--> statement-breakpoint
CREATE INDEX `rating-index` ON `review` (`rating`);--> statement-breakpoint
CREATE INDEX `updated-at-index` ON `review` (`updated-at`);--> statement-breakpoint
CREATE INDEX `is-private-index` ON `review` (`is-private`);--> statement-breakpoint
CREATE INDEX `barcode-index` ON `reviews-to-categories` (`barcode`);--> statement-breakpoint
CREATE INDEX `category-index` ON `reviews-to-categories` (`category`);