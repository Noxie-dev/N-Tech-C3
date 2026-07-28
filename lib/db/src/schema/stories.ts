import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const storiesTable = pgTable("stories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug"),
  summary: text("summary"),
  content: text("content"),
  status: text("status").notNull().default("Idea"),
  category: text("category"),
  priority: text("priority"),
  audience: text("audience"),
  difficulty: text("difficulty"),
  tags: text("tags").array().notNull().default([]),
  projectId: integer("project_id"),
  campaignId: integer("campaign_id"),
  evidenceScore: integer("evidence_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStorySchema = createInsertSchema(storiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof storiesTable.$inferSelect;
