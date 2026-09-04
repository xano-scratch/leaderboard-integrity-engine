import { useEffect, useMemo, useState } from "react";
import { api, type LeaderboardEntry, type Player } from "@/lib/api";
import { regionLabel, REGION_OPTIONS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, ShieldCheck, Trophy } from "lucide-react";

const ALL = "all";

export function Leaderboard({ dataVersion }: { dataVersion: number }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [roster, setRoster] = useState<Player[]>([]);
  const [region, setRegion] = useState<string>(ALL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.rankings(), api.roster()])
      .then(([rankings, players]) => {
        if (cancelled) return;
        setEntries(rankings);
        setRoster(players);
        setError(null);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dataVersion]);

  const playerById = useMemo(() => new Map(roster.map((p) => [p.id, p])), [roster]);

  const rows = useMemo(() => {
    return entries
      .map((entry) => {
        const player = playerById.get(entry.player_id);
        return {
          id: entry.id,
          score: entry.score,
          handle: player?.handle ?? `player #${entry.player_id}`,
          region: player?.region ?? "",
        };
      })
      .filter((row) => region === ALL || row.region === region)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [entries, playerById, region]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              <CardTitle>Leaderboard</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Only accepted scores reach the board. Flagged and rejected submissions never appear here.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All regions</SelectItem>
                {REGION_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {regionLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-4 text-sm text-rose-400">{error}</p>}
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyBoard />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {row.rank === 1 && <Crown className="size-4 text-amber-400" />}#{row.rank}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{row.handle}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{regionLabel(row.region)}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {row.score.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyBoard() {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <ShieldCheck className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        No accepted scores yet. Open the Submit console and choose “Load sample data”.
      </p>
    </div>
  );
}
