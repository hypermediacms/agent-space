// Native Token Adapter
//
// Wraps our own TokenAuthService into the AuthAdapter interface.
// This proves the adapter pattern works — even our own auth system
// is just an adapter. The pipeline doesn't know the difference
// between this and better-auth.

import type { AuthAdapter, AuthSession } from "../adapter";
import type { HtxRequest } from "../../../../presto-ts/src/types";
import { tokenVerifySync } from "../../../../presto-ts/src/security/hmac";
import { extractToken, TokenAuthService } from "../token-auth";

export function createNativeTokenAdapter(secret: string): AuthAdapter {
  const service = new TokenAuthService(secret);

  return {
    async resolveSession(request: HtxRequest): Promise<AuthSession | null> {
      const token = extractToken(request.query, request.headers);
      if (!token) return null;

      const payload = tokenVerifySync(token, secret);
      if (!payload) return null;

      return {
        token,
        expiresAt: new Date((payload.exp as number) * 1000),
        user: {
          userId: (payload.sub as string) || "",
          username: (payload.username as string) || "",
          role: (payload.role as string) || "user",
        },
      };
    },

    async handleAuthRoute(): Promise<Response | null> {
      // Native token auth has no library-managed routes.
      // Login is handled by /api/login in server.ts.
      return null;
    },

    async issueSession(user) {
      const token = await service.issueToken(user);
      return {
        session: {
          token,
          user,
          expiresAt: new Date(Date.now() + 3600000),
        },
      };
    },

    async revokeSession(): Promise<void> {
      // Stateless — nothing to revoke. Token expires naturally.
    },
  };
}
