import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { analyzeEventText, parseMultipleEvents, suggestEvents } from "./ai";
import { eventValidationSchema } from "@shared/schema";

interface ExtendedWebSocket extends WebSocket {
  userId?: number;
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/socket' });

  // Broadcast event updates to all connected clients
  function broadcastEvents(userId: number) {
    wss.clients.forEach((client: ExtendedWebSocket) => {
      if (client.readyState === WebSocket.OPEN && client.userId === userId) {
        storage.getEvents(userId).then(events => {
          client.send(JSON.stringify({ type: 'events', data: events }));
        });
      }
    });
  }

  // WebSocket connection handling
  wss.on('connection', (ws: ExtendedWebSocket) => {
    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'auth') {
          ws.userId = data.userId;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });
  });

  // Event routes
  app.get("/api/events", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const events = await storage.getEvents(req.user.id);
      res.json(events);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/events/batch", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      console.log('Batch creating events, input:', req.body.text);

      // Parse events with today's date
      const parsedEvents = await parseMultipleEvents(req.body.text);
      console.log('Parsed events:', parsedEvents);

      // Create all events
      const createdEvents = await Promise.all(
        parsedEvents.map(event =>
          storage.createEvent({
            ...event,
            user_id: req.user.id,
            start: new Date(event.start),
            end: new Date(event.end),
            color: "#3788d8",
            recurring: false,
            recurrence_pattern: null,
            shared_with: []
          })
        )
      );

      console.log('Created events:', createdEvents);
      broadcastEvents(req.user.id);
      res.status(201).json(createdEvents);
    } catch (err) {
      console.error('Failed to create batch events:', err);
      next(err);
    }
  });

  app.patch("/api/events/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const event = await storage.getEvent(parseInt(req.params.id));
      if (!event || event.user_id !== req.user.id) {
        return res.status(404).json({ message: "Event not found" });
      }

      const updatedEvent = await storage.updateEvent(event.id, {
        ...req.body,
        start: req.body.start ? new Date(req.body.start) : undefined,
        end: req.body.end ? new Date(req.body.end) : undefined,
      });
      broadcastEvents(req.user.id);
      res.json(updatedEvent);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/events/:id", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const event = await storage.getEvent(parseInt(req.params.id));
      if (!event || event.user_id !== req.user.id) {
        return res.status(404).json({ message: "Event not found" });
      }

      await storage.deleteEvent(event.id);
      broadcastEvents(req.user.id);
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  });

  return httpServer;
}