import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { LoginResult } from "@/lib/api";

interface AuthState {
  token: string | null;
  name: string | null;
  role: string | null;
  isSteward: boolean;
  signIn: (result: LoginResult) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<{ token: string; name: string; role: string } | null>(null);

  const value = useMemo<AuthState>(
    () => ({
      token: auth?.token ?? null,
      name: auth?.name ?? null,
      role: auth?.role ?? null,
      isSteward: auth?.role === "steward",
      signIn: (r) =>
        setAuth({ token: String(r.authToken), name: String(r.name), role: String(r.role) }),
      signOut: () => setAuth(null),
    }),
    [auth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
