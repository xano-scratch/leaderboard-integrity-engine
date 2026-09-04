import {
  defineFunction,
  input,
  s,
  ref,
  inp,
  col,
  c,
  expr,
  or,
  withFilters,
  fl,
} from "@xanots/sdk";
import { players } from "../tables/players.js";
import { scoringRulesets } from "../tables/scoring_rulesets.js";
import { scoreSubmissions } from "../tables/score_submissions.js";
import { leaderboardEntries } from "../tables/leaderboard_entries.js";
import { auditLog } from "../tables/audit_log.js";

/**
 * The governed scoring decision, in ONE place. Both the public submit endpoint
 * and the seed endpoint run through this, so every channel scores identically.
 *
 * Rules run IN ORDER and the first that decides wins:
 *   1. banned_account      -> reject a banned player before scoring
 *   2. score_bounds        -> reject a score outside [min_score, max_score]
 *   3. rate_limit          -> flag when the player is over the per-hour cap
 *   4. replay_consistency  -> flag when raw_score / session_seconds is too high
 *   else                   -> accept (and seat a leaderboard entry)
 *
 * Every call writes a submission row and an append-only audit row.
 */
export const decideScore = defineFunction({
  name: "decide_score",
  input: {
    player_id: input.int({ required: true }),
    raw_score: input.int({ required: true }),
    // Guarded >= 1 so the replay-consistency check never multiplies by zero.
    session_seconds: input.int({ required: true, methods: ["min:1"] }),
    channel: input.text({ required: true }),
  },
  stack: [
    // 1. Load the one active ruleset (guard existence before drilling into it).
    s.db.query({
      table: scoringRulesets,
      where: expr(col("is_active"), "=", c.bool(true)),
      returnType: "single",
      as: "rs",
    }),
    s.precondition({
      expr: expr(ref("rs"), "!=", c.null()),
      error_type: "badrequest",
      error: c.text("No active ruleset is configured."),
    }),

    // 2. Load the player.
    s.db.get({ table: players, fieldValue: inp("player_id"), as: "player" }),
    s.precondition({
      expr: expr(ref("player"), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Player not found."),
    }),

    // 3. Count the player's submissions in the trailing hour (before this one).
    // Compute the cutoff request-side and compare the column against the bound
    // value: a value-pipeline filter belongs in a set_var, not inside a `where`
    // (a where compiles to SQL, which does not host request-time filters).
    s.set_var("cutoff", withFilters(c.now(), fl.epochms_add_secs(c.int(-3600)))),
    s.db.query({
      table: scoreSubmissions,
      where: [
        expr(col("player_id"), "=", inp("player_id")),
        expr(col("created_at"), ">", ref("cutoff")),
      ],
      returnType: "count",
      as: "recent_count",
    }),

    // 4. Default to accepted, then let the first matching rule override.
    s.set_var("decision", c.text("accepted")),
    s.set_var("deciding_rule", c.text("passed")),
    s.set_var("detail", c.text("Score passed every rule in the active ruleset.")),
    s.conditional({
      when: expr(ref("player.status"), "=", c.text("banned")),
      then: [
        s.set_var("decision", c.text("rejected")),
        s.set_var("deciding_rule", c.text("banned_account")),
        s.set_var("detail", c.text("Player account is banned, so the submission was rejected before scoring.")),
      ],
      elif: [
        {
          when: or(
            expr(inp("raw_score"), "<", ref("rs.min_score")),
            expr(inp("raw_score"), ">", ref("rs.max_score")),
          ),
          then: [
            s.set_var("decision", c.text("rejected")),
            s.set_var("deciding_rule", c.text("score_bounds")),
            s.set_var("detail", c.text("Score is outside the allowed range for the active ruleset.")),
          ],
        },
        {
          when: expr(ref("recent_count"), ">=", ref("rs.max_submissions_per_hour")),
          then: [
            s.set_var("decision", c.text("flagged")),
            s.set_var("deciding_rule", c.text("rate_limit")),
            s.set_var("detail", c.text("Player is over the allowed number of submissions in the trailing hour.")),
          ],
        },
        {
          when: expr(
            inp("raw_score"),
            ">",
            withFilters(ref("rs.max_score_per_second"), fl.mul(inp("session_seconds"))),
          ),
          then: [
            s.set_var("decision", c.text("flagged")),
            s.set_var("deciding_rule", c.text("replay_consistency")),
            s.set_var("detail", c.text("Score per second exceeds the replay-consistency ceiling for the active ruleset.")),
          ],
        },
      ],
    }),

    // 5. Persist the submission (kept regardless of outcome).
    s.db.add({
      table: scoreSubmissions,
      row: {
        player_id: inp("player_id"),
        ruleset_id: ref("rs.id"),
        raw_score: inp("raw_score"),
        session_seconds: inp("session_seconds"),
        channel: inp("channel"),
        decision: ref("decision"),
        deciding_rule: ref("deciding_rule"),
      },
      as: "sub",
    }),

    // 6. Append the audit row.
    s.db.add({
      table: auditLog,
      row: {
        submission_id: ref("sub.id"),
        ruleset_version: ref("rs.version"),
        decision: ref("decision"),
        deciding_rule: ref("deciding_rule"),
        detail: ref("detail"),
      },
    }),

    // 7. An accepted submission seats a leaderboard entry.
    s.conditional({
      when: expr(ref("decision"), "=", c.text("accepted")),
      then: [
        s.db.add({
          table: leaderboardEntries,
          row: {
            player_id: inp("player_id"),
            submission_id: ref("sub.id"),
            score: inp("raw_score"),
            rank: c.int(0),
          },
        }),
      ],
    }),
  ],
  response: {
    submission_id: ref("sub.id"),
    decision: ref("decision"),
    deciding_rule: ref("deciding_rule"),
    ruleset_version: ref("rs.version"),
    detail: ref("detail"),
  },
});
