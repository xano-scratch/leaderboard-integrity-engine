import { table, f } from "@xanots/sdk";

/**
 * The subject of a submission. The banned-account rule reads `status`.
 */
export const players = table({
  name: "players",
  schema: {
    handle: f.text({ required: true }),
    status: f.enum(["active", "banned"], { required: true, default: "active" }),
    region: f.text({ required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "handle" }] }],
  seed: [
    { handle: "nova_ace", status: "active", region: "na" },
    { handle: "pixel_fury", status: "active", region: "eu" },
    { handle: "ghost_runner", status: "active", region: "apac" },
    { handle: "shadow_blade", status: "banned", region: "na" },
    { handle: "quantum_leap", status: "active", region: "eu" },
    { handle: "cinder_wolf", status: "active", region: "apac" },
    { handle: "neon_striker", status: "active", region: "na" },
    { handle: "frost_byte", status: "active", region: "eu" },
  ],
});
