import { apiGroup, query, input, s, ref, inp, col, c, auth, expr, withFilters, fl } from "@xanots/sdk";
import { admins } from "../tables/admins.js";
import { scoringRulesets } from "../tables/scoring_rulesets.js";

export const rulesetsApi = apiGroup({ name: "rulesets", canonical: "rulesets" });

/**
 * The currently active ruleset (bounds, limits, version). Open and read-only:
 * the submit console shows the rules in force so a reviewer can predict the
 * outcome.
 */
export const rulesetsActive = query({
  name: "active",
  verb: "GET",
  apiGroup: rulesetsApi,
  stack: [
    s.db.query({
      table: scoringRulesets,
      where: expr(col("is_active"), "=", c.bool(true)),
      returnType: "single",
      as: "rs",
    }),
    s.precondition({
      expr: expr(ref("rs"), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No active ruleset."),
    }),
  ],
  response: ref("rs"),
});

/**
 * The version history: every ruleset, newest first. Feeds the rulesets screen so
 * a reviewer can see each version and which one is active. Open and read-only.
 */
export const rulesetsList = query({
  name: "list",
  verb: "GET",
  apiGroup: rulesetsApi,
  stack: [
    s.db.query({ table: scoringRulesets, sort: [{ sortBy: "version", dir: "desc" }], as: "rows" }),
  ],
  response: ref("rows"),
});

/**
 * The governance act: publish a new ruleset version. Steward-only (RBAC read
 * from the caller's own admin row). Inserts a new active version and retires
 * the prior one, so every channel decides by the new rules at once.
 */
export const rulesetsPublish = query({
  name: "publish",
  verb: "POST",
  apiGroup: rulesetsApi,
  auth: admins,
  input: {
    min_score: input.int({ required: true }),
    max_score: input.int({ required: true }),
    max_submissions_per_hour: input.int({ required: true, methods: ["min:1"] }),
    max_score_per_second: input.decimal({ required: true }),
    notes: input.text({ required: false, default: "" }),
  },
  stack: [
    // Steward-only. Read the caller's role from their own admin row.
    s.db.get({ table: admins, fieldValue: auth("id"), as: "me" }),
    s.precondition({
      expr: expr(ref("me.role", { safe: true }), "=", c.text("steward")),
      error_type: "accessdenied",
      error: c.text("Only a steward can publish a ruleset version."),
    }),

    // Next version = current highest + 1.
    s.db.query({
      table: scoringRulesets,
      sort: [{ sortBy: "version", dir: "desc" }],
      returnType: "single",
      as: "top",
    }),
    s.set_var("next_version", withFilters(ref("top.version"), fl.add(c.int(1)))),

    // Retire the currently active ruleset (exactly one by invariant).
    s.db.query({
      table: scoringRulesets,
      where: expr(col("is_active"), "=", c.bool(true)),
      returnType: "single",
      as: "cur",
    }),
    s.conditional({
      when: expr(ref("cur"), "!=", c.null()),
      then: [
        s.db.edit({ table: scoringRulesets, fieldValue: ref("cur.id"), row: { is_active: false } }),
      ],
    }),

    // Insert the new active version.
    s.db.add({
      table: scoringRulesets,
      row: {
        version: ref("next_version"),
        is_active: true,
        min_score: inp("min_score"),
        max_score: inp("max_score"),
        max_submissions_per_hour: inp("max_submissions_per_hour"),
        max_score_per_second: inp("max_score_per_second"),
        notes: inp("notes"),
      },
      as: "created",
    }),
  ],
  response: ref("created"),
});
