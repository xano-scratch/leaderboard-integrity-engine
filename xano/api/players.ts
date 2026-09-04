import { apiGroup, query, s, ref } from "@xanots/sdk";
import { players } from "../tables/players.js";

export const playersApi = apiGroup({ name: "players", canonical: "players" });

/**
 * Players with their status. Feeds the submit console's player picker and shows
 * who is banned.
 */
export const playersRoster = query({
  name: "roster",
  verb: "GET",
  apiGroup: playersApi,
  stack: [
    s.db.query({ table: players, sort: [{ sortBy: "handle", dir: "asc" }], as: "rows" }),
  ],
  response: ref("rows"),
});
