CREATE TABLE `file-delete-queue` (
	`file_key` text(255) PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
