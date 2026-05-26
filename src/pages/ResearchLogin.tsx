import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ResearchLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");

  const correctPassword = String(import.meta.env.VITE_RESEARCHER_PASSWORD || "");

  const handleLogin = () => {
    if (!correctPassword) {
      toast({
        title: "Missing researcher password",
        description: "Add VITE_RESEARCHER_PASSWORD to your .env.local file.",
        variant: "destructive",
      });
      return;
    }

    if (password !== correctPassword) {
      toast({
        title: "Wrong password",
        description: "The researcher password is incorrect.",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("researcher_logged_in", "true");
    localStorage.removeItem("parrot_owner_email");

    toast({
      title: "Researcher login successful",
      description: "You now have access to the researcher dashboard.",
    });

    navigate("/research");
    window.location.reload();
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle>Researcher Login</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This area is only for the researcher. Parrot owners do not need to use this page.
          </p>

          <div className="space-y-2">
            <Label>Researcher Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleLogin();
              }}
            />
          </div>

          <Button onClick={handleLogin} className="w-full">
            Log In as Researcher
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}