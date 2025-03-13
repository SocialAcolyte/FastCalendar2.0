import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGuestStorage } from "@/hooks/use-guest-storage";

export default function EventInput() {
  const [inputText, setInputText] = useState("");
  const { toast } = useToast();
  const { user, isGuest } = useAuth();
  const { createEvent } = useGuestStorage();

  const parseEvents = (text: string) => {
    return text.split(';').map(eventText => {
      const matches = eventText.trim().match(/^(.+?)(\d{1,2}:\d{2}\s*(?:am|pm)-\d{1,2}:\d{2}\s*(?:am|pm))$/i);

      if (!matches) {
        throw new Error(`Invalid format for event: "${eventText.trim()}". Expected format: "Event Title 9:00 am-10:00 am"`);
      }

      const [_, title, timeRange] = matches;
      const [startTime, endTime] = timeRange.split('-').map(t => t.trim());

      const parseTime = (timeStr: string) => {
        const [time, period] = timeStr.toLowerCase().match(/(\d{1,2}:\d{2})\s*(am|pm)/)?.slice(1) || [];
        if (!time || !period) {
          throw new Error(`Invalid time format: "${timeStr}". Expected format: "9:00 am" or "9:00 pm"`);
        }

        const [hours, minutes] = time.split(':').map(Number);
        const date = new Date();

        let adjustedHours = hours;
        if (period === 'pm' && hours !== 12) {
          adjustedHours += 12;
        } else if (period === 'am' && hours === 12) {
          adjustedHours = 0;
        }

        date.setHours(adjustedHours, minutes || 0, 0, 0);
        return date;
      };

      const start = parseTime(startTime);
      const end = parseTime(endTime);

      if (end <= start) {
        throw new Error(`End time must be after start time for event: "${eventText.trim()}"`);
      }

      return {
        title: title.trim(),
        start,
        end,
        user_id: user?.id || -1,
        color: "#3788d8",
        recurring: false,
        recurrence_pattern: null,
        category: null,
        shared_with: []
      };
    });
  };

  const batchCreateEventsMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/events/batch", { text });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setInputText("");
      toast({
        title: "Success",
        description: "Events added to calendar",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!inputText.trim()) return;

    try {
      const events = parseEvents(inputText);

      // Optimistically update the UI
      queryClient.setQueryData(["/api/events"], (old: any[] = []) => [...old, ...events]);

      // Handle guest mode
      if (isGuest) {
        events.forEach(event => {
          createEvent(event);
        });
        setInputText("");
        toast({
          title: "Success",
          description: "Events added to calendar",
        });
        return;
      }

      // Handle authenticated mode
      batchCreateEventsMutation.mutate(inputText);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const examples = [
    "Team Meeting 9:30 am-10:30 am; Lunch Break 12:00 pm-1:00 pm",
    "Morning Workout 6:00 am-7:00 am; Daily Standup 9:00 am-9:30 am",
    "Project Review 2:00 pm-3:00 pm; Coffee Break 3:15 pm-3:30 pm",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Add Events
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() =>
              toast({
                title: "Input Format",
                description:
                  "Enter events separated by semicolons. Format: 'Event Title HH:MM am/pm-HH:MM am/pm'. Example: 'Meeting 9:00 am-10:00 am; Lunch 12:00 pm-1:00 pm'",
              })
            }
          >
            <Info className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter events separated by semicolons. Example: 'Meeting 9:00 am-10:00 am; Lunch 12:00 pm-1:00 pm'"
            className="min-h-[100px] font-mono"
          />
          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={batchCreateEventsMutation.isPending || !inputText.trim()}
          >
            {batchCreateEventsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Add Events"
            )}
          </Button>

          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Examples:</p>
            <div className="grid gap-2">
              {examples.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start text-left h-auto whitespace-normal"
                  onClick={() => setInputText(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}