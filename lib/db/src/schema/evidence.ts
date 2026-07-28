import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const evidenceTable = pgTable("evidence", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull().default("Other"),
  source: text("source"),
  notes: text("notes"),
  content: text("content"),
  tags: text("tags").array().notNull().default([]),
  storyId: integer("story_id"),
  projectId: integer("project_id"),
  repository: text("repository"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEvidenceSchema = createInsertSchema(evidenceTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type Evidence = typeof evidenceTable.$inferSelect;
