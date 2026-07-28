import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull().default("Other"),
  content: text("content"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTemplateSchema = createInsertSchema(templatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templatesTable.$inferSelect;
