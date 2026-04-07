// better-auth Adapter
//
// Wraps better-auth into the AuthAdapter interface.
// better-auth handles OAuth, email/password, magic links, sessions.
// This adapter translates its output into the system's identity contract.

import type { AuthAdapter, AuthSession } from "../adapter";
import type { HtxRequest } from "../../../../presto-ts/src/types";

// The Auth type from better-auth — we use the runtime shape, not the generic
interface BetterAuthInstance {
  handler: (request: Request) => Promise<Response>;
  api: {
    getSession: (opts: { headers: Headers }) => Promise<{
      session: { token: string; expiresAt: Date; userId: string } | null;
      user: { id: string; name: string; email: string; role?: string; image?: string } | null;
    } | null>;
  };
}

export function createBetterAuthAdapter(auth: BetterAuthInstance): AuthAdapter {
  return {
    async resolveSession(request: HtxRequest): Promise<AuthSession | null> {
      const headers = new Headers();
      for (const [k, v] of Object.entries(request.headers)) {
        if (v) headers.set(k, v);
      }
      // Pass cookies through — better-auth reads its session cookie
      const cookieStr = Object.entries(request.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
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
            role: (result.user as any).role || "user",
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
      if (!url.pathname.startsWith("/api/auth")) return null;
      return auth.handler(request);
    },

    async issueSession(user) {
      // better-auth manages session issuance via its handler endpoints.
      // Sign-in goes through /api/auth/sign-in/email, which sets cookies.
      return {
        session: {
          token: "",
          user,
          expiresAt: new Date(Date.now() + 3600000),
        },
      };
    },

    async revokeSession(): Promise<void> {
      // better-auth handles revocation via /api/auth/sign-out
    },
  };
}
