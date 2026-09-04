import { table, f } from "@xanots/sdk";
import { players } from "./players.js";
import { scoreSubmissions } from "./score_submissions.js";

/**
 * Only `accepted` submissions produce an entry, so the board never shows a
 * score that failed the rules. `rank` is derived on read (by score order).
 */
export const leaderboardEntries = table({
  name: "leaderboard_entries",
  schema: {
    player_id: f.tableRef(players, { required: true }),
    submission_id: f.tableRef(scoreSubmissions, { required: true }),
    score: f.int({ required: true }),
    rank: f.int({ required: true, default: 0 }),
  },
});
