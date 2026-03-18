import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { Download, Music, MousePointerClick, Star } from "lucide-react";

const topSongs = [
  { name: "Tropical Sunrise", plays: 342 },
  { name: "Rainforest Beats", plays: 287 },
  { name: "Ocean Waves", plays: 234 },
  { name: "Morning Chirps", plays: 198 },
  { name: "Jazz Feathers", plays: 156 },
];

const buttonDist = [
  { name: "Button 1", value: 35, color: "hsl(201, 96%, 39%)" },
  { name: "Button 2", value: 28, color: "hsl(199, 92%, 61%)" },
  { name: "Button 3", value: 22, color: "hsl(215, 25%, 34%)" },
  { name: "Button 4", value: 15, color: "hsl(210, 20%, 60%)" },
];

const dailyPresses = [
  { date: "Mon", presses: 45 }, { date: "Tue", presses: 62 },
  { date: "Wed", presses: 38 }, { date: "Thu", presses: 71 },
  { date: "Fri", presses: 55 }, { date: "Sat", presses: 84 },
  { date: "Sun", presses: 67 },
];

const hourlyPattern = [
  { hour: "6am", presses: 8 }, { hour: "8am", presses: 22 },
  { hour: "10am", presses: 35 }, { hour: "12pm", presses: 28 },
  { hour: "2pm", presses: 42 }, { hour: "4pm", presses: 38 },
  { hour: "6pm", presses: 18 }, { hour: "8pm", presses: 5 },
];

const activityStats = [
  { label: "Total Button Presses", value: "1,247", icon: MousePointerClick },
  { label: "Favorite Song", value: "Tropical Sunrise", icon: Star },
  { label: "Songs Assigned", value: "4", icon: Music },
];

const dataset = [
  { id: "ANO-001", species: "African Grey", country: "US", presses: 1247, topSong: "Tropical Sunrise", days: 72 },
  { id: "ANO-002", species: "Cockatoo", country: "AU", presses: 892, topSong: "Ocean Waves", days: 45 },
  { id: "ANO-003", species: "Macaw", country: "BR", presses: 1583, topSong: "Samba Rhythms", days: 90 },
  { id: "ANO-004", species: "African Grey", country: "UK", presses: 634, topSong: "Classical Piano", days: 30 },
  { id: "ANO-005", species: "Cockatiel", country: "US", presses: 2105, topSong: "Jazz Feathers", days: 120 },
  { id: "ANO-006", species: "Macaw", country: "MX", presses: 478, topSong: "Rainforest Beats", days: 21 },
  { id: "ANO-007", species: "Budgerigar", country: "AU", presses: 1891, topSong: "Morning Chirps", days: 85 },
  { id: "ANO-008", species: "African Grey", country: "DE", presses: 756, topSong: "Beethoven Mix", days: 40 },
];

const exportCSV = () => {
  const headers = ["ID", "Species", "Country", "Total Presses", "Top Song", "Active Days"];
  const rows = dataset.map((d) => [d.id, d.species, d.country, d.presses, d.topSong, d.days].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "parrot-device-anonymized-data.csv";
  a.click();
  URL.revokeObjectURL(url);
};

export default function Research() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Research Dashboard</h1>
          <p className="text-muted-foreground mt-1">Parrot behavior analytics and activity overview.</p>
        </div>
        <Button size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activityStats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <s.icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Songs */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Songs</CardTitle></CardHeader>
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

        {/* Button Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base">Button Press Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={buttonDist} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {buttonDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Presses */}
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

        {/* Time-of-Day */}
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
