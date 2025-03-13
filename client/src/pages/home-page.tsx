import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import Calendar from "@/components/calendar/Calendar";
import EventInput from "@/components/calendar/EventInput";
import LifeTimeline from "@/components/life/LifeTimeline";
import { Button } from "@/components/ui/button";
import { LogOut, Sun, Moon, Save } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { useGuestStorage } from "@/hooks/use-guest-storage";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function HomePage() {
  const { user, logoutMutation, isGuest, updateUserMutation } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { pendingChanges, clearPendingChanges } = useGuestStorage();

  // Sync mutation for saving all pending changes
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!user && !isGuest) return;

      const responses = [];

      // Sync events if there are pending changes
      if (pendingChanges.events.length > 0) {
        for (const event of pendingChanges.events) {
          try {
            const res = await apiRequest("POST", "/api/events", event);
            responses.push(await res.json());
          } catch (error) {
            console.error("Failed to sync event:", error);
            throw error;
          }
        }
      }

      // Sync user settings if there are pending changes
      if (pendingChanges.userSettings && !isGuest) {
        try {
          await updateUserMutation.mutateAsync(pendingChanges.userSettings);
        } catch (error) {
          console.error("Failed to sync user settings:", error);
          throw error;
        }
      }

      return responses;
    },
    onSuccess: () => {
      clearPendingChanges();
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "All changes saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to save changes: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Handle save button click
  const handleSave = () => {
    if (isGuest) {
      toast({
        title: "Success",
        description: "Changes saved locally",
      });
      return;
    }
    syncMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Smart Calendar</h1>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={syncMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {syncMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <span className="text-muted-foreground hidden md:inline">
              Welcome, {user?.username || "Guest"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isGuest ? "Exit Guest Mode" : "Logout"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Event Input and Life Timeline */}
          <div className="lg:order-2 space-y-6">
            <EventInput />
            <LifeTimeline />
          </div>

          {/* Main Calendar Area */}
          <div className="lg:col-span-2 lg:order-1">
            <Calendar />
          </div>
        </div>
      </div>
    </div>
  );
}