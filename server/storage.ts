import session from "express-session";
import createMemoryStore from "memorystore";
import { Event, InsertEvent, InsertUser, User } from "@shared/schema";

const MemoryStore = createMemoryStore(session);

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

  sessionStore: ReturnType<typeof createMemoryStore>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private events: Map<number, Event>;
  private currentUserId: number;
  private currentEventId: number;
  sessionStore: ReturnType<typeof createMemoryStore>;

  constructor() {
    this.users = new Map();
    this.events = new Map();
    this.currentUserId = 1;
    this.currentEventId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      birthdate: insertUser.birthdate || null,
      lifespan_option: insertUser.lifespan_option || null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");
    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  async getEvents(userId: number): Promise<Event[]> {
    return Array.from(this.events.values()).filter(
      (event) => event.user_id === userId
    );
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async createEvent(event: InsertEvent & { user_id: number }): Promise<Event> {
    const id = this.currentEventId++;
    const newEvent: Event = {
      id,
      user_id: event.user_id,
      title: event.title,
      start: event.start,
      end: event.end,
      color: event.color || "#3788d8",
      recurring: event.recurring || false,
      recurrence_pattern: event.recurrence_pattern || null,
      category: event.category || null,
      shared_with: event.shared_with || null
    };
    this.events.set(id, newEvent);
    return newEvent;
  }

  async updateEvent(id: number, data: Partial<Event>): Promise<Event> {
    const event = await this.getEvent(id);
    if (!event) throw new Error("Event not found");
    const updated = { ...event, ...data };
    this.events.set(id, updated);
    return updated;
  }

  async deleteEvent(id: number): Promise<void> {
    this.events.delete(id);
  }
}

export const storage = new MemStorage();