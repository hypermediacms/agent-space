// Stateless Auth Module — Cookie-free, REST-compliant
//
// Middleware: extracts token from `_t` param or Authorization header,
// verifies HMAC signature synchronously, sets request.auth.
// Unauthenticated or forged requests redirect to /login.
//
// Context provider: injects `authToken` into every template so the
// representation carries its own credential for the next request.

import type { HtxModule, ModuleManifest, ModuleRegistry, HtxRequest } from "../../../presto-ts/src/types";
import { HtxResponse } from "../../../presto-ts/src/types";
import { tokenVerifySync } from "../../../presto-ts/src/security/hmac";
import { extractToken } from "./token-auth";

const PUBLIC_PATHS = ["/login", "/healthz", "/api/login"];

export function createTokenAuthModule(secret: string): HtxModule {
  return {
    name: () => "token-auth",
    manifest: (): ModuleManifest => ({
      trust: "first-party",
      middleware: ["token-auth"],
      contextProviders: ["token-auth"],
    }),
    boot: (registry: ModuleRegistry) => {
      // Middleware: cryptographically verify token on every request
      registry.registerMiddleware({
        name: () => "token-auth",
        handle: (request: HtxRequest, next: () => any) => {
          // Allow public paths and static assets
          if (PUBLIC_PATHS.some(p => request.path === p || request.path.startsWith(p))) {
            return next();
          }
          if (request.path.startsWith("/css/") || request.path.startsWith("/js/")) {
            return next();
          }

          const token = extractToken(request.query, request.headers);
          if (!token) {
            return HtxResponse.redirect("/login");
          }

          // Full HMAC-SHA256 verification — synchronous, constant-time
          const payload = tokenVerifySync(token, secret);
          if (!payload) {
            return HtxResponse.redirect("/login");
          }

          // Token is cryptographically verified — populate identity
          request.auth = {
            user: {
              id: (payload.sub as string) || "",
              name: (payload.username as string) || "",
              role: (payload.role as string) || "user",
            },
          };

          // Store verified token for context provider
          (request as any)._authToken = token;

          return next();
        },
      });

      // Context provider: inject token into every template
      registry.registerContextProvider({
        name: () => "token-auth",
        resolve: (request: HtxRequest) => {
          return {
            authToken: (request as any)._authToken || "",
            authUser: request.auth?.user || null,
          };
        },
      });
    },
  };
}
