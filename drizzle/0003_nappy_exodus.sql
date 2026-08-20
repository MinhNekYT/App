CREATE TABLE `botUserAccess` (
	`userId` int NOT NULL,
	`isAdmin` boolean NOT NULL DEFAULT false,
	`isBanned` boolean NOT NULL DEFAULT false,
	`isPartner` boolean NOT NULL DEFAULT false,
	`lastPartnerRewardMonth` varchar(7),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `botUserAccess_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE TABLE `coinClaimLinks` (
	`id` varchar(48) NOT NULL,
	`userId` int NOT NULL,
	`discordName` varchar(100) NOT NULL,
	`avatarUrl` text,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coinClaimLinks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dailyClaimUsage` (
	`userId` int NOT NULL,
	`claimDate` varchar(10) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyClaimUsage_userId_claimDate_pk` PRIMARY KEY(`userId`,`claimDate`)
);
--> statement-breakpoint
ALTER TABLE `vmInstances` ADD `ubuntuVersion` varchar(8) DEFAULT '24.04' NOT NULL;--> statement-breakpoint
ALTER TABLE `botUserAccess` ADD CONSTRAINT `botUserAccess_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coinClaimLinks` ADD CONSTRAINT `coinClaimLinks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dailyClaimUsage` ADD CONSTRAINT `dailyClaimUsage_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;