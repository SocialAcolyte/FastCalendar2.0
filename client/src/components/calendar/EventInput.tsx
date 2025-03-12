import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function EventInput() {
  const [inputText, setInputText] = useState("");
  const { toast } = useToast();

  const analyzeEventMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/analyze-event", { text });
      return res.json();
    },
    onSuccess: async (data) => {
      try {
        await createEventMutation.mutateAsync({
          title: data.suggestedTitle,
          start: new Date(data.suggestedTime.start),
          end: new Date(data.suggestedTime.end),
          category: data.category,
        });
        setInputText("");
        toast({
          title: "Event created",
          description: "Successfully added event to calendar",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create event",
          variant: "destructive",
        });
      }
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (event: any) => {
      const res = await apiRequest("POST", "/api/events", event);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    analyzeEventMutation.mutate(inputText);
  };

  const examples = [
    "Lunch with John tomorrow at 12:30 PM for 1 hour",
    "Weekly team meeting every Monday at 10 AM for 1 hour",
    "Dentist appointment next Tuesday at 2 PM",
    "Vacation from July 1st to July 15th",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Add Events</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter event details naturally, e.g., 'Lunch with John tomorrow at 12:30 PM for 1 hour'"
            className="min-h-[100px]"
          />
          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={analyzeEventMutation.isPending || !inputText.trim()}
          >
            {analyzeEventMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Add Event"
            )}
          </Button>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Examples:</p>
            <div className="grid gap-2">
              {examples.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start"
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
