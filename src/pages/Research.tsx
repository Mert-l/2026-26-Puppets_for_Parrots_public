import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { Download, Music, MousePointerClick, Star, RefreshCw } from "lucide-react";

interface LogEntry {
  timestamp: number;
  button: number;
  soundfile: string;
}

const buttonColors: Record<number, string> = {
  1: "hsl(201, 96%, 39%)",
  2: "hsl(199, 92%, 61%)",
  3: "hsl(215, 25%, 34%)",
  4: "hsl(210, 20%, 60%)",
};

function exportCSV(logs: LogEntry[]) {
  const headers = ["timestamp", "datetime", "button", "soundfile"];
  const rows = logs.map((d) => [d.timestamp, new Date(d.timestamp * 1000).toISOString(), d.button, d.soundfile].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "parrot-button-press-log.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Research() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const loadLogs = async () => {
    const res = await fetch("/api/logs");
    const data = await res.json();
    setLogs(data.logs || []);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const totalPresses = logs.length;

  const topSongs = useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((l) => counts.set(l.soundfile || "Unassigned", (counts.get(l.soundfile || "Unassigned") || 0) + 1));
    return [...counts.entries()].map(([name, plays]) => ({ name, plays })).sort((a, b) => b.plays - a.plays).slice(0, 5);
  }, [logs]);

  const buttonDist = useMemo(() => {
    const counts = new Map<number, number>();
    [1, 2, 3, 4].forEach((id) => counts.set(id, 0));
    logs.forEach((l) => counts.set(l.button, (counts.get(l.button) || 0) + 1));
    return [...counts.entries()].map(([button, value]) => ({ name: `Button ${button}`, value, color: buttonColors[button] }));
  }, [logs]);

  const dailyPresses = useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((l) => {
      const day = new Date(l.timestamp * 1000).toLocaleDateString(undefined, { weekday: "short" });
      counts.set(day, (counts.get(day) || 0) + 1);
    });
    return [...counts.entries()].map(([date, presses]) => ({ date, presses }));
  }, [logs]);

  const hourlyPattern = useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((l) => {
      const hour = new Date(l.timestamp * 1000).toLocaleTimeString(undefined, { hour: "2-digit", hour12: false });
      counts.set(hour, (counts.get(hour) || 0) + 1);
    });
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([hour, presses]) => ({ hour, presses }));
  }, [logs]);

  const favoriteSong = topSongs[0]?.name || "No data yet";
  const songsAssigned = new Set(logs.map((l) => l.soundfile).filter(Boolean)).size;

  const activityStats = [
    { label: "Total Button Presses", value: String(totalPresses), icon: MousePointerClick },
    { label: "Favorite Sound", value: favoriteSong, icon: Star },
    { label: "Sounds Played", value: String(songsAssigned), icon: Music },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Research Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real button-press data from the Arduino/API log.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadLogs}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
          <Button size="sm" onClick={() => exportCSV(logs)}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activityStats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <s.icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold truncate max-w-64">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {logs.length === 0 && <Card><CardContent className="pt-6 text-sm text-muted-foreground">No button presses logged yet. Go to Device Configuration and click a device button, or connect the Arduino and press a real button.</CardContent></Card>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Sounds</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topSongs} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 89%)" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={75} />
                <Tooltip />
                <Bar dataKey="plays" fill="hsl(201, 96%, 39%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Button Press Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={buttonDist} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {buttonDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Daily Button Presses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dailyPresses}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 89%)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="presses" stroke="hsl(201, 96%, 39%)" fill="hsl(199, 92%, 61%)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Time-of-Day Patterns</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hourlyPattern}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 89%)" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="presses" fill="hsl(199, 92%, 61%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
