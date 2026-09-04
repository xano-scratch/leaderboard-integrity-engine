import { useEffect, useState, type FormEvent } from "react";
import { api, type Decision, type Player, type Ruleset } from "@/lib/api";
import { ruleLabel } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Ban, Database, Gauge, Send, Sparkles } from "lucide-react";

interface Preset {
  label: string;
  handle: string;
  raw_score: number;
  session_seconds: number;
  channel: string;
  hint: string;
}

const PRESETS: Preset[] = [
  { label: "Clean score", handle: "quantum_leap", raw_score: 7200, session_seconds: 120, channel: "ios-client", hint: "Accepted, seats a board entry" },
  { label: "Out of bounds", handle: "quantum_leap", raw_score: 250000, session_seconds: 300, channel: "match-service", hint: "Rejected by score_bounds" },
  { label: "Too fast", handle: "quantum_leap", raw_score: 5000, session_seconds: 5, channel: "web-client", hint: "Flagged by replay_consistency" },
  { label: "Banned player", handle: "shadow_blade", raw_score: 1500, session_seconds: 60, channel: "ios-client", hint: "Rejected by banned_account" },
];

export function SubmitConsole({ onDataChanged }: { onDataChanged: () => void }) {
  const [roster, setRoster] = useState<Player[]>([]);
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [channel, setChannel] = useState("ios-client");
  const [rawScore, setRawScore] = useState("7200");
  const [sessionSeconds, setSessionSeconds] = useState("120");
  const [result, setResult] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);

  async function loadContext() {
    const [players, active] = await Promise.all([api.roster(), api.rulesetsActive().catch(() => null)]);
    setRoster(players);
    setRuleset(active);
    if (!playerId && players.length > 0) {
      const nova = players.find((p) => p.handle === "quantum_leap") ?? players[0];
      setPlayerId(String(nova.id));
    }
  }

  useEffect(() => {
    loadContext().catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPreset(preset: Preset) {
    const player = roster.find((p) => p.handle === preset.handle);
    if (player) setPlayerId(String(player.id));
    setRawScore(String(preset.raw_score));
    setSessionSeconds(String(preset.session_seconds));
    setChannel(preset.channel);
    setResult(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!playerId) return;
    setBusy(true);
    setError(null);
    try {
      const decision = await api.submit({
        player_id: Number(playerId),
        raw_score: Number(rawScore),
        session_seconds: Number(sessionSeconds),
        channel,
      });
      setResult(decision);
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSeed() {
    setSeeding(true);
    setError(null);
    try {
      await api.seed();
      await loadContext();
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seeding failed");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Submit a score</CardTitle>
          <CardDescription>
            Every channel calls the same endpoint. The active rule set decides accept, flag, or reject and
            names the rule that fired.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button key={preset.label} type="button" variant="outline" size="sm" onClick={() => applyPreset(preset)} title={preset.hint}>
                {preset.label}
              </Button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Player</Label>
                <Select value={playerId} onValueChange={setPlayerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a player" />
                  </SelectTrigger>
                  <SelectContent>
                    {roster.map((player) => (
                      <SelectItem key={player.id} value={String(player.id)}>
                        {player.handle}
                        {player.status === "banned" ? " (banned)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel">Channel</Label>
                <Input id="channel" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="ios-client" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="raw_score">Raw score</Label>
                <Input id="raw_score" type="number" value={rawScore} onChange={(e) => setRawScore(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session_seconds">Session seconds</Label>
                <Input id="session_seconds" type="number" min={1} value={sessionSeconds} onChange={(e) => setSessionSeconds(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={busy || !playerId}>
                <Send className="size-4" />
                {busy ? "Scoring…" : "Submit to the engine"}
              </Button>
              <Button type="button" variant="secondary" onClick={onSeed} disabled={seeding}>
                <Database className="size-4" />
                {seeding ? "Loading…" : "Load sample data"}
              </Button>
            </div>
          </form>

          {result && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Verdict</span>
                <StatusBadge decision={String(result.decision)} />
              </div>
              <Separator className="my-3" />
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Deciding rule</dt>
                <dd className="text-right font-medium">{ruleLabel(String(result.deciding_rule))}</dd>
                <dt className="text-muted-foreground">Ruleset version</dt>
                <dd className="text-right font-medium">v{String(result.ruleset_version)}</dd>
                <dt className="text-muted-foreground">Submission</dt>
                <dd className="text-right font-medium">#{String(result.submission_id)}</dd>
              </dl>
              <p className="mt-3 text-sm text-muted-foreground">{String(result.detail)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gauge className="size-5 text-primary" />
            <CardTitle>Active rule set</CardTitle>
          </div>
          <CardDescription>The one version in force. Predict the outcome before you submit.</CardDescription>
        </CardHeader>
        <CardContent>
          {ruleset ? (
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="text-2xl font-semibold text-primary">v{ruleset.version}</span>
              </div>
              <Separator />
              <RuleRow label="Score range" value={`${ruleset.min_score} to ${ruleset.max_score}`} />
              <RuleRow label="Submissions per hour" value={String(ruleset.max_submissions_per_hour)} />
              <RuleRow label="Max score per second" value={String(ruleset.max_score_per_second)} />
              {ruleset.notes && <p className="text-sm text-muted-foreground">{ruleset.notes}</p>}
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                <p className="mb-2 flex items-center gap-1.5 font-medium text-foreground">
                  <Sparkles className="size-3.5" /> Rules run in order, first match wins
                </p>
                <ol className="list-inside list-decimal space-y-1">
                  <li className="flex items-center gap-1.5"><Ban className="size-3" /> banned_account</li>
                  <li>score_bounds</li>
                  <li>rate_limit</li>
                  <li>replay_consistency</li>
                </ol>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active rule set. Load sample data to begin.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
