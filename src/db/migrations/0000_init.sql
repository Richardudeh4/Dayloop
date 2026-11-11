CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`start_local` text,
	`end_local` text,
	`tz` text,
	`all_day` integer DEFAULT false NOT NULL,
	`rrule` text,
	`location` text,
	`meeting_url` text,
	`meeting_provider` text,
	`color` text,
	`list_id` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`external_id` text,
	`version` integer DEFAULT 1 NOT NULL,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "items_type_check" CHECK("items"."type" in ('event', 'task', 'reminder')),
	CONSTRAINT "items_title_length" CHECK(length("items"."title") between 1 and 500),
	CONSTRAINT "items_end_after_start" CHECK("items"."end_local" is null or "items"."start_local" is null or "items"."end_local" >= "items"."start_local"),
	CONSTRAINT "items_meeting_url_scheme" CHECK("items"."meeting_url" is null or lower("items"."meeting_url") like 'http://%' or lower("items"."meeting_url") like 'https://%')
);
--> statement-breakpoint
CREATE TABLE `lists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`position` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "lists_name_length" CHECK(length("lists"."name") between 1 and 60)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lists_name_unique` ON `lists` (`name`);