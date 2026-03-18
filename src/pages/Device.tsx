import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Music, Upload, Play, Pause, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ButtonConfig {
  id: number;
  color: string;
  label: string;
  songName: string;
  audioFile: File | null;
  audioUrl: string | null;
}

const defaultButtons: ButtonConfig[] = [
  { id: 1, color: "hsl(201, 96%, 39%)", label: "1", songName: "Tropical Sunrise", audioFile: null, audioUrl: null },
  { id: 2, color: "hsl(199, 92%, 61%)", label: "2", songName: "Rainforest Beats", audioFile: null, audioUrl: null },
  { id: 3, color: "hsl(215, 25%, 14%)", label: "3", songName: "", audioFile: null, audioUrl: null },
  { id: 4, color: "hsl(210, 20%, 60%)", label: "4", songName: "", audioFile: null, audioUrl: null },
];

export default function Device() {
  const [buttons, setButtons] = useState<ButtonConfig[]>(defaultButtons);
  const [selectedButton, setSelectedButton] = useState<ButtonConfig | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tempSongName, setTempSongName] = useState("");
  const [tempFile, setTempFile] = useState<File | null>(null);
  const [tempAudioUrl, setTempAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const openConfig = (btn: ButtonConfig) => {
    setSelectedButton(btn);
    setTempSongName(btn.songName);
    setTempFile(btn.audioFile);
    setTempAudioUrl(btn.audioUrl);
    setIsPlaying(false);
    setSheetOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTempFile(file);
      const url = URL.createObjectURL(file);
      setTempAudioUrl(url);
      if (!tempSongName) {
        setTempSongName(file.name.replace(/\.[^.]+$/, ""));
      }
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSave = () => {
    if (!selectedButton) return;
    setButtons((prev) =>
      prev.map((b) =>
        b.id === selectedButton.id
          ? { ...b, songName: tempSongName, audioFile: tempFile, audioUrl: tempAudioUrl }
          : b
      )
    );
    setSheetOpen(false);
    toast({ title: "Configuration saved", description: `Button ${selectedButton.id} updated with "${tempSongName}"` });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Device Configuration</h1>
        <p className="text-muted-foreground mt-1">Assign songs to each button on your ParrotPlay device.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Parrot Device</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Device illustration */}
          <div className="flex justify-center">
            <div className="relative bg-muted border-2 border-border rounded-2xl w-72 h-80 flex flex-col items-center justify-center gap-4 p-6 shadow-sm">
              {/* Status LED */}
              <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="absolute top-4 left-4 text-[10px] font-medium text-muted-foreground tracking-widest uppercase">Parrot Device</span>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {buttons.map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => openConfig(btn)}
                    className="w-24 h-24 rounded-xl border-2 border-border transition-all duration-150 hover:scale-105 hover:shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95"
                    style={{ backgroundColor: btn.color }}
                  >
                    <Music className="h-5 w-5 text-white/90" />
                    <span className="text-[10px] text-white/80 font-medium">Button {btn.id}</span>
                  </button>
                ))}
              </div>

              {/* Speaker grille */}
              <div className="flex gap-1 mt-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-1 h-3 bg-border rounded-full" />
                ))}
              </div>
            </div>
          </div>

          {/* Button assignments */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {buttons.map((btn) => (
              <div key={btn.id} className="text-center space-y-2">
                <div className="w-4 h-4 rounded-full mx-auto" style={{ backgroundColor: btn.color }} />
                <p className="text-sm font-medium">Button {btn.id}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {btn.songName || "No song assigned"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Configure Button {selectedButton?.id}</SheetTitle>
            <SheetDescription>Upload an audio file and name the song for this button.</SheetDescription>
          </SheetHeader>
          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label>Song Name</Label>
              <Input
                value={tempSongName}
                onChange={(e) => setTempSongName(e.target.value)}
                placeholder="Enter song name..."
              />
            </div>

            <div className="space-y-2">
              <Label>Audio File</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mp3,audio/wav,audio/mpeg"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                {tempFile ? (
                  <div className="flex items-center gap-2 justify-center">
                    <Music className="h-4 w-4 text-primary" />
                    <span className="text-sm truncate">{tempFile.name}</span>
                    <button onClick={() => { setTempFile(null); setTempAudioUrl(null); }}>
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload MP3 or WAV
                  </Button>
                )}
              </div>
            </div>

            {tempAudioUrl && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="flex items-center gap-3 bg-muted rounded-lg p-3">
                  <Button variant="ghost" size="icon" onClick={togglePlay} className="shrink-0">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <audio ref={audioRef} src={tempAudioUrl} onEnded={() => setIsPlaying(false)} />
                  <span className="text-sm text-muted-foreground truncate">{tempSongName || "Untitled"}</span>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={handleSave} disabled={!tempSongName}>
              Save Configuration
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
