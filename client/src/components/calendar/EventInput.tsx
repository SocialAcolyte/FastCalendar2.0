import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function EventInput() {
  const [inputText, setInputText] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const batchCreateEventsMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user) {
        throw new Error("Please log in to create events");
      }
      const res = await apiRequest("POST", "/api/events/batch", { text });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setInputText("");
      toast({
        title: "Events created",
        description: "Successfully added events to calendar",
      });
    },
    onError: (error: Error) => {
      if (error.message.includes("Not authenticated")) {
        setLocation("/auth");
        toast({
          title: "Authentication required",
          description: "Please log in to create events",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    batchCreateEventsMutation.mutate(inputText);
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