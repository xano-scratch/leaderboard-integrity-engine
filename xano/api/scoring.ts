import { apiGroup, query, input, s, ref, inp, col, c, expr } from "@xanots/sdk";
import { decideScore } from "../functions/decide.js";
import { auditLog } from "../tables/audit_log.js";

// Pin the canonical slug so public paths are stable and getPath() resolves in
// the browser bundle.
export const scoringApi = apiGroup({ name: "scoring", canonical: "scoring" });

/**
 * The core endpoint. Open to any channel on purpose: the point is one
 * bypass-proof scoring layer, not caller identity. Runs the shared decision
 * function and returns the verdict.
 */
export const submitScore = query({
  name: "submit",
  verb: "POST",
  apiGroup: scoringApi,
  input: {
    player_id: input.int({ required: true }),
    raw_score: input.int({ required: true }),
    session_seconds: input.int({ required: true, methods: ["min:1"] }),
    channel: input.text({ required: true }),
  },
  stack: [
    s.function.run({
      fn: decideScore,
      input: {
        player_id: inp("player_id"),
        raw_score: inp("raw_score"),
        session_seconds: inp("session_seconds"),
        channel: inp("channel"),
      },
      as: "result",
    }),
  ],
  response: ref("result"),
});

/**
 * The decision + fired rule + ruleset version + detail for one submission.
 * Reads the append-only audit row, which carries the full verdict.
 */
export const scoringDecision = query({
  name: "decision",
  verb: "GET",
  apiGroup: scoringApi,
  input: { submission_id: input.int({ required: true }) },
  stack: [
    s.db.query({
      table: auditLog,
      where: expr(col("submission_id"), "=", inp("submission_id")),
      returnType: "single",
      as: "row",
    }),
    s.precondition({
      expr: expr(ref("row"), "!=", c.null()),
      error_type: "notfound",
      error: c.text("No audit record for that submission."),
    }),
  ],
  response: ref("row"),
});
