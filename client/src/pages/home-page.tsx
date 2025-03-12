import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import Calendar from "@/components/calendar/Calendar";
import EventInput from "@/components/calendar/EventInput";
import LifeTimeline from "@/components/life/LifeTimeline";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Smart Calendar</h1>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              Welcome, {user?.username}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Event Input */}
          <div className="space-y-6">
            <EventInput />
            <LifeTimeline />
          </div>

          {/* Main Calendar Area */}
          <div className="lg:col-span-2">
            <Calendar />
          </div>
        </div>
      </div>
    </div>
  );
}