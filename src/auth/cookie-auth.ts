// Cookie Auth Module — Legacy strategy
// Uses httpOnly signed cookies. Session state is in the cookie payload
// (not server-side), so it's still stateless from the server's perspective.
// But the cookie is ambient — every request to the domain carries it.
//
// Output contract: populates request.auth = { user: { id, name, role } }
// Same shape as token auth. Pipeline and templates are indifferent.

import type { HtxModule, ModuleManifest, ModuleRegistry, HtxRequest } from "../../../presto-ts/src/types";
import { HtxResponse } from "../../../presto-ts/src/types";
import { tokenVerifySync } from "../../../presto-ts/src/security/hmac";

const PUBLIC_PATHS = ["/login", "/healthz", "/api/login"];
const COOKIE_NAME = "as_session";

export function createCookieAuthModule(secret: string): HtxModule {
  return {
    name: () => "cookie-auth",
    manifest: (): ModuleManifest => ({
      trust: "first-party",
      middleware: ["cookie-auth"],
      contextProviders: ["cookie-auth"],
    }),
    boot: (registry: ModuleRegistry) => {
      registry.registerMiddleware({
        name: () => "cookie-auth",
        handle: (request: HtxRequest, next: () => any) => {
          if (PUBLIC_PATHS.some(p => request.path === p || request.path.startsWith(p))) {
            return next();
          }
          if (request.path.startsWith("/css/") || request.path.startsWith("/js/")) {
            return next();
          }

          const token = request.cookies[COOKIE_NAME];
          if (!token) {
            return HtxResponse.redirect("/login");
          }

          const payload = tokenVerifySync(token, secret);
          if (!payload) {
            return HtxResponse.redirect("/login");
          }

          // Same output shape as token auth
          request.auth = {
            user: {
              id: (payload.sub as string) || "",
              name: (payload.username as string) || "",
              role: (payload.role as string) || "user",
            },
          };

          return next();
        },
      });

      registry.registerContextProvider({
        name: () => "cookie-auth",
        resolve: (request: HtxRequest) => ({
          authUser: request.auth?.user || null,
          // No authToken needed — cookies are ambient
          authToken: "",
        }),
      });
    },
  };
}

export { COOKIE_NAME };
