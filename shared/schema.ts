import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  birthdate: text("birthdate"),
  lifespan_option: text("lifespan_option"),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  title: text("title").notNull(),
  start: timestamp("start").notNull(),
  end: timestamp("end").notNull(),
  color: text("color").default("#3788d8"),
  recurring: boolean("recurring").default(false),
  recurrence_pattern: text("recurrence_pattern"),
  category: text("category"),
  shared_with: text("shared_with").array()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  birthdate: true,
  lifespan_option: true,
});

export const insertEventSchema = createInsertSchema(events).pick({
  title: true,
  start: true, 
  end: true,
  color: true,
  recurring: true,
  recurrence_pattern: true,
  category: true,
  shared_with: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;

export const eventValidationSchema = insertEventSchema.extend({
  title: z.string().min(1, "Title is required"),
  start: z.date(),
  end: z.date(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
});
