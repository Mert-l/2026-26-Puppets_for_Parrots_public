import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Music, Upload, Play, Pause, X, Save, Wifi } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SoundFile {
  name: string;
  label?: string;
  duration_ms?: number | null;
}

interface ButtonConfig {
  id: number;
  color: string;
  label: string;
  songName: string;
  soundFile: string;
  audioUrl: string | null;
}

const buttonColors: Record<number, string> = {
  1: "hsl(201, 96%, 39%)",
  2: "hsl(199, 92%, 61%)",
  3: "hsl(215, 25%, 14%)",
  4: "hsl(210, 20%, 60%)",
};

const emptyButtons: ButtonConfig[] = [1, 2, 3, 4].map((id) => ({
  id,
  color: buttonColors[id],
  label: String(id),
  songName: "",
  soundFile: "",
  audioUrl: null,
}));

const API_BASE = "";

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Device() {
  const [buttons, setButtons] = useState<ButtonConfig[]>(emptyButtons);
  const [sounds, setSounds] = useState<SoundFile[]>([]);
  const [selectedButton, setSelectedButton] = useState<ButtonConfig | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tempSongName, setTempSongName] = useState("");
  const [tempSoundFile, setTempSoundFile] = useState("");
  const [tempUploadFile, setTempUploadFile] = useState<File | null>(null);
  const [tempAudioUrl, setTempAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const soundLabel = useMemo(() => {
    const map = new Map<string, string>();

    sounds.forEach((s) => {
      map.set(s.name, s.label || s.name.replace(/\.[^.]+$/, ""));
    });

    return map;
  }, [sounds]);

  const refreshConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config`);

      if (!res.ok) {
        throw new Error("API server is not responding");
      }

      const data = await res.json();
      const loadedSounds = data.sounds || [];
      const config = data.buttons || {};

      const loadedSoundLabel = new Map<string, string>();
      loadedSounds.forEach((s: SoundFile) => {
        loadedSoundLabel.set(s.name, s.label || s.name.replace(/\.[^.]+$/, ""));
      });

      setApiOnline(true);
      setSounds(loadedSounds);

      setButtons(
        [1, 2, 3, 4].map((id) => {
          const soundFile = config[id] || "";

          return {
            id,
            color: buttonColors[id],
            label: String(id),
            songName: loadedSoundLabel.get(soundFile) || soundFile.replace(/\.[^.]+$/, ""),
            soundFile,
            audioUrl: soundFile ? `/api/sounds/${encodeURIComponent(soundFile)}` : null,
          };
        })
      );
    } catch {
      setApiOnline(false);
    }
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  useEffect(() => {
    if (!sounds.length) return;

    setButtons((prev) =>
      prev.map((b) => ({
        ...b,
        songName: soundLabel.get(b.soundFile) || b.songName,
      }))
    );
  }, [sounds, soundLabel]);

  const openConfig = (btn: ButtonConfig) => {
    setSelectedButton(btn);
    setTempSongName(btn.songName);
    setTempSoundFile(btn.soundFile);
    setTempUploadFile(null);
    setTempAudioUrl(btn.audioUrl);
    setIsPlaying(false);
    setSheetOpen(true);
  };

  const handleSoundSelect = (fileName: string) => {
    setTempSoundFile(fileName);
    setTempUploadFile(null);
    setTempSongName(soundLabel.get(fileName) || fileName.replace(/\.[^.]+$/, ""));
    setTempAudioUrl(`/api/sounds/${encodeURIComponent(fileName)}`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setTempUploadFile(file);
    setTempSoundFile(file.name);

    // Keep the user-written description.
    // Only auto-fill if the field is empty.
    setTempSongName((current) =>
      current.trim() || file.name.replace(/\.[^.]+$/, "")
    );

    setTempAudioUrl(URL.createObjectURL(file));
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

  const saveMappingToApi = async (nextButtons: ButtonConfig[]) => {
    const payload = {
      buttons: Object.fromEntries(nextButtons.map((b) => [String(b.id), b.soundFile])),
    };

    const res = await fetch(`${API_BASE}/api/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error("Could not save config to API");
    }
  };

  const handleSave = async () => {
    if (!selectedButton) return;

    try {
      let finalSoundFile = tempSoundFile;
      let finalLabel = tempSongName.trim();

      if (tempUploadFile) {
        const data = await fileToDataUrl(tempUploadFile);

        const uploadRes = await fetch(`${API_BASE}/api/sounds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: tempUploadFile.name,
            label: finalLabel,
            data,
          }),
        });

        if (!uploadRes.ok) {
          throw new Error("Could not upload sound file");
        }

        const uploaded = await uploadRes.json();
        finalSoundFile = uploaded.sound;
        finalLabel = uploaded.metadata?.label || finalLabel || finalSoundFile.replace(/\.[^.]+$/, "");
      }

      const nextButtons = buttons.map((b) =>
        b.id === selectedButton.id
          ? {
              ...b,
              songName: finalLabel,
              soundFile: finalSoundFile,
              audioUrl: finalSoundFile ? `/api/sounds/${encodeURIComponent(finalSoundFile)}` : null,
            }
          : b
      );

      await saveMappingToApi(nextButtons);
      setButtons(nextButtons);
      setSheetOpen(false);
      await refreshConfig();

      toast({
        title: "Configuration saved",
        description: `Button ${selectedButton.id} now uses ${finalSoundFile}`,
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const simulatePress = async (button: ButtonConfig) => {
    try {
      if (button.audioUrl) {
        new Audio(button.audioUrl).play();
      }

      const res = await fetch(`${API_BASE}/api/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          button: button.id,
          soundfile: button.soundFile,
        }),
      });

      if (!res.ok) {
        throw new Error("Could not write log entry");
      }

      toast({
        title: "Button press logged",
        description: `Button ${button.id}: ${button.soundFile || "no sound assigned"}`,
      });
    } catch (error) {
      toast({
        title: "Logging failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Device Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Assign sounds to each physical button and test logging.
          </p>
        </div>

        <div
          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
            apiOnline ? "text-green-700" : "text-destructive"
          }`}
        >
          <Wifi className="h-3 w-3" />
          {apiOnline ? "API online" : "API offline"}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Parrot Device</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex justify-center">
            <div className="relative bg-muted border-2 border-border rounded-2xl w-72 h-80 flex flex-col items-center justify-center gap-4 p-6 shadow-sm">
              <div
                className={`absolute top-4 right-4 w-2 h-2 rounded-full ${
                  apiOnline ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              />

              <span className="absolute top-4 left-4 text-[10px] font-medium text-muted-foreground tracking-widest uppercase">
                Parrot Device
              </span>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {buttons.map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => simulatePress(btn)}
                    onDoubleClick={() => openConfig(btn)}
                    title="Click to simulate press. Double-click to configure."
                    className="w-24 h-24 rounded-xl border-2 border-border transition-all duration-150 hover:scale-105 hover:shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95"
                    style={{ backgroundColor: btn.color }}
                  >
                    <Music className="h-5 w-5 text-white/90" />
                    <span className="text-[10px] text-white/80 font-medium">
                      Button {btn.id}
                    </span>
                    <span className="text-[9px] text-white/70 px-1 truncate max-w-20">
                      {btn.songName || "empty"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex gap-1 mt-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-1 h-3 bg-border rounded-full" />
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Click a button to test playback/logging. Double-click a button to assign a sound.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {buttons.map((btn) => (
              <div key={btn.id} className="text-center space-y-2">
                <div
                  className="w-4 h-4 rounded-full mx-auto"
                  style={{ backgroundColor: btn.color }}
                />
                <p className="text-sm font-medium">Button {btn.id}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {btn.soundFile || "No sound assigned"}
                </p>
                <Button variant="outline" size="sm" onClick={() => openConfig(btn)}>
                  Configure
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto max-h-screen">
          <SheetHeader>
            <SheetTitle>Configure Button {selectedButton?.id}</SheetTitle>
            <SheetDescription>
              Choose an existing sound or upload a new WAV/MP3 file.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6 pb-8">
            <div className="space-y-2">
              <Label>Sound description / label</Label>
              <Input
                value={tempSongName}
                onChange={(e) => setTempSongName(e.target.value)}
                placeholder="Example: calm piano, short bell, bird chirping..."
              />
              <p className="text-xs text-muted-foreground">
                This description will be saved in metadata and shown in the dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Existing sound file</Label>
              <Select value={tempSoundFile} onValueChange={handleSoundSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sound from device library" />
                </SelectTrigger>

                <SelectContent>
                  {sounds.map((sound) => (
                    <SelectItem key={sound.name} value={sound.name}>
                      {sound.label || sound.name} ({sound.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Or upload new audio</Label>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/mp3,audio/wav,audio/mpeg"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                {tempUploadFile ? (
                  <div className="flex items-center gap-2 justify-center">
                    <Music className="h-4 w-4 text-primary" />
                    <span className="text-sm truncate">{tempUploadFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTempUploadFile(null);
                        setTempAudioUrl(
                          tempSoundFile ? `/api/sounds/${encodeURIComponent(tempSoundFile)}` : null
                        );
                      }}
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePlay}
                    className="shrink-0"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>

                  <audio
                    ref={audioRef}
                    src={tempAudioUrl}
                    onEnded={() => setIsPlaying(false)}
                  />

                  <span className="text-sm text-muted-foreground truncate">
                    {tempSongName || tempSoundFile || "Untitled"}
                  </span>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!tempSoundFile && !tempUploadFile}
            >
              <Save className="h-4 w-4 mr-2" />
              Save to device config
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}