import { apiGroup, query, input, s, ref, inp, col, c, cmp, expr, or, obj, withFilters, fl } from "@xanots/sdk";
import { admins } from "../tables/admins.js";
import { auditLog } from "../tables/audit_log.js";
import { scoreSubmissions } from "../tables/score_submissions.js";
import { players } from "../tables/players.js";

export const auditApi = apiGroup({ name: "audit", canonical: "audit" });

/**
 * The regulator-readable decision log. Admin-gated (any valid steward or viewer
 * token): a request with no token is refused by the auth-table guard. Each row
 * carries the fired rule, the ruleset version, the detail, plus the channel and
 * player it came from.
 */
export const auditSubmissions = query({
  name: "submissions",
  verb: "GET",
  apiGroup: auditApi,
  // Requires a valid admin token (steward or viewer). This is the RBAC guard.
  auth: admins,
  input: {
    decision: input.text({ required: false, default: "" }),
    player_id: input.int({ required: false, default: 0 }),
  },
  stack: [
    s.db.query({
      table: auditLog,
      // Optional decision filter; ignoreEmpty drops it when unset.
      where: cmp(col("decision"), "=", inp("decision"), { ignoreEmpty: true }),
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "logs",
    }),
    s.set_var("out", c.array([])),
    s.foreach({
      list: ref("logs"),
      as: "log",
      body: [
        s.db.get({ table: scoreSubmissions, fieldValue: ref("log.submission_id"), as: "sub" }),
        s.conditional({
          // Optional player filter (0 = every player).
          when: or(
            expr(inp("player_id"), "=", c.int(0)),
            expr(ref("sub.player_id"), "=", inp("player_id")),
          ),
          then: [
            s.db.get({ table: players, fieldValue: ref("sub.player_id"), as: "pl" }),
            s.update_var(
              "out",
              withFilters(
                ref("out"),
                fl.array_push(
                  obj({
                    submission_id: ref("log.submission_id"),
                    decision: ref("log.decision"),
                    deciding_rule: ref("log.deciding_rule"),
                    ruleset_version: ref("log.ruleset_version"),
                    detail: ref("log.detail"),
                    created_at: ref("log.created_at"),
                    channel: ref("sub.channel"),
                    raw_score: ref("sub.raw_score"),
                    session_seconds: ref("sub.session_seconds"),
                    handle: ref("pl.handle"),
                    region: ref("pl.region"),
                  }),
                ),
              ),
            ),
          ],
        }),
      ],
    }),
  ],
  response: ref("out"),
});
