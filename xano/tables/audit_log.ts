import { table, f } from "@xanots/sdk";
import { scoreSubmissions } from "./score_submissions.js";

/**
 * Append-only, one row per decision. The regulator-readable trail: which rule
 * fired, under which ruleset version, and a human-readable reason.
 */
export const auditLog = table({
  name: "audit_log",
  schema: {
    submission_id: f.tableRef(scoreSubmissions, { required: true }),
    ruleset_version: f.int({ required: true }),
    decision: f.text({ required: true }),
    deciding_rule: f.text({ required: true }),
    detail: f.text({ required: true }),
  },
});
