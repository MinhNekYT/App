CREATE TABLE `botSettings` (
	`settingKey` varchar(80) NOT NULL,
	`settingValue` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `botSettings_settingKey` PRIMARY KEY(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `coinTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`actorUserId` int,
	`amount` int NOT NULL,
	`reason` varchar(128) NOT NULL,
	`instanceId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coinTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userCoinBalances` (
	`userId` int NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userCoinBalances_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
ALTER TABLE `coinTransactions` ADD CONSTRAINT `coinTransactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coinTransactions` ADD CONSTRAINT `coinTransactions_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coinTransactions` ADD CONSTRAINT `coinTransactions_instanceId_vmInstances_id_fk` FOREIGN KEY (`instanceId`) REFERENCES `vmInstances`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userCoinBalances` ADD CONSTRAINT `userCoinBalances_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;