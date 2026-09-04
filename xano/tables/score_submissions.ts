import { table, f } from "@xanots/sdk";
import { players } from "./players.js";
import { scoringRulesets } from "./scoring_rulesets.js";

/**
 * One row per submission attempt, kept regardless of outcome. `ruleset_id`
 * pins the exact version that judged it.
 */
export const scoreSubmissions = table({
  name: "score_submissions",
  schema: {
    player_id: f.tableRef(players, { required: true }),
    ruleset_id: f.tableRef(scoringRulesets, { required: true }),
    raw_score: f.int({ required: true }),
    session_seconds: f.int({ required: true }),
    channel: f.text({ required: true }),
    decision: f.enum(["accepted", "flagged", "rejected"], { required: true }),
    // The rule slug that fired: score_bounds / rate_limit / replay_consistency /
    // banned_account / passed.
    deciding_rule: f.text({ required: true }),
  },
});
