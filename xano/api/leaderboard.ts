import { apiGroup, query, input, s, ref, inp, col, cmp, expr } from "@xanots/sdk";
import { leaderboardEntries } from "../tables/leaderboard_entries.js";
import { players } from "../tables/players.js";

export const leaderboardApi = apiGroup({ name: "leaderboard", canonical: "leaderboard" });

/**
 * The current ranked board: only accepted entries exist in this table, so a
 * cheated submission never appears here. Ordered by score desc; an optional
 * region filter joins players and matches their region. Rank is derived on read
 * from the sorted position (the client numbers them 1..N).
 */
export const leaderboardRankings = query({
  name: "rankings",
  verb: "GET",
  apiGroup: leaderboardApi,
  input: {
    region: input.text({ required: false, default: "" }),
    limit: input.int({ required: false, default: 100 }),
  },
  stack: [
    s.db.query({
      table: leaderboardEntries,
      // Join players only to filter by region; the result stays base rows.
      bind: [
        {
          table: players,
          as: "pl",
          join: "inner",
          where: expr(col("player_id"), "=", col("pl.id")),
        },
      ],
      // ignoreEmpty drops this predicate when region is unset, returning all.
      where: cmp(col("pl.region"), "=", inp("region"), { ignoreEmpty: true }),
      sort: [{ sortBy: "score", dir: "desc" }],
      paging: { page: 1, per_page: inp("limit"), metadata: false },
      as: "entries",
    }),
  ],
  response: ref("entries"),
});
