import { Fragment, useEffect, useMemo, useState } from "react";
import { api, type AuditDetail, type AuditRow, type Player } from "@/lib/api";
import { formatTime, ruleLabel } from "@/lib/format";
import { useAuth } from "@/components/AuthContext";
import { AdminLogin } from "@/components/AdminLogin";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, ScrollText } from "lucide-react";

const ALL = "all";
const DECISIONS = ["accepted", "flagged", "rejected"] as const;

export function AuditTrail({ dataVersion }: { dataVersion: number }) {
  const { token } = useAuth();
  if (!token) {
    return (
      <AdminLogin
        title="Audit trail is admin-gated"
        blurb="The decision log refuses any request without a valid admin token. Sign in as a steward or a viewer to read it."
      />
    );
  }
  return <AuditTable token={token} dataVersion={dataVersion} />;
}

function AuditTable({ token, dataVersion }: { token: string; dataVersion: number }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [roster, setRoster] = useState<Player[]>([]);
  const [decision, setDecision] = useState<string>(ALL);
  const [playerId, setPlayerId] = useState<string>(ALL);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [details, setDetails] = useState<Record<number, AuditDetail | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.roster().then(setRoster).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .auditSubmissions(
        token,
        decision === ALL ? undefined : decision,
        playerId === ALL ? undefined : Number(playerId),
      )
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setError(null);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, decision, playerId, dataVersion]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { accepted: 0, flagged: 0, rejected: 0 };
    for (const row of rows) c[row.decision] = (c[row.decision] ?? 0) + 1;
    return c;
  }, [rows]);

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Fetch the canonical decision record from the public lookup endpoint.
        if (!(id in details)) {
          setDetails((d) => ({ ...d, [id]: null }));
          api
            .decision(id)
            .then((rec) => setDetails((d) => ({ ...d, [id]: rec })))
            .catch(() => undefined);
        }
      }
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ScrollText className="size-5 text-primary" />
              <CardTitle>Audit trail</CardTitle>
            </div>
            <CardDescription className="mt-1">
              One append-only row per decision, with the fired rule and the ruleset version. This is the
              regulator-readable record.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={decision} onValueChange={setDecision}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All decisions</SelectItem>
                {DECISIONS.map((d) => (
                  <SelectItem key={d} value={d} className="capitalize">
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All players</SelectItem>
                {roster.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.handle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">{counts.accepted} accepted</Badge>
          <Badge variant="outline" className="border-amber-500/30 text-amber-300">{counts.flagged} flagged</Badge>
          <Badge variant="outline" className="border-rose-500/30 text-rose-300">{counts.rejected} rejected</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-4 text-sm text-rose-400">{error}</p>}
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No decisions match this filter.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Player</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead className="text-center">Ruleset</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <Fragment key={row.submission_id}>
                  <TableRow className="cursor-pointer" onClick={() => toggle(row.submission_id)}>
                    <TableCell>
                      {expanded.has(row.submission_id) ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{row.handle}</TableCell>
                    <TableCell className="text-muted-foreground">{row.channel}</TableCell>
                    <TableCell><StatusBadge decision={row.decision} /></TableCell>
                    <TableCell>{ruleLabel(row.deciding_rule)}</TableCell>
                    <TableCell className="text-center">v{row.ruleset_version}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.raw_score.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatTime(row.created_at)}</TableCell>
                  </TableRow>
                  {expanded.has(row.submission_id) && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell />
                      <TableCell colSpan={7} className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Submission #{row.submission_id}:</span>{" "}
                        {row.detail} ({row.raw_score.toLocaleString()} points over {row.session_seconds}s from{" "}
                        {row.channel}.)
                        {details[row.submission_id] && (
                          <div className="mt-1 text-xs text-muted-foreground/80">
                            Canonical record via <code className="text-primary">api:scoring/decision</code> —
                            rule {ruleLabel(String(details[row.submission_id]!.deciding_rule))}, ruleset v
                            {String(details[row.submission_id]!.ruleset_version)}.
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
