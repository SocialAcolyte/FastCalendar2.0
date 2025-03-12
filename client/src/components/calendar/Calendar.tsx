import { useCallback, useEffect, useState } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMinutes } from "date-fns";
import { enUS } from "date-fns/locale";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Event } from "@shared/schema";
import { useWebSocket } from "@/lib/websocket";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

const views: View[] = ["month", "week", "day", "agenda"];

interface EventDialogProps {
  event: Partial<Event> | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Partial<Event>) => void;
  onDelete?: () => void;
}

function EventDialog({ event, isOpen, onClose, onSubmit, onDelete }: EventDialogProps) {
  const [title, setTitle] = useState(event?.title || "");
  const [start, setStart] = useState(
    event?.start ? format(new Date(event.start), "yyyy-MM-dd'T'HH:mm") : ""
  );
  const [end, setEnd] = useState(
    event?.end ? format(new Date(event.end), "yyyy-MM-dd'T'HH:mm") : ""
  );
  const [color, setColor] = useState(event?.color || "#3788d8");
  const [category, setCategory] = useState(event?.category || "");

  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setStart(event.start ? format(new Date(event.start), "yyyy-MM-dd'T'HH:mm") : "");
      setEnd(event.end ? format(new Date(event.end), "yyyy-MM-dd'T'HH:mm") : "");
      setColor(event.color || "#3788d8");
      setCategory(event.category || "");
    }
  }, [event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...event,
      title,
      start: new Date(start),
      end: new Date(end),
      color,
      category,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{event?.id ? "Edit Event" : "New Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Start</label>
            <Input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">End</label>
            <Input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Category</label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Work, Personal, etc."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Color</label>
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            {event?.id && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
              >
                Delete
              </Button>
            )}
            <Button type="submit">
              {event?.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CalendarComponent() {
  const [selectedEvent, setSelectedEvent] = useState<Partial<Event> | null>(null);
  const [view, setView] = useState<View>("month");
  const { user } = useAuth();
  const { toast } = useToast();
  const socket = useWebSocket((state) => state.socket);
  const connect = useWebSocket((state) => state.connect);

  useEffect(() => {
    if (user) {
      connect(user.id);
    }
  }, [user, connect]);

  useEffect(() => {
    if (socket) {
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "events") {
          queryClient.setQueryData(["/api/events"], data.data);
        }
      };
    }
  }, [socket]);

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createEventMutation = useMutation({
    mutationFn: async (event: Partial<Event>) => {
      const res = await apiRequest("POST", "/api/events", event);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event created successfully" });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (event: Partial<Event>) => {
      const res = await apiRequest("PATCH", `/api/events/${event.id}`, event);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event updated successfully" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event deleted successfully" });
    },
  });

  const handleEventSubmit = async (event: Partial<Event>) => {
    try {
      if (event.id) {
        await updateEventMutation.mutateAsync(event);
      } else {
        await createEventMutation.mutateAsync(event);
      }
      setSelectedEvent(null);
    } catch (error) {
      console.error("Failed to save event:", error);
    }
  };

  const handleEventDelete = async () => {
    if (selectedEvent?.id) {
      try {
        await deleteEventMutation.mutateAsync(selectedEvent.id);
        setSelectedEvent(null);
      } catch (error) {
        console.error("Failed to delete event:", error);
      }
    }
  };

  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      // For clicks/selections on month view, set a default duration
      if (view === "month") {
        end = addMinutes(start, 60);
      }
      setSelectedEvent({ start, end });
    },
    [view]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-4">
        <div className="flex gap-2">
          {views.map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "outline"}
              onClick={() => setView(v)}
              size="sm"
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      <div className="h-[calc(100vh-280px)]">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          views={views}
          onView={setView}
          onSelectEvent={(event) => setSelectedEvent(event)}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={(event: Event) => ({
            style: {
              backgroundColor: event.color || "#3788d8",
              borderRadius: "4px",
              border: "none",
              padding: "2px 4px",
            },
          })}
          dayPropGetter={(date) => ({
            style: {
              backgroundColor: 'transparent',
            },
          })}
        />
      </div>
      <EventDialog
        event={selectedEvent}
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        onSubmit={handleEventSubmit}
        onDelete={handleEventDelete}
      />
    </Card>
  );
}