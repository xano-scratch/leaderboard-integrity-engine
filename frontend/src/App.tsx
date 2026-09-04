import { useState } from "react";
import { AuthProvider, useAuth } from "@/components/AuthContext";
import { SubmitConsole } from "@/components/SubmitConsole";
import { Leaderboard } from "@/components/Leaderboard";
import { AuditTrail } from "@/components/AuditTrail";
import { Rulesets } from "@/components/Rulesets";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldCheck, Target } from "lucide-react";

function Header() {
  const { name, role, signOut } = useAuth();
  return (
    <header className="border-b bg-card/40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Target className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Leaderboard Integrity Engine</h1>
            <p className="text-sm text-muted-foreground">
              One governed scoring API. Every channel decides the same way, and every ranking is auditable.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-primary/30 text-primary">
            Play 1 · Business Logic Centralization
          </Badge>
          {name ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {name} · <span className="capitalize">{role}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function Body() {
  const [dataVersion, setDataVersion] = useState(0);
  const bump = () => setDataVersion((v) => v + 1);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Tabs defaultValue="submit" className="space-y-6">
        <TabsList>
          <TabsTrigger value="submit">Submit &amp; Decide</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
          <TabsTrigger value="rulesets">Rule sets</TabsTrigger>
        </TabsList>

        <TabsContent value="submit">
          <SubmitConsole onDataChanged={bump} />
        </TabsContent>
        <TabsContent value="leaderboard">
          <Leaderboard dataVersion={dataVersion} />
        </TabsContent>
        <TabsContent value="audit">
          <AuditTrail dataVersion={dataVersion} />
        </TabsContent>
        <TabsContent value="rulesets">
          <Rulesets dataVersion={dataVersion} onDataChanged={bump} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <Body />
        <footer className="mx-auto max-w-6xl px-6 pb-10 pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Auth is API-layer role-based access control. A scratch proof artifact, not a production reference.
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}
