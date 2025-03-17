import { Event } from "@shared/schema";
import { useCallback, useEffect, useState } from "react";

const GUEST_EVENTS_KEY = "guest_events";

export function useGuestStorage() {
  const [events, setEvents] = useState<Event[]>(() => {
    const stored = localStorage.getItem(GUEST_EVENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(GUEST_EVENTS_KEY, JSON.stringify(events));
  }, [events]);

  const createEvent = useCallback((event: Omit<Event, "id">) => {
    const newEvent = {
      ...event,
      id: Date.now(),
      user_id: -1, // Guest user ID
    };
    setEvents(prev => [...prev, newEvent]);
    return newEvent;
  }, []);

  const updateEvent = useCallback((id: number, updates: Partial<Event>) => {
    setEvents(prev => prev.map(event => 
      event.id === id ? { ...event, ...updates } : event
    ));
    return events.find(e => e.id === id);
  }, [events]);

  const deleteEvent = useCallback((id: number) => {
    setEvents(prev => prev.filter(event => event.id !== id));
  }, []);

  return {
    events,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
