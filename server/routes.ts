import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { eventValidationSchema } from "@shared/schema";

interface ExtendedWebSocket extends WebSocket {
  userId?: number;
}

// Middleware to ensure authentication
function requireAuth(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (!req.isAuthenticated()) {
    console.log('Authentication failed for route:', req.path);
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/socket' });

  function broadcastEvents(userId: number) {
    wss.clients.forEach((client: ExtendedWebSocket) => {
      if (client.readyState === WebSocket.OPEN && client.userId === userId) {
        storage.getEvents(userId).then(events => {
          client.send(JSON.stringify({ type: 'events', data: events }));
        });
      }
    });
  }

  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('WebSocket connection established');
    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'auth') {
          ws.userId = data.userId;
          console.log('WebSocket authenticated for user:', data.userId);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });
  });

  // Get all events for the authenticated user
  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      console.log('Fetching events for user:', req.user.id);
      const events = await storage.getEvents(req.user.id);
      res.json(events);
    } catch (error) {
      console.error('Failed to get events:', error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Create a single event
  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      console.log('Creating event for user:', req.user.id, 'with data:', req.body);
      const event = await storage.createEvent({
        ...req.body,
        user_id: req.user.id,
        start: new Date(req.body.start),
        end: new Date(req.body.end),
        color: req.body.color || "#3788d8",
        recurring: false,
        category: req.body.category || null,
        shared_with: []
      });

      console.log('Event created successfully:', event);
      broadcastEvents(req.user.id);
      res.status(201).json(event);
    } catch (error) {
      console.error('Failed to create event:', error);
      res.status(400).json({ message: "Failed to create event: " + (error as Error).message });
    }
  });

  // Create multiple events from text input
  app.post("/api/events/batch", requireAuth, async (req, res) => {
    try {
      console.log('Processing batch events for user:', req.user.id);
      const events = req.body.text.split(';').map((eventText: string) => {
        const [title, timeRange] = eventText.trim().split(/\s+(?=\d)/);
        const [startTime, endTime] = timeRange.split('-');

        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.trim().split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          const date = new Date();
          date.setHours(
            period.toLowerCase() === 'pm' && hours !== 12 ? hours + 12 : hours,
            minutes || 0
          );
          return date;
        };

        return {
          title: title.trim(),
          start: parseTime(startTime),
          end: parseTime(endTime),
          user_id: req.user.id,
          color: "#3788d8",
          recurring: false,
          shared_with: []
        };
      });

      console.log('Creating batch events:', events);
      const createdEvents = await Promise.all(
        events.map((event: any) => storage.createEvent(event))
      );

      console.log('Batch events created successfully');
      broadcastEvents(req.user.id);
      res.status(201).json(createdEvents);
    } catch (error) {
      console.error('Failed to create batch events:', error);
      res.status(400).json({ 
        message: "Failed to create events. Please use the format: 'Event Title 9:00 am-10:00 am'" 
      });
    }
  });

  // Update an event
  app.patch("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const event = await storage.getEvent(parseInt(req.params.id));
      if (!event || event.user_id !== req.user.id) {
        return res.status(404).json({ message: "Event not found" });
      }

      console.log('Updating event:', req.params.id, 'with data:', req.body);
      const updatedEvent = await storage.updateEvent(event.id, {
        ...req.body,
        start: req.body.start ? new Date(req.body.start) : undefined,
        end: req.body.end ? new Date(req.body.end) : undefined,
      });

      console.log('Event updated successfully');
      broadcastEvents(req.user.id);
      res.json(updatedEvent);
    } catch (error) {
      console.error('Failed to update event:', error);
      res.status(400).json({ message: "Failed to update event" });
    }
  });

  // Delete an event
  app.delete("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const event = await storage.getEvent(parseInt(req.params.id));
      if (!event || event.user_id !== req.user.id) {
        return res.status(404).json({ message: "Event not found" });
      }

      console.log('Deleting event:', req.params.id);
      await storage.deleteEvent(event.id);
      console.log('Event deleted successfully');
      broadcastEvents(req.user.id);
      res.sendStatus(204);
    } catch (error) {
      console.error('Failed to delete event:', error);
      res.status(400).json({ message: "Failed to delete event" });
    }
  });

  return httpServer;
}