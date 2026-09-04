import { workspace } from "@xanots/sdk";

import { admins } from "./tables/admins.js";
import { players } from "./tables/players.js";
import { scoringRulesets } from "./tables/scoring_rulesets.js";
import { scoreSubmissions } from "./tables/score_submissions.js";
import { leaderboardEntries } from "./tables/leaderboard_entries.js";
import { auditLog } from "./tables/audit_log.js";

import { decideScore } from "./functions/decide.js";

import { scoringApi, submitScore, scoringDecision } from "./api/scoring.js";
import { leaderboardApi, leaderboardRankings } from "./api/leaderboard.js";
import { auditApi, auditSubmissions } from "./api/audit.js";
import { rulesetsApi, rulesetsActive, rulesetsList, rulesetsPublish } from "./api/rulesets.js";
import { playersApi, playersRoster } from "./api/players.js";
import { authApi, authLogin } from "./api/auth.js";
import { seedApi, seedRun } from "./api/seed.js";

/**
 * The leaderboard-integrity-engine backend.
 *
 * A governed scoring API every channel calls to submit a player score. One
 * versioned rule set decides accept / flag / reject, returns the exact rule that
 * fired, and writes an audit row, so no client can seat a bad score on the board.
 */
export default workspace("leaderboard-integrity-engine")
  .registerTables([
    admins,
    players,
    scoringRulesets,
    scoreSubmissions,
    leaderboardEntries,
    auditLog,
  ])
  .registerFunctions([decideScore])
  .registerApiGroups([
    scoringApi,
    leaderboardApi,
    auditApi,
    rulesetsApi,
    playersApi,
    authApi,
    seedApi,
  ])
  .registerQueries([
    submitScore,
    scoringDecision,
    leaderboardRankings,
    auditSubmissions,
    rulesetsActive,
    rulesetsList,
    rulesetsPublish,
    playersRoster,
    authLogin,
    seedRun,
  ]);
