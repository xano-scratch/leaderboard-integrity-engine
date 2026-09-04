import { table, f } from "@xanots/sdk";

/**
 * The ONE versioned rule set. Exactly one row is active. Publishing a new
 * version flips the prior active row off, so every channel decides by the same
 * rules the moment a steward publishes.
 */
export const scoringRulesets = table({
  name: "scoring_rulesets",
  schema: {
    version: f.int({ required: true }),
    is_active: f.bool({ required: true, default: false }),
    max_score: f.int({ required: true }),
    min_score: f.int({ required: true }),
    max_submissions_per_hour: f.int({ required: true }),
    // The replay-consistency ceiling: raw_score / session_seconds.
    max_score_per_second: f.decimal({ required: true }),
    notes: f.text(),
  },
  index: [{ type: "unique", fields: [{ name: "version" }] }],
  seed: [
    {
      version: 1,
      is_active: true,
      min_score: 0,
      max_score: 100000,
      max_submissions_per_hour: 2,
      max_score_per_second: 100,
      notes: "Baseline ruleset. Wide score range, low burst allowance.",
    },
    {
      version: 2,
      is_active: false,
      min_score: 0,
      max_score: 50000,
      max_submissions_per_hour: 5,
      max_score_per_second: 50,
      notes: "Stricter draft. Half the score ceiling, half the replay rate.",
    },
  ],
});
