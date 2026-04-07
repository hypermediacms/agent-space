// Adapter-Based Auth Module
//
// Wraps any AuthAdapter (better-auth, lucia, etc.) into an HtxModule.
// The adapter handles the library-specific logic. The module handles
// the pipeline integration. The pipeline sees only request.auth.

import type { HtxModule, ModuleManifest, ModuleRegistry, HtxRequest } from "../../../presto-ts/src/types";
import { HtxResponse } from "../../../presto-ts/src/types";
import type { AuthAdapter, AuthSession } from "./adapter";

const PUBLIC_PATHS = ["/login", "/healthz", "/api/login", "/api/auth"];

export function createAdapterAuthModule(adapter: AuthAdapter): HtxModule {
  // Cache resolved sessions per-request (keyed by token)
  // This is NOT server-side session state — it's a per-request memo
  // that prevents calling resolveSession twice for the same request.
  let lastResolved: { token: string; session: AuthSession } | null = null;

  return {
    name: () => "adapter-auth",
    manifest: (): ModuleManifest => ({
      trust: "first-party",
      middleware: ["adapter-auth"],
      contextProviders: ["adapter-auth"],
    }),
    boot: (registry: ModuleRegistry) => {
      registry.registerMiddleware({
        name: () => "adapter-auth",
        handle: (request: HtxRequest, next: () => any) => {
          if (PUBLIC_PATHS.some(p => request.path === p || request.path.startsWith(p))) {
            return next();
          }
          if (request.path.startsWith("/css/") || request.path.startsWith("/js/")) {
            return next();
          }

          // The adapter's resolveSession is async, but middleware is sync.
          // We resolve this the same way the pipeline does: the token is
          // verified synchronously (the adapter implementation can use
          // tokenVerifySync internally), and session resolution happens
          // at the server level before the engine handles the request.
          //
          // If the adapter requires async resolution (e.g., database lookup),
          // the session must be resolved in the server's fetch() handler
          // BEFORE engine.handle() is called, and stashed on the request.

          const session = (request as any)._resolvedSession as AuthSession | undefined;
          if (!session) {
            return HtxResponse.redirect("/login");
          }

          request.auth = {
            user: {
              id: session.user.userId,
              name: session.user.username,
              role: session.user.role,
            },
          };

          (request as any)._authToken = session.token;

          return next();
        },
      });

      registry.registerContextProvider({
        name: () => "adapter-auth",
        resolve: (request: HtxRequest) => ({
          authToken: (request as any)._authToken || "",
          authUser: request.auth?.user || null,
        }),
      });
    },
  };

}

// Pre-resolve helper: call this in the server's fetch() before engine.handle()
// to resolve the session asynchronously, then stash it on the request.
export async function preResolveSession(
  adapter: AuthAdapter,
  request: HtxRequest,
): Promise<void> {
  const session = await adapter.resolveSession(request);
  if (session) {
    (request as any)._resolvedSession = session;
  }
}
