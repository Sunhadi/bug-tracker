import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  smallint,
  timestamp,
  date,
  boolean,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { check } from "drizzle-orm/pg-core";

// ============ ENUMS ============
export const bugStatusEnum = pgEnum("bug_status", [
  "baru",
  "dikonfirmasi",
  "diperbaiki",
  "retest",
  "selesai",
  "ditolak",
  "dibuka_ulang",
]);

export const bugSeverityEnum = pgEnum("bug_severity", [
  "kritis",
  "tinggi",
  "sedang",
  "rendah",
]);

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "tester",
  "developer",
]);

// ============ ENUM LAPORAN BULANAN ============
export const itemTypeEnum = pgEnum("item_type", [
  "bug",
  "operational",
  "penambahan",
  "penyesuaian",
  "new_item",
]);

export const scopeTypeEnum = pgEnum("scope_type", [
  "new_requirement",
  "enhancement",
]);

export const scopePositionEnum = pgEnum("scope_position", [
  "dalam_phase",
  "luar_phase",
]);

export const scopeStatusEnum = pgEnum("scope_status", [
  "dibahas",
  "disetujui",
  "dikerjakan",
  "selesai",
  "ditolak",
]);

// ============ USERS ============
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("tester"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ============ PROJECTS ============
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ============ MODULES ============
export const modules = pgTable(
  "modules",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("modules_project_name_idx").on(t.projectId, t.name)]
);

