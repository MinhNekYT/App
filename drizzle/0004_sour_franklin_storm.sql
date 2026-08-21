CREATE TABLE `userContributionTokens` (
	`userId` int NOT NULL,
	`encryptedToken` text NOT NULL,
	`confirmedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userContributionTokens_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE TABLE `userPreferences` (
	`userId` int NOT NULL,
	`locale` enum('en','vi') NOT NULL DEFAULT 'en',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userPreferences_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
ALTER TABLE `userContributionTokens` ADD CONSTRAINT `userContributionTokens_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userPreferences` ADD CONSTRAINT `userPreferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;