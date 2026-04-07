// better-auth Adapter
//
// Wraps the better-auth library into the AuthAdapter interface.
// better-auth handles OAuth, email/password, magic links, sessions.
// This adapter translates its output into the system's identity contract.
//
// Usage:
//   import { betterAuth } from "better-auth";
//   import { createBetterAuthAdapter } from "./adapters/better-auth";
//
//   const auth = betterAuth({ database, emailAndPassword: { enabled: true } });
//   const adapter = createBetterAuthAdapter(auth);
//   const authModule = createAdapterAuthModule(adapter);

import type { AuthAdapter, AuthUser, AuthSession } from "../adapter";
import type { HtxRequest } from "../../../../presto-ts/src/types";

// better-auth types (from the library)
interface BetterAuth {
  handler: (request: Request) => Promise<Response>;
  api: {
    getSession: (opts: { headers: Headers }) => Promise<{
      session: { token: string; expiresAt: Date; userId: string } | null;
      user: { id: string; name: string; email: string; role?: string; image?: string } | null;
    } | null>;
  };
}

export function createBetterAuthAdapter(auth: BetterAuth): AuthAdapter {
  return {
    async resolveSession(request: HtxRequest): Promise<AuthSession | null> {
      // Build a Headers object from the request
      const headers = new Headers();
      for (const [k, v] of Object.entries(request.headers)) {
        if (v) headers.set(k, v);
      }
      // Include cookies as a header (better-auth reads session cookies)
      const cookieStr = Object.entries(request.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
      if (cookieStr) headers.set("cookie", cookieStr);

      try {
        const result = await auth.api.getSession({ headers });
        if (!result?.session || !result?.user) return null;

        return {
          token: result.session.token,
          expiresAt: new Date(result.session.expiresAt),
          user: {
            userId: result.user.id,
            username: result.user.name || result.user.email,
            role: result.user.role || "user",
            email: result.user.email,
            image: result.user.image,
          },
        };
      } catch {
        return null;
      }
    },

    async handleAuthRoute(request: Request): Promise<Response | null> {
      const url = new URL(request.url);
      // better-auth handles all /api/auth/* routes
      if (!url.pathname.startsWith("/api/auth")) return null;
      return auth.handler(request);
    },

    async issueSession(user: AuthUser): Promise<{ session: AuthSession; headers?: Record<string, string> }> {
      // better-auth manages session issuance internally via its handler.
      // This method is a passthrough — the login flow goes through
      // /api/auth/sign-in, which better-auth handles directly.
      return {
        session: {
          token: "",
          user,
          expiresAt: new Date(Date.now() + 3600000),
        },
      };
    },

    async revokeSession(token: string): Promise<void> {
      // better-auth handles revocation via /api/auth/sign-out
    },
  };
}
