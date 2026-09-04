import { table, f, seedFile } from "@xanots/sdk";

/**
 * The studio staff auth table. API-layer RBAC (not row-level security): a role
 * column gates the audit + publish surfaces at the endpoint layer.
 *
 * `id` (int PK) + `created_at` (epochms) are auto-injected.
 */
export const admins = table({
  name: "admins",
  auth: true,
  schema: {
    email: f.email({ required: true }),
    // Hashes on write. A login stack reads it with an explicit `output` and
    // compares with s.security.check_password (never input.password — it double-hashes).
    password: f.password({ required: true }),
    name: f.text({ required: true }),
    role: f.enum(["steward", "viewer"], { required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
  // Reference accounts, seeded from a FILE (not an inline array): the passwords
  // are read by the deploy CLI and never enter the frontend bundle, so the
  // static host stays credential-free. The password column hashes on write.
  seed: seedFile("./admins.seed.json", import.meta.url),
});
