import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { differenceInWeeks, format, addYears, isValid } from "date-fns";
import { motion } from "framer-motion";

const lifespanOptions = {
  unhealthy: 65,
  healthy: 80,
  bryan: 130,
};

interface TimelineProps {
  birthdate: string;
  lifespanOption: keyof typeof lifespanOptions;
}

function Timeline({ birthdate, lifespanOption }: TimelineProps) {
  const birthdayDate = new Date(birthdate);
  const now = new Date();
  const totalWeeks = differenceInWeeks(
    addYears(birthdayDate, lifespanOptions[lifespanOption]),
    birthdayDate
  );
  const passedWeeks = differenceInWeeks(now, birthdayDate);

  const rows = Math.ceil(totalWeeks / 52);
  const itemSize = 8;
  const gap = 2;
  const itemsPerRow = 52;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        width={itemsPerRow * (itemSize + gap)}
        height={rows * (itemSize + gap)}
        className="mx-auto"
      >
        {Array.from({ length: totalWeeks }).map((_, i) => {
          const row = Math.floor(i / itemsPerRow);
          const col = i % itemsPerRow;
          const isPassed = i < passedWeeks;

          return (
            <motion.rect
              key={i}
              x={col * (itemSize + gap)}
              y={row * (itemSize + gap)}
              width={itemSize}
              height={itemSize}
              rx={2}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.001 }}
              className={`${
                isPassed ? "fill-primary/30" : "fill-primary"
              } cursor-pointer hover:opacity-80`}
            />
          );
        })}
      </svg>
    </div>
  );
}

function LifeStats({ birthdate, lifespanOption }: TimelineProps) {
  const birthdayDate = new Date(birthdate);
  const now = new Date();
  const totalWeeks = differenceInWeeks(
    addYears(birthdayDate, lifespanOptions[lifespanOption]),
    birthdayDate
  );
  const passedWeeks = differenceInWeeks(now, birthdayDate);
  const remainingWeeks = totalWeeks - passedWeeks;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="text-center">
        <div className="text-2xl font-bold">{passedWeeks}</div>
        <div className="text-sm text-muted-foreground">Weeks Passed</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold">{remainingWeeks}</div>
        <div className="text-sm text-muted-foreground">Weeks Remaining</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold">{totalWeeks}</div>
        <div className="text-sm text-muted-foreground">Total Weeks</div>
      </div>
    </div>
  );
}

export default function LifeTimeline() {
  const { user, updateUserMutation } = useAuth();
  const [birthdate, setBirthdate] = useState(user?.birthdate || "");
  const [lifespanOption, setLifespanOption] = useState<keyof typeof lifespanOptions>(
    (user?.lifespan_option as keyof typeof lifespanOptions) || "healthy"
  );

  useEffect(() => {
    if (user?.birthdate) setBirthdate(user.birthdate);
    if (user?.lifespan_option) setLifespanOption(user.lifespan_option as keyof typeof lifespanOptions);
  }, [user]);

  const handleSave = () => {
    updateUserMutation.mutate({
      birthdate,
      lifespan_option: lifespanOption,
    });
  };

  const isValidDate = birthdate && isValid(new Date(birthdate));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Life Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Birthdate</label>
              <Input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Lifespan Scenario</label>
              <Select
                value={lifespanOption}
                onValueChange={(value: keyof typeof lifespanOptions) =>
                  setLifespanOption(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unhealthy">Unhealthy (65 years)</SelectItem>
                  <SelectItem value="healthy">Healthy (80 years)</SelectItem>
                  <SelectItem value="bryan">Longevity (130 years)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!isValidDate || updateUserMutation.isPending}
            className="w-full"
          >
            {updateUserMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>

          {isValidDate ? (
            <>
              <LifeStats birthdate={birthdate} lifespanOption={lifespanOption} />
              <Timeline birthdate={birthdate} lifespanOption={lifespanOption} />
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Please enter your birthdate to view the timeline
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
