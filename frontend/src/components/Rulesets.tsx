import { useEffect, useState, type FormEvent } from "react";
import { api, type PublishBody, type Ruleset } from "@/lib/api";
import { useAuth } from "@/components/AuthContext";
import { AdminLogin } from "@/components/AdminLogin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GitBranch, Rocket, ShieldAlert } from "lucide-react";

export function Rulesets({ dataVersion, onDataChanged }: { dataVersion: number; onDataChanged: () => void }) {
  const [list, setList] = useState<Ruleset[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setList(await api.rulesetsList());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion]);

  const active = list.find((r) => r.is_active) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitBranch className="size-5 text-primary" />
            <CardTitle>Version history</CardTitle>
          </div>
          <CardDescription>
            One governed rule set, versioned. Publishing a new version retires the prior one, so every
            channel decides by the same rules at once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-rose-400">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Score range</TableHead>
                <TableHead className="text-center">Per hour</TableHead>
                <TableHead className="text-center">Per sec</TableHead>
                <TableHead className="text-right">State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold">v{r.version}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {r.min_score}–{r.max_score}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{r.max_submissions_per_hour}</TableCell>
                  <TableCell className="text-center tabular-nums">{String(r.max_score_per_second)}</TableCell>
                  <TableCell className="text-right">
                    {r.is_active ? (
                      <Badge className="bg-primary/20 text-primary">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Retired</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {active?.notes && (
            <p className="mt-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Active notes:</span> {active.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <PublishPanel active={active} onPublished={() => { load(); onDataChanged(); }} />
    </div>
  );
}

function PublishPanel({ active, onPublished }: { active: Ruleset | null; onPublished: () => void }) {
  const { token, isSteward, role } = useAuth();

  if (!token) {
    return (
      <AdminLogin
        title="Publishing is steward-only"
        blurb="Changing the rules in one place is a governed act. Sign in as a steward to publish a new version."
      />
    );
  }

  if (!isSteward) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-400" />
            <CardTitle>Steward role required</CardTitle>
          </div>
          <CardDescription>
            You are signed in as a {role}. A viewer can read the audit trail but cannot publish a ruleset.
            The publish endpoint checks the role at the API layer and refuses this token.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <PublishForm active={active} onPublished={onPublished} token={token} />;
}

function PublishForm({ active, onPublished, token }: { active: Ruleset | null; onPublished: () => void; token: string }) {
  const [form, setForm] = useState<PublishBody>({
    min_score: 0,
    max_score: 50000,
    max_submissions_per_hour: 5,
    max_score_per_second: 50,
    notes: "Stricter ceiling published from the console.",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<Ruleset | null>(null);

  useEffect(() => {
    if (active) {
      setForm((f) => ({
        ...f,
        min_score: active.min_score,
        max_score: Math.round(active.max_score / 2),
        max_submissions_per_hour: active.max_submissions_per_hour,
        max_score_per_second: Number(active.max_score_per_second),
      }));
    }
  }, [active]);

  function set<K extends keyof PublishBody>(key: K, value: PublishBody[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api.publishRuleset(token, form);
      setPublished(created);
      onPublished();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Rocket className="size-5 text-primary" />
          <CardTitle>Publish a new version</CardTitle>
        </div>
        <CardDescription>
          The new version becomes active immediately. Submit the same score before and after to see the
          verdict change.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Min score">
              <Input type="number" value={form.min_score} onChange={(e) => set("min_score", Number(e.target.value))} />
            </Field>
            <Field label="Max score">
              <Input type="number" value={form.max_score} onChange={(e) => set("max_score", Number(e.target.value))} />
            </Field>
            <Field label="Submissions per hour">
              <Input type="number" min={1} value={form.max_submissions_per_hour} onChange={(e) => set("max_submissions_per_hour", Number(e.target.value))} />
            </Field>
            <Field label="Max score per second">
              <Input type="number" value={form.max_score_per_second} onChange={(e) => set("max_score_per_second", Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Notes">
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <Button type="submit" disabled={busy}>
            <Rocket className="size-4" />
            {busy ? "Publishing…" : "Publish new version"}
          </Button>
        </form>
        {published && (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm">
            <Separator className="mb-3" />
            Published <span className="font-semibold text-primary">v{published.version}</span>. Every channel now
            decides by these rules.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
