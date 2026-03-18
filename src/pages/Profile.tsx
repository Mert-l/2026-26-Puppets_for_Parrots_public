import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Camera } from "lucide-react";

export default function Profile() {
  const { toast } = useToast();
  const [profile, setProfile] = useState({
    ownerName: "Dr. Sarah Mitchell",
    email: "sarah@avianresearch.org",
    
    parrotName: "Kiwi",
    species: "African Grey",
    age: "4",
    gender: "Female",
    environment: "research",
  });

  const update = (key: string, value: string) => setProfile((p) => ({ ...p, [key]: value }));

  const handleSave = () => {
    toast({ title: "Profile saved", description: "Your information has been updated." });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Parrot Owner Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account and parrot details.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Owner Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={profile.ownerName} onChange={(e) => update("ownerName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={profile.email} onChange={(e) => update("email", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Parrot Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6 mb-2">
            <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
              <Camera className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Parrot Photo</p>
              <p className="text-xs text-muted-foreground">Click to upload a photo</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Parrot Name</Label>
              <Input value={profile.parrotName} onChange={(e) => update("parrotName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Species</Label>
              <Input value={profile.species} onChange={(e) => update("species", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Age (years)</Label>
              <Input type="number" value={profile.age} onChange={(e) => update("age", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={profile.gender} onValueChange={(v) => update("gender", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Environment</Label>
            <Select value={profile.environment} onValueChange={(v) => update("environment", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="home">Home</SelectItem>
                <SelectItem value="aviary">Aviary</SelectItem>
                <SelectItem value="research">Research Lab</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">Save Profile</Button>
    </div>
  );
}
