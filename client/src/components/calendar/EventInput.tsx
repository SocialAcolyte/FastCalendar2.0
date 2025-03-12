import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info } from "lucide-react";

export default function EventInput() {
  const [inputText, setInputText] = useState("");
  const { toast } = useToast();

  const batchCreateEventsMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/events/batch", { text });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setInputText("");
      toast({
        title: "Events created",
        description: "Successfully added multiple events to calendar",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create events: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    batchCreateEventsMutation.mutate(inputText);
  };

  const examples = [
    "Gym Workout 6:00-7:00 am; Team Meeting 9:30-10:30 am; Lunch Break 12:00-1:00 pm",
    "Wake Up 5:50-5:55 am; Hydrate & Stretch 5:55-6:00 am; Exercise 6:00-6:30 am",
    "Morning Routine 7:00-7:30 am; Commute 7:30-8:00 am; Work 8:00-5:00 pm",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Batch Event Input
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() =>
              toast({
                title: "Input Format",
                description:
                  "Enter multiple events separated by semicolons. Format: 'Event Title Start-End Time'. Example: 'Meeting 9:00-10:00 am; Lunch 12:00-1:00 pm'",
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
            placeholder="Enter multiple events separated by semicolons. Example: 'Meeting 9:00-10:00 am; Lunch 12:00-1:00 pm'"
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