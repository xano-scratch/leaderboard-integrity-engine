// The one contract: paths and request/response TYPES are derived from the
// xanots query defs. Change a def and everything here follows — no hand-typed
// URL, no hand-typed request body, and response shapes come from InferResponse.
import type { InferInput, InferResponse } from "@xanots/sdk";

import { submitScore, scoringDecision } from "../../../xano/api/scoring.js";
import { leaderboardRankings } from "../../../xano/api/leaderboard.js";
import { auditSubmissions } from "../../../xano/api/audit.js";
import { rulesetsActive, rulesetsList, rulesetsPublish } from "../../../xano/api/rulesets.js";
import { playersRoster } from "../../../xano/api/players.js";
import { authLogin } from "../../../xano/api/auth.js";
import { seedRun } from "../../../xano/api/seed.js";
import { decideScore } from "../../../xano/functions/decide.js";

/**
 * The deployed Xano backend's base URL. Injected as `window.XANO_HOST` by
 * `xanots deploy <entry> --static <dir>`, or read from `VITE_XANO_HOST` in dev.
 */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ── Types, straight from the defs ────────────────────────────────────────────
// submit returns the shared decision function's result, so its type IS the
// function's response — no hand-mirroring.
export type Decision = InferResponse<typeof decideScore>;
export type SubmitBody = InferInput<typeof submitScore>;
export type Ruleset = NonNullable<InferResponse<typeof rulesetsActive>>;
export type PublishBody = InferInput<typeof rulesetsPublish>;
export type Player = InferResponse<typeof playersRoster>[number];
export type LeaderboardEntry = InferResponse<typeof leaderboardRankings>[number];
export type LoginResult = InferResponse<typeof authLogin>;
export type AuditDetail = NonNullable<InferResponse<typeof scoringDecision>>;

// The audit list is assembled row-by-row in the stack (a per-row join to the
// submission + player), so its element shape is not inferable from the def.
// This is the one hand-declared response shape; everything else is derived.
export interface AuditRow {
  submission_id: number;
  decision: string;
  deciding_rule: string;
  ruleset_version: number;
  detail: string;
  created_at: number;
  channel: string;
  raw_score: number;
  session_seconds: number;
  handle: string;
  region: string;
}

// ── Fetch helpers ────────────────────────────────────────────────────────────
async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== null) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(XANO_HOST + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body ?? {}),
  });
  return readJson<T>(res);
}

async function get<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(XANO_HOST + path, { headers: authHeaders(token) });
  return readJson<T>(res);
}

// ── The endpoints ────────────────────────────────────────────────────────────
export const api = {
  submit: (body: SubmitBody) => post<Decision>(submitScore.getPath(), body),

  decision: (submissionId: number) =>
    get<AuditDetail>(withQuery(scoringDecision.getPath(), { submission_id: submissionId })),

  rankings: (region?: string, limit?: number) =>
    get<LeaderboardEntry[]>(withQuery(leaderboardRankings.getPath(), { region, limit })),

  auditSubmissions: (token: string, decision?: string, playerId?: number) =>
    get<AuditRow[]>(withQuery(auditSubmissions.getPath(), { decision, player_id: playerId }), token),

  rulesetsActive: () => get<Ruleset>(rulesetsActive.getPath()),

  rulesetsList: () => get<Ruleset[]>(rulesetsList.getPath()),

  publishRuleset: (token: string, body: PublishBody) =>
    post<Ruleset>(rulesetsPublish.getPath(), body, token),

  roster: () => get<Player[]>(playersRoster.getPath()),

  login: (email: string, password: string) =>
    post<LoginResult>(authLogin.getPath(), { email, password }),

  seed: () =>
    post<{ ok: boolean; submissions_created: number; message: string }>(seedRun.getPath(), {}),
};