// ============ BUG CATEGORIES ============
export const bugCategories = pgTable("bug_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#626F86"),
  sortOrder: smallint("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

// ============ BUGS ============
export const bugs = pgTable(
  "bugs",
  {
    id: serial("id").primaryKey(),
    code: text("code").unique(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id),
    moduleId: integer("module_id").references(() => modules.id),
    title: text("title").notNull(),
    description: text("description"),
    steps: text("steps"),
    expectedResult: text("expected_result"),
    actualResult: text("actual_result"),
    environment: text("environment"),
    severity: bugSeverityEnum("severity").notNull().default("sedang"),
    priority: smallint("priority").notNull().default(2),
    status: bugStatusEnum("status").notNull().default("baru"),
    reporterId: integer("reporter_id")
      .notNull()
      .references(() => users.id),
    assigneeId: integer("assignee_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),

    // --- Field laporan bulanan ---
    categoryId: integer("category_id").references(() => bugCategories.id),
    itemType: itemTypeEnum("item_type").notNull().default("bug"),
    source: text("source")
      .notNull()
      .default("manual")
      .$type<"manual" | "jira" | "import">(),
    jiraKey: text("jira_key").unique(),
    jiraUrl: text("jira_url"),
    fixVersion: text("fix_version"),
    picName: text("pic_name"),
    actionNote: text("action_note"),
    labels: text("labels")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Tanggal tiket dibuat di Jira atau tanggal ditemukan; laporan memakai ini. */
    foundAt: timestamp("found_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    excludeFromAnalysis: boolean("exclude_from_analysis")
      .notNull()
      .default(false),
    excludeReason: text("exclude_reason"),
  },
  (t) => [
    index("idx_bugs_created").on(t.createdAt),
    index("idx_bugs_closed").on(t.closedAt),
    index("idx_bugs_filter").on(t.projectId, t.moduleId, t.status, t.severity),
    index("idx_bugs_found").on(t.projectId, t.foundAt),
    index("idx_bugs_category").on(t.categoryId),
  ]
);

// ============ BUG STATUS HISTORY ============
export const bugStatusHistory = pgTable(
  "bug_status_history",
  {
    id: serial("id").primaryKey(),
    bugId: integer("bug_id")
      .notNull()
      .references(() => bugs.id, { onDelete: "cascade" }),
    fromStatus: bugStatusEnum("from_status"),
    toStatus: bugStatusEnum("to_status").notNull(),
    changedBy: integer("changed_by")
      .notNull()
      .references(() => users.id),
    note: text("note"),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_hist_bug").on(t.bugId, t.changedAt),
    index("idx_hist_date").on(t.changedAt),
  ]
);

// ============ BUG COMMENTS ============
export const bugComments = pgTable(
  "bug_comments",
  {
    id: serial("id").primaryKey(),
    bugId: integer("bug_id")
      .notNull()
      .references(() => bugs.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_comments_bug").on(t.bugId, t.createdAt)]
);

// ============ ATTACHMENTS ============
export const attachments = pgTable(
  "attachments",
  {
    id: serial("id").primaryKey(),
    bugId: integer("bug_id")
      .notNull()
      .references(() => bugs.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    storageKey: text("storage_key").notNull(),
    uploadedBy: integer("uploaded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_attachments_bug").on(t.bugId)]
);

// ============ TEST CASES ============
export const testCases = pgTable("test_cases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  moduleId: integer("module_id").references(() => modules.id),
  title: text("title").notNull(),
  steps: text("steps"),
  expected: text("expected"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ============ TEST RUNS ============
export const testRuns = pgTable(
  "test_runs",
  {
    id: serial("id").primaryKey(),
    testCaseId: integer("test_case_id")
      .notNull()
      .references(() => testCases.id, { onDelete: "cascade" }),
    result: text("result", { enum: ["pass", "fail", "blocked"] }).notNull(),
    bugId: integer("bug_id").references(() => bugs.id),
    note: text("note"),
    runBy: integer("run_by")
      .notNull()
      .references(() => users.id),
    runAt: timestamp("run_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_test_runs_case").on(t.testCaseId, t.runAt),
    check(
      "test_runs_result_check",
      sql`${t.result} in ('pass','fail','blocked')`
    ),
  ]
);

// ============ SCOPE REQUESTS ============
export const scopeRequests = pgTable(
  "scope_requests",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id),
    /** Tanggal dibahas; menentukan bulan laporan. */
    discussedOn: date("discussed_on").notNull(),
    requester: text("requester").notNull(),
    area: text("area").notNull(),
    request: text("request").notNull(),
    expectedOutcome: text("expected_outcome"),
    types: scopeTypeEnum("types")
      .array()
      .notNull()
      .default(sql`ARRAY[]::scope_type[]`),
    label: text("label"),
    phasePosition: scopePositionEnum("phase_position")
      .notNull()
      .default("luar_phase"),
    status: scopeStatusEnum("status").notNull().default("dibahas"),
    notes: text("notes"),
    bugId: integer("bug_id").references(() => bugs.id, { onDelete: "set null" }),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_scope_month").on(t.projectId, t.discussedOn)]
);

// ============ REPORT NOTES ============
/** Catatan yang bisa diedit di laporan, disimpan per bulan dan per bagian. */
export const reportNotes = pgTable(
  "report_notes",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").references(() => projects.id),
    /** Selalu tanggal 1 dari bulan yang dilaporkan. */
    bulan: date("bulan").notNull(),
    /** Contoh: klien.catatan, klien.kategori:3, kategori.catatan */
    section: text("section").notNull(),
    body: text("body").notNull().default(""),
    updatedBy: integer("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("report_notes_uniq").on(
      t.projectId,
      t.bulan,
      t.section
    ),
  ]
);

// ============ SAVED FILTERS ============
export const savedFilters = pgTable(
  "saved_filters",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Query string URL, disimpan apa adanya. */
    query: text("query").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

// ============ DAILY REPORT DRAFTS ============
/** Draf laporan harian per pengguna dan per tanggal. */
export const dailyReportDrafts = pgTable(
  "daily_report_drafts",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportDate: date("report_date").notNull(),
    activity: text("activity").notNull().default(""),
    learned: text("learned").notNull().default(""),
    blockers: text("blockers").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.reportDate] })]
);

// ============ RELATIONS ============
// ============ RELATIONS ============
// Wajib ada supaya db.query.*.findMany({ with: {...} }) punya tipe yang benar.
export const usersRelations = relations(users, ({ many }) => ({
  bugsReported: many(bugs, { relationName: "reporter" }),
  bugsAssigned: many(bugs, { relationName: "assignee" }),
  comments: many(bugComments),
  statusChanges: many(bugStatusHistory),
  attachments: many(attachments),
  testRuns: many(testRuns),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  modules: many(modules),
  bugs: many(bugs),
  testCases: many(testCases),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  project: one(projects, {
    fields: [modules.projectId],
    references: [projects.id],
  }),
  bugs: many(bugs),
  testCases: many(testCases),
}));

export const bugsRelations = relations(bugs, ({ one, many }) => ({
  project: one(projects, {
    fields: [bugs.projectId],
    references: [projects.id],
  }),
  module: one(modules, {
    fields: [bugs.moduleId],
    references: [modules.id],
  }),
  category: one(bugCategories, {
    fields: [bugs.categoryId],
    references: [bugCategories.id],
  }),
  reporter: one(users, {
    fields: [bugs.reporterId],
    references: [users.id],
    relationName: "reporter",
  }),
  assignee: one(users, {
    fields: [bugs.assigneeId],
    references: [users.id],
    relationName: "assignee",
  }),
  history: many(bugStatusHistory),
  comments: many(bugComments),
  attachments: many(attachments),
  testRuns: many(testRuns),
}));

export const bugStatusHistoryRelations = relations(
  bugStatusHistory,
  ({ one }) => ({
    bug: one(bugs, {
      fields: [bugStatusHistory.bugId],
      references: [bugs.id],
    }),
    changedBy: one(users, {
      fields: [bugStatusHistory.changedBy],
      references: [users.id],
    }),
  })
);

export const bugCommentsRelations = relations(bugComments, ({ one }) => ({
  bug: one(bugs, {
    fields: [bugComments.bugId],
    references: [bugs.id],
  }),
  user: one(users, {
    fields: [bugComments.userId],
    references: [users.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  bug: one(bugs, {
    fields: [attachments.bugId],
    references: [bugs.id],
  }),
  uploadedBy: one(users, {
    fields: [attachments.uploadedBy],
    references: [users.id],
  }),
}));

export const testCasesRelations = relations(testCases, ({ one, many }) => ({
  project: one(projects, {
    fields: [testCases.projectId],
    references: [projects.id],
  }),
  module: one(modules, {
    fields: [testCases.moduleId],
    references: [modules.id],
  }),
  runs: many(testRuns),
}));

export const testRunsRelations = relations(testRuns, ({ one }) => ({
  testCase: one(testCases, {
    fields: [testRuns.testCaseId],
    references: [testCases.id],
  }),
  bug: one(bugs, {
    fields: [testRuns.bugId],
    references: [bugs.id],
  }),
  runBy: one(users, {
    fields: [testRuns.runBy],
    references: [users.id],
  }),
}));

export const bugCategoriesRelations = relations(
  bugCategories,
  ({ many }) => ({
    bugs: many(bugs),
  })
);

export const scopeRequestsRelations = relations(
  scopeRequests,
  ({ one }) => ({
    project: one(projects, {
      fields: [scopeRequests.projectId],
      references: [projects.id],
    }),
    bug: one(bugs, {
      fields: [scopeRequests.bugId],
      references: [bugs.id],
    }),
    createdBy: one(users, {
      fields: [scopeRequests.createdBy],
      references: [users.id],
    }),
  })
);

export const savedFiltersRelations = relations(savedFilters, ({ one }) => ({
  user: one(users, {
    fields: [savedFilters.userId],
    references: [users.id],
  }),
}));

// ============ TYPES ============
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type Module = typeof modules.$inferSelect;
export type Bug = typeof bugs.$inferSelect;
export type NewBug = typeof bugs.$inferInsert;
export type BugStatusHistory = typeof bugStatusHistory.$inferSelect;
export type BugComment = typeof bugComments.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type TestCase = typeof testCases.$inferSelect;
export type TestRun = typeof testRuns.$inferSelect;

export type BugStatus =
  | "baru"
  | "dikonfirmasi"
  | "diperbaiki"
  | "retest"
  | "selesai"
  | "ditolak"
  | "dibuka_ulang";

export type BugSeverity = "kritis" | "tinggi" | "sedang" | "rendah";
export type UserRole = "admin" | "tester" | "developer";

/** Tipe item untuk laporan bulanan; hanya "bug" yang dihitung sebagai bug. */
export type BugItemType =
  | "bug"
  | "operational"
  | "penambahan"
  | "penyesuaian"
  | "new_item";

export type ScopeType = "new_requirement" | "enhancement";
export type ScopePosition = "dalam_phase" | "luar_phase";
export type ScopeStatus = "dibahas" | "disetujui" | "dikerjakan" | "selesai" | "ditolak";
