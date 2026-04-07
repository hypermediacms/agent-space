// Hybrid Auth Module — Accepts both strategies
// Checks Authorization header first (stateless token), falls back to
// cookie. This allows migration: existing cookie users keep working,
// new integrations (APIs, agents, magic links) use tokens.
//
// Output contract: populates request.auth = { user: { id, name, role } }

import type { HtxModule, ModuleManifest, ModuleRegistry, HtxRequest } from "../../../presto-ts/src/types";
import { HtxResponse } from "../../../presto-ts/src/types";
import { tokenVerifySync } from "../../../presto-ts/src/security/hmac";
import { extractToken } from "./token-auth";
import { COOKIE_NAME } from "./cookie-auth";

const PUBLIC_PATHS = ["/login", "/healthz", "/api/login"];

export function createHybridAuthModule(secret: string): HtxModule {
  return {
    name: () => "hybrid-auth",
    manifest: (): ModuleManifest => ({
      trust: "first-party",
      middleware: ["hybrid-auth"],
      contextProviders: ["hybrid-auth"],
    }),
    boot: (registry: ModuleRegistry) => {
      registry.registerMiddleware({
        name: () => "hybrid-auth",
        handle: (request: HtxRequest, next: () => any) => {
          if (PUBLIC_PATHS.some(p => request.path === p || request.path.startsWith(p))) {
            return next();
          }
          if (request.path.startsWith("/css/") || request.path.startsWith("/js/")) {
            return next();
          }

          // Strategy 1: Authorization header / _t param (stateless token)
          const headerToken = extractToken(request.query, request.headers);
          if (headerToken) {
            const payload = tokenVerifySync(headerToken, secret);
            if (payload) {
              request.auth = {
                user: {
                  id: (payload.sub as string) || "",
                  name: (payload.username as string) || "",
                  role: (payload.role as string) || "user",
                },
              };
              (request as any)._authToken = headerToken;
              (request as any)._authStrategy = "token";
              return next();
            }
          }

          // Strategy 2: Cookie fallback
          const cookieToken = request.cookies[COOKIE_NAME];
          if (cookieToken) {
            const payload = tokenVerifySync(cookieToken, secret);
            if (payload) {
              request.auth = {
                user: {
                  id: (payload.sub as string) || "",
                  name: (payload.username as string) || "",
                  role: (payload.role as string) || "user",
                },
              };
              (request as any)._authStrategy = "cookie";
              return next();
            }
          }

          return HtxResponse.redirect("/login");
        },
      });

      registry.registerContextProvider({
        name: () => "hybrid-auth",
        resolve: (request: HtxRequest) => ({
          authToken: (request as any)._authToken || "",
          authUser: request.auth?.user || null,
          authStrategy: (request as any)._authStrategy || "",
        }),
      });
    },
  };
}
