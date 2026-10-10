CREATE TYPE "public"."bug_severity" AS ENUM('kritis', 'tinggi', 'sedang', 'rendah');--> statement-breakpoint
CREATE TYPE "public"."bug_status" AS ENUM('baru', 'dikonfirmasi', 'diperbaiki', 'retest', 'selesai', 'ditolak', 'dibuka_ulang');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'tester', 'developer');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"bug_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"storage_key" text NOT NULL,
	"uploaded_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bug_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"bug_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bug_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"bug_id" integer NOT NULL,
	"from_status" "bug_status",
	"to_status" "bug_status" NOT NULL,
	"changed_by" integer NOT NULL,
	"note" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bugs" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text,
	"project_id" integer NOT NULL,
	"module_id" integer,
	"title" text NOT NULL,
	"description" text,
	"steps" text,
	"expected_result" text,
	"actual_result" text,
	"environment" text,
	"severity" "bug_severity" DEFAULT 'sedang' NOT NULL,
	"priority" smallint DEFAULT 2 NOT NULL,
	"status" "bug_status" DEFAULT 'baru' NOT NULL,
	"reporter_id" integer NOT NULL,
	"assignee_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "bugs_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"module_id" integer,
	"title" text NOT NULL,
	"steps" text,
	"expected" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_case_id" integer NOT NULL,
	"result" text NOT NULL,
	"bug_id" integer,
	"note" text,
	"run_by" integer NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_runs_result_check" CHECK ("test_runs"."result" in ('pass','fail','blocked'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'tester' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_bug_id_bugs_id_fk" FOREIGN KEY ("bug_id") REFERENCES "public"."bugs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_comments" ADD CONSTRAINT "bug_comments_bug_id_bugs_id_fk" FOREIGN KEY ("bug_id") REFERENCES "public"."bugs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_comments" ADD CONSTRAINT "bug_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_status_history" ADD CONSTRAINT "bug_status_history_bug_id_bugs_id_fk" FOREIGN KEY ("bug_id") REFERENCES "public"."bugs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_status_history" ADD CONSTRAINT "bug_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_bug_id_bugs_id_fk" FOREIGN KEY ("bug_id") REFERENCES "public"."bugs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_run_by_users_id_fk" FOREIGN KEY ("run_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_attachments_bug" ON "attachments" USING btree ("bug_id");--> statement-breakpoint
CREATE INDEX "idx_comments_bug" ON "bug_comments" USING btree ("bug_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_hist_bug" ON "bug_status_history" USING btree ("bug_id","changed_at");--> statement-breakpoint
CREATE INDEX "idx_hist_date" ON "bug_status_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "idx_bugs_created" ON "bugs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_bugs_closed" ON "bugs" USING btree ("closed_at");--> statement-breakpoint
CREATE INDEX "idx_bugs_filter" ON "bugs" USING btree ("project_id","module_id","status","severity");--> statement-breakpoint
CREATE UNIQUE INDEX "modules_project_name_idx" ON "modules" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "idx_test_runs_case" ON "test_runs" USING btree ("test_case_id","run_at");