import { apiGroup, query, s, ref, c } from "@xanots/sdk";
import { players } from "../tables/players.js";
import { scoreSubmissions } from "../tables/score_submissions.js";
import { leaderboardEntries } from "../tables/leaderboard_entries.js";
import { auditLog } from "../tables/audit_log.js";
import { decideScore } from "../functions/decide.js";

export const seedApi = apiGroup({ name: "seed", canonical: "seed" });

/**
 * Populate the ephemeral so every screen is browsable. Idempotent: it resets
 * the dynamic tables, then runs sample submissions THROUGH the real decision
 * function. The seeded decisions are real engine output, not hand-written rows,
 * and cover every deciding rule.
 *
 * Players, rulesets, and admins come from table seeds (present on any deploy);
 * this only reads players.
 */
export const seedRun = query({
  name: "run",
  verb: "POST",
  apiGroup: seedApi,
  stack: [
    // Reset the derived tables so re-running does not duplicate.
    s.db.truncate({ table: scoreSubmissions, reset: true }),
    s.db.truncate({ table: leaderboardEntries, reset: true }),
    s.db.truncate({ table: auditLog, reset: true }),

    // Resolve the players we submit for.
    s.db.get({ table: players, fieldName: "handle", fieldValue: c.text("nova_ace"), as: "pA" }),
    s.db.get({ table: players, fieldName: "handle", fieldValue: c.text("quantum_leap"), as: "pE" }),
    s.db.get({ table: players, fieldName: "handle", fieldValue: c.text("cinder_wolf"), as: "pF" }),
    s.db.get({ table: players, fieldName: "handle", fieldValue: c.text("neon_striker"), as: "pG" }),
    s.db.get({ table: players, fieldName: "handle", fieldValue: c.text("pixel_fury"), as: "pB" }),
    s.db.get({ table: players, fieldName: "handle", fieldValue: c.text("ghost_runner"), as: "pC" }),
    s.db.get({ table: players, fieldName: "handle", fieldValue: c.text("shadow_blade"), as: "pD" }),

    // Sample submissions through the real engine. Order matters: nova_ace's
    // first two accept, the third trips rate_limit (cap is 2/hour under v1).
    s.function.run({ fn: decideScore, input: { player_id: ref("pA.id"), raw_score: c.int(1500), session_seconds: c.int(60), channel: c.text("ios-client") } }),
    s.function.run({ fn: decideScore, input: { player_id: ref("pA.id"), raw_score: c.int(1800), session_seconds: c.int(90), channel: c.text("match-service") } }),
    s.function.run({ fn: decideScore, input: { player_id: ref("pA.id"), raw_score: c.int(1200), session_seconds: c.int(60), channel: c.text("ios-client") } }),
    // More accepted scores for a fuller board.
    s.function.run({ fn: decideScore, input: { player_id: ref("pE.id"), raw_score: c.int(8000), session_seconds: c.int(120), channel: c.text("web-client") } }),
    s.function.run({ fn: decideScore, input: { player_id: ref("pF.id"), raw_score: c.int(4200), session_seconds: c.int(70), channel: c.text("android-client") } }),
    s.function.run({ fn: decideScore, input: { player_id: ref("pG.id"), raw_score: c.int(6500), session_seconds: c.int(100), channel: c.text("match-service") } }),
    // Out-of-bounds reject (over the 100000 ceiling).
    s.function.run({ fn: decideScore, input: { player_id: ref("pB.id"), raw_score: c.int(250000), session_seconds: c.int(300), channel: c.text("ios-client") } }),
    // Replay-consistency flag (5000 over 5s is 1000/s, past the 100/s ceiling).
    s.function.run({ fn: decideScore, input: { player_id: ref("pC.id"), raw_score: c.int(5000), session_seconds: c.int(5), channel: c.text("web-client") } }),
    // Banned-account reject.
    s.function.run({ fn: decideScore, input: { player_id: ref("pD.id"), raw_score: c.int(1500), session_seconds: c.int(60), channel: c.text("ios-client") } }),
  ],
  response: {
    ok: c.bool(true),
    submissions_created: c.int(9),
    message: c.text("Seeded 9 submissions across every decision type."),
  },
});
