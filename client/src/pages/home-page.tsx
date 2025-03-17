import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import Calendar from "@/components/calendar/Calendar";
import EventInput from "@/components/calendar/EventInput";
import LifeTimeline from "@/components/life/LifeTimeline";
import { Button } from "@/components/ui/button";
import { LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { theme, setTheme } = useTheme();

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
            <span className="text-muted-foreground hidden md:inline">
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