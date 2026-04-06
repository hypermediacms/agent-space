// Stateless Token Authentication
// No cookies. No sessions. The representation IS the session.
//
// Every request carries a signed token (URL param `_t` or Authorization header).
// The server verifies, resolves identity, and embeds fresh tokens in the
// resolved representation. Each page's links carry the next token.
//
// This implements the dissertation's Section 3.5: Server-Embedded Authentication
// and Authorization — unified, stateless, scoped per-request.

import { tokenSign, tokenVerify } from "../../../presto-ts/src/security/hmac";

export interface AuthIdentity {
  userId: string;
  username: string;
  role: string;
}

const DEFAULT_TTL = 3600; // 1 hour

export class TokenAuthService {
  constructor(private secret: string, private ttl = DEFAULT_TTL) {}

  async issueToken(identity: AuthIdentity): Promise<string> {
    return tokenSign(
      {
        sub: identity.userId,
        username: identity.username,
        role: identity.role,
        exp: Math.floor(Date.now() / 1000) + this.ttl,
      },
      this.secret,
    );
  }

  async verifyToken(token: string): Promise<AuthIdentity | null> {
    const payload = await tokenVerify(token, this.secret);
    if (!payload) return null;
    return {
      userId: (payload.sub as string) || "",
      username: (payload.username as string) || "",
      role: (payload.role as string) || "user",
    };
  }

  async issueMagicLink(baseUrl: string, identity: AuthIdentity): Promise<string> {
    const token = await this.issueToken(identity);
    return `${baseUrl}?_t=${token}`;
  }
}

// Extract token from request: URL param `_t` or Authorization: Bearer header
export function extractToken(query: Record<string, string>, headers: Record<string, string>): string | null {
  if (query._t) return query._t;
  const authHeader = headers.authorization || headers.Authorization || "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
}
