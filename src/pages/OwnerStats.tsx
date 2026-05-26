import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Music, MousePointerClick, Star } from "lucide-react";

interface LogEntry {
  timestamp: string;
  owner_email?: string;
  button: number;
  soundfile: string;
}

export default function OwnerStats() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const ownerEmail = localStorage.getItem("parrot_owner_email") || "";

  const loadLogs = async () => {
    const res = await fetch("/api/logs");
    const data = await res.json();
    const allLogs: LogEntry[] = data.logs || [];

    setLogs(
      allLogs.filter(
        (log) =>
          String(log.owner_email || "").toLowerCase() === ownerEmail.toLowerCase()
      )
    );
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const totalPresses = logs.length;

  const topSounds = useMemo(() => {
    const counts = new Map<string, number>();

    logs.forEach((log) => {
      const sound = log.soundfile || "Unassigned";
      counts.set(sound, (counts.get(sound) || 0) + 1);
    });

    return [...counts.entries()]
      .map(([name, plays]) => ({ name, plays }))
      .sort((a, b) => b.plays - a.plays);
  }, [logs]);

  const buttonStats = useMemo(() => {
    const counts = new Map<number, number>();
    [1, 2, 3, 4].forEach((button) => counts.set(button, 0));

    logs.forEach((log) => {
      counts.set(log.button, (counts.get(log.button) || 0) + 1);
    });

    return [...counts.entries()].map(([button, presses]) => ({
      button: `Button ${button}`,
      presses,
    }));
  }, [logs]);

  const favoriteSound = topSounds[0]?.name || "No data yet";

  if (!ownerEmail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Parrot Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please save your owner profile first. Your email is needed to show only your parrot&apos;s statistics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Parrot Stats</h1>
        <p className="text-muted-foreground mt-1">
          Statistics only for the parrot registered with: {ownerEmail}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <MousePointerClick className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Presses</p>
              <p className="text-2xl font-bold">{totalPresses}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <Star className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Favorite Sound</p>
              <p className="text-lg font-bold truncate">{favoriteSound}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <Music className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Different Sounds Played</p>
              <p className="text-2xl font-bold">{topSounds.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Button Presses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={buttonStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="button" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="presses" fill="hsl(201, 96%, 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sounds Played</CardTitle>
        </CardHeader>
        <CardContent>
          {topSounds.length === 0 ? (
            <p className="text-muted-foreground">No button presses yet.</p>
          ) : (
            <div className="space-y-2">
              {topSounds.map((sound) => (
                <div key={sound.name} className="flex justify-between border-b py-2 text-sm">
                  <span>{sound.name}</span>
                  <span>{sound.plays} plays</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}