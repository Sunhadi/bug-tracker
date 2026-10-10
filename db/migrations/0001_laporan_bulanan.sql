CREATE TYPE "public"."item_type" AS ENUM('bug', 'operational', 'penambahan', 'penyesuaian', 'new_item');--> statement-breakpoint
CREATE TYPE "public"."scope_position" AS ENUM('dalam_phase', 'luar_phase');--> statement-breakpoint
CREATE TYPE "public"."scope_status" AS ENUM('dibahas', 'disetujui', 'dikerjakan', 'selesai', 'ditolak');--> statement-breakpoint
CREATE TYPE "public"."scope_type" AS ENUM('new_requirement', 'enhancement');--> statement-breakpoint
CREATE TABLE "bug_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#626F86' NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "bug_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "daily_report_drafts" (
	"user_id" integer NOT NULL,
	"report_date" date NOT NULL,
	"activity" text DEFAULT '' NOT NULL,
	"learned" text DEFAULT '' NOT NULL,
	"blockers" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_report_drafts_user_id_report_date_pk" PRIMARY KEY("user_id","report_date")
);
--> statement-breakpoint
CREATE TABLE "report_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"bulan" date NOT NULL,
	"section" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_filters" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"query" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scope_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"discussed_on" date NOT NULL,
	"requester" text NOT NULL,
	"area" text NOT NULL,
	"request" text NOT NULL,
	"expected_outcome" text,
	"types" "scope_type"[] DEFAULT ARRAY[]::scope_type[] NOT NULL,
	"label" text,
	"phase_position" "scope_position" DEFAULT 'luar_phase' NOT NULL,
	"status" "scope_status" DEFAULT 'dibahas' NOT NULL,
	"notes" text,
	"bug_id" integer,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bugs" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "bugs" ADD COLUMN "item_type" "item_type" DEFAULT 'bug' NOT NULL;--> statement-breakpoint
ALTER TABLE "bugs" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "bugs" ADD COLUMN "jira_key" text;--> statement-breakpoint
ALTER TABLE "bugs" ADD COLUMN "jira_url" text;--> statement-breakpoint
ALTER TABLE "bugs" ADD COLUMN "fix_version" text;--> statement-breakpoint
ALTER TABLE "bugs" ADD COLUMN "pic_name" text;--> statement-breakpoint
ALTER TABLE "bugs" ADD COLUMN "action_note" text;--> statement-breakpoint
ALTER TABLE "bugs" ADD COLUMN "labels" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "bugs" ADD COLUMN "found_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "bugs" ADD COLUMN "exclude_from_analysis" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bugs" ADD COLUMN "exclude_reason" text;--> statement-breakpoint
ALTER TABLE "daily_report_drafts" ADD CONSTRAINT "daily_report_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_notes" ADD CONSTRAINT "report_notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_notes" ADD CONSTRAINT "report_notes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_requests" ADD CONSTRAINT "scope_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_requests" ADD CONSTRAINT "scope_requests_bug_id_bugs_id_fk" FOREIGN KEY ("bug_id") REFERENCES "public"."bugs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_requests" ADD CONSTRAINT "scope_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "report_notes_uniq" ON "report_notes" USING btree ("project_id","bulan","section");--> statement-breakpoint
CREATE INDEX "idx_scope_month" ON "scope_requests" USING btree ("project_id","discussed_on");--> statement-breakpoint
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_category_id_bug_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."bug_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bugs_found" ON "bugs" USING btree ("project_id","found_at");--> statement-breakpoint
CREATE INDEX "idx_bugs_category" ON "bugs" USING btree ("category_id");--> statement-breakpoint
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_jira_key_unique" UNIQUE("jira_key");