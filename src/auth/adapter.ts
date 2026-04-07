// Auth Adapter Interface
//
// The boundary between third-party auth libraries and the PRESTO pipeline.
// Same pattern as ContentAdapter for storage — the adapter wraps the library,
// the module consumes the adapter, the pipeline is indifferent.
//
// Any auth library (better-auth, lucia, arctic, passport) can be wrapped
// in an AuthAdapter. The module only sees the adapter interface.

import type { HtxRequest } from "../../../presto-ts/src/types";

export interface AuthUser {
  userId: string;
  username: string;
  role: string;
  email?: string;
  image?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: Date;
}

export interface AuthAdapter {
  // Resolve identity from an incoming request.
  // The adapter reads whatever credential the library uses (cookie, header, etc.)
  // and returns the identity or null.
  resolveSession(request: HtxRequest): Promise<AuthSession | null>;

  // Handle library-managed routes (OAuth callbacks, verification, etc.)
  // Returns a Response if the route was handled, null if not.
  handleAuthRoute(request: Request): Promise<Response | null>;

  // Issue a session after successful authentication.
  // Returns the session (with token) and any response headers (Set-Cookie, etc.)
  issueSession(user: AuthUser): Promise<{ session: AuthSession; headers?: Record<string, string> }>;

  // Revoke a session (logout).
  revokeSession(token: string): Promise<void>;
}
