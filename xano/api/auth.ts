import { apiGroup, query, input, s, ref, inp, c, expr } from "@xanots/sdk";
import { admins } from "../tables/admins.js";

// canonical "authn" keeps the URL token distinct and readable (/api:authn/login).
export const authApi = apiGroup({ name: "auth", canonical: "authn" });

/**
 * Admin login. Issues an auth token via s.security.create_auth_token. The
 * password is taken as plain text (input.password would double-hash) and
 * compared against the stored hash, which the read pulls with an explicit
 * output because a password column is internal by default.
 */
export const authLogin = query({
  name: "login",
  verb: "POST",
  apiGroup: authApi,
  input: {
    email: input.email({ required: true, methods: ["lower"] }),
    password: input.text({ required: true }),
  },
  stack: [
    s.db.get({
      table: admins,
      fieldName: "email",
      fieldValue: inp("email"),
      output: ["id", "email", "name", "role", "password"],
      as: "admin",
    }),
    s.precondition({
      expr: expr(ref("admin"), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.check_password({
      text_password: inp("password"),
      hash_password: ref("admin.password"),
      as: "ok",
    }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.create_auth_token({ table: admins, id: ref("admin.id"), as: "authToken" }),
  ],
  response: {
    authToken: ref("authToken"),
    name: ref("admin.name"),
    role: ref("admin.role"),
  },
});
