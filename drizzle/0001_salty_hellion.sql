CREATE TABLE `userGithubSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`githubOwner` varchar(100) NOT NULL,
	`githubRepo` varchar(100) NOT NULL,
	`workflowFile` varchar(255) NOT NULL DEFAULT 'frierencloud-vm.yml',
	`ref` varchar(100) NOT NULL DEFAULT 'main',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userGithubSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `userGithubSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `vmInstances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`hostname` varchar(63) NOT NULL,
	`status` enum('queued','running','failed','completed') NOT NULL DEFAULT 'queued',
	`githubOwner` varchar(100) NOT NULL,
	`githubRepo` varchar(100) NOT NULL,
	`workflowFile` varchar(255) NOT NULL,
	`workflowRunId` varchar(64),
	`sshxUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vmInstances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vmLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instanceId` int NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vmLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `userGithubSettings` ADD CONSTRAINT `userGithubSettings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vmInstances` ADD CONSTRAINT `vmInstances_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vmLogs` ADD CONSTRAINT `vmLogs_instanceId_vmInstances_id_fk` FOREIGN KEY (`instanceId`) REFERENCES `vmInstances`(`id`) ON DELETE cascade ON UPDATE no action;