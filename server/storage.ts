import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, events, type User, type Event, type InsertUser, type InsertEvent } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;

  getEvents(userId: number): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent & { user_id: number }): Promise<Event>;
  updateEvent(id: number, data: Partial<Event>): Promise<Event>;
  deleteEvent(id: number): Promise<void>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getEvents(userId: number): Promise<Event[]> {
    try {
      const userEvents = await db
        .select()
        .from(events)
        .where(eq(events.user_id, userId));

      return userEvents.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
      }));
    } catch (error) {
      console.error('Failed to get events:', error);
      throw new Error('Failed to fetch events');
    }
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, id));
    return event ? {
      ...event,
      start: new Date(event.start),
      end: new Date(event.end)
    } : undefined;
  }

  async createEvent(event: InsertEvent & { user_id: number }): Promise<Event> {
    try {
      console.log('Creating event:', {
        ...event,
        start: new Date(event.start).toISOString(),
        end: new Date(event.end).toISOString()
      });

      const [createdEvent] = await db
        .insert(events)
        .values({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
          color: event.color || "#3788d8",
          recurring: event.recurring || false,
          shared_with: event.shared_with || [],
        })
        .returning();

      console.log('Created event:', createdEvent);
      return {
        ...createdEvent,
        start: new Date(createdEvent.start),
        end: new Date(createdEvent.end)
      };
    } catch (error) {
      console.error('Failed to create event:', error);
      throw new Error('Failed to create event');
    }
  }

  async updateEvent(id: number, data: Partial<Event>): Promise<Event> {
    const [event] = await db
      .update(events)
      .set({
        ...data,
        start: data.start ? new Date(data.start) : undefined,
        end: data.end ? new Date(data.end) : undefined,
      })
      .where(eq(events.id, id))
      .returning();
    return {
      ...event,
      start: new Date(event.start),
      end: new Date(event.end)
    };
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }
}

export const storage = new DatabaseStorage();