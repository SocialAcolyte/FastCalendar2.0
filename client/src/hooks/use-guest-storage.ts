import { Event } from "@shared/schema";
import { useCallback, useEffect, useState } from "react";

const GUEST_EVENTS_KEY = "guest_events";
const PENDING_CHANGES_KEY = "pending_changes";
const USER_SETTINGS_KEY = "guest_user_settings";

interface PendingChanges {
  events: Partial<Event>[];
  userSettings: {
    birthdate?: string;
    lifespan_option?: string;
  } | null;
}

export function useGuestStorage() {
  const [events, setEvents] = useState<Event[]>(() => {
    const stored = localStorage.getItem(GUEST_EVENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const [pendingChanges, setPendingChanges] = useState<PendingChanges>(() => {
    const stored = localStorage.getItem(PENDING_CHANGES_KEY);
    return stored ? JSON.parse(stored) : { events: [], userSettings: null };
  });

  useEffect(() => {
    localStorage.setItem(GUEST_EVENTS_KEY, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pendingChanges));
  }, [pendingChanges]);

  const createEvent = useCallback((event: Omit<Event, "id">) => {
    const newEvent = {
      ...event,
      id: Date.now(),
      user_id: -1, // Guest user ID
    };
    setEvents(prev => [...prev, newEvent]);
    setPendingChanges(prev => ({
      ...prev,
      events: [...prev.events, newEvent]
    }));
    return newEvent;
  }, []);

  const updateEvent = useCallback((id: number, updates: Partial<Event>) => {
    setEvents(prev => prev.map(event => 
      event.id === id ? { ...event, ...updates } : event
    ));
    setPendingChanges(prev => ({
      ...prev,
      events: [...prev.events, { id, ...updates }]
    }));
    return events.find(e => e.id === id);
  }, [events]);

  const deleteEvent = useCallback((id: number) => {
    setEvents(prev => prev.filter(event => event.id !== id));
  }, []);

  const updateUserSettings = useCallback((settings: { birthdate?: string; lifespan_option?: string }) => {
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
    setPendingChanges(prev => ({
      ...prev,
      userSettings: settings
    }));
  }, []);

  const clearPendingChanges = useCallback(() => {
    setPendingChanges({ events: [], userSettings: null });
  }, []);

  return {
    events,
    createEvent,
    updateEvent,
    deleteEvent,
    updateUserSettings,
    pendingChanges,
    clearPendingChanges,
  };
}