CREATE TABLE `checkins` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`prefecture` text NOT NULL,
	`city` text NOT NULL,
	`place` text NOT NULL,
	`place_key` text NOT NULL,
	`kind` text NOT NULL,
	`date` text NOT NULL,
	`note` text NOT NULL,
	`depth` integer NOT NULL,
	`eaten` integer NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_checkins_owner_date` ON `checkins` (`owner`,`date`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`checkin` text,
	`object_key` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_photos_owner_checkin` ON `photos` (`owner`,`checkin`);--> statement-breakpoint
CREATE TABLE `statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`scope` text NOT NULL,
	`label` text NOT NULL,
	`depth` integer NOT NULL,
	`eaten` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_statuses_owner` ON `statuses` (`owner`);