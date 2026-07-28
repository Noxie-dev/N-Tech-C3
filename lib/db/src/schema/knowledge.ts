import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const knowledgeTable = pgTable("knowledge", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  category: text("category"),
  tags: text("tags").array().notNull().default([]),
  linkedPageIds: text("linked_page_ids").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertKnowledgeSchema = createInsertSchema(knowledgeTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKnowledge = z.infer<typeof insertKnowledgeSchema>;
export type KnowledgePage = typeof knowledgeTable.$inferSelect;
