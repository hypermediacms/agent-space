// Agent Space — Human-Agent Coordination Server
// Built on presto-ts. Derived from essential constraints.
// Auth: stateless signed tokens, no cookies, no sessions.

import { PrestoEngine } from "../presto-ts/src/engine";
import { SqliteAdapter } from "../presto-ts/src/adapters/sqlite";
import { HtxResponse, type HtxRequest } from "../presto-ts/src/types";
import {
  createRequestIdModule,
  createLoggerModule,
  createCorsModule,
  createSecurityModule,
  createErrorHandlerModule,
  createHealthModule,
} from "../presto-ts/modules/index";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { createAgentIdentityModule } from "./src/identity/module";
import { AGENT_DDL, PERSONA_DDL, SEED_PERSONA, SEED_AGENT } from "./src/identity/schema";
import { createDelegationModule } from "./src/delegation/module";
import { DELEGATION_DDL } from "./src/delegation/schema";
import { createMemoryModule } from "./src/memory/module";
import { createAuthorityModule } from "./src/authority/module";
import { ESCALATION_DDL, MUTATION_PROPOSAL_DDL } from "./src/authority/schema";
import { createAttestationModule } from "./src/attestation/module";
import { createCoordinationModule } from "./src/coordination/module";
import { createTokenAuthModule } from "./src/auth/module";
import { createCookieAuthModule, COOKIE_NAME } from "./src/auth/cookie-auth";
import { createHybridAuthModule } from "./src/auth/hybrid-auth";
import { TokenAuthService } from "./src/auth/token-auth";
import { createAdapterAuthModule, preResolveSession } from "./src/auth/adapter-auth";
import { createBetterAuthAdapter } from "./src/auth/adapters/better-auth";
import type { AuthAdapter } from "./src/auth/adapter";

const PORT = parseInt(process.env.PORT || "4050");
const SECRET = process.env.SECRET || "agent-space-secret-key";
const ROOT = import.meta.dir;
const TEMPLATES = join(ROOT, "pages");
const PUBLIC = join(ROOT, "public");
const DB = join(ROOT, "data/agent-space.db");

// --- Database ---
mkdirSync(join(ROOT, "data"), { recursive: true });
const adapter = new SqliteAdapter(DB);

// Schema initialization
adapter.exec(AGENT_DDL);
adapter.exec(PERSONA_DDL);
adapter.exec(SEED_PERSONA);
adapter.exec(SEED_AGENT);
adapter.exec(DELEGATION_DDL);
adapter.exec(ESCALATION_DDL);
adapter.exec(MUTATION_PROPOSAL_DDL);

// --- Auth ---
const AUTH_MODE = process.env.AUTH_MODE || "token"; // token | cookie | hybrid
const authService = new TokenAuthService(SECRET);

// Module composition: the auth strategy is a module, not a flag.
// Each strategy produces the same output: request.auth = { user: { id, name, role } }
// The pipeline and templates are indifferent to which strategy is composed.
//
// Auth adapter for third-party libraries (resolved below if needed)
let authAdapter: AuthAdapter | null = null;

let authModule;
if (AUTH_MODE === "better-auth") {
  // better-auth: full-featured auth with OAuth, email/password, sessions
  const { betterAuth } = require("better-auth");
  const { Database } = require("bun:sqlite");
  const authDb = new Database(join(ROOT, "data/auth.db"));

  // Create better-auth tables
  authDb.run(`CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE NOT NULL,
    "emailVerified" INTEGER DEFAULT 0, image TEXT,
    "createdAt" TEXT DEFAULT (datetime('now')), "updatedAt" TEXT DEFAULT (datetime('now'))
  )`);
  authDb.run(`CREATE TABLE IF NOT EXISTS "session" (
    id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, "userId" TEXT NOT NULL,
    "expiresAt" TEXT NOT NULL, "ipAddress" TEXT, "userAgent" TEXT,
    "createdAt" TEXT DEFAULT (datetime('now')), "updatedAt" TEXT DEFAULT (datetime('now')),
    FOREIGN KEY ("userId") REFERENCES "user"(id)
  )`);
  authDb.run(`CREATE TABLE IF NOT EXISTS "account" (
    id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL, "accessToken" TEXT, "refreshToken" TEXT,
    "accessTokenExpiresAt" TEXT, "refreshTokenExpiresAt" TEXT,
    scope TEXT, "idToken" TEXT, password TEXT,
    "createdAt" TEXT DEFAULT (datetime('now')), "updatedAt" TEXT DEFAULT (datetime('now')),
    FOREIGN KEY ("userId") REFERENCES "user"(id)
  )`);
  authDb.run(`CREATE TABLE IF NOT EXISTS "verification" (
    id TEXT PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL,
    "expiresAt" TEXT NOT NULL, "createdAt" TEXT DEFAULT (datetime('now')),
    "updatedAt" TEXT DEFAULT (datetime('now'))
  )`);

  const auth = betterAuth({
    database: authDb,
    basePath: "/api/auth",
    baseURL: `http://localhost:${PORT}`,
    secret: SECRET.padEnd(32, SECRET), // Ensure 32+ chars
    emailAndPassword: { enabled: true },
  });
  authAdapter = createBetterAuthAdapter(auth);
  authModule = createAdapterAuthModule(authAdapter);
} else if (AUTH_MODE === "cookie") {
  authModule = createCookieAuthModule(SECRET);
} else if (AUTH_MODE === "hybrid") {
  authModule = createHybridAuthModule(SECRET);
} else {
  authModule = createTokenAuthModule(SECRET);
}

// --- Engine ---
const engine = new PrestoEngine({
  templateDir: TEMPLATES,
  publicDir: PUBLIC,
  secret: SECRET,
  adapter,
  modules: [
    createErrorHandlerModule({ devMode: true }),
    createRequestIdModule(),
    createLoggerModule({ colorize: true }),
    createCorsModule({ origins: ["*"] }),
    createSecurityModule({ hsts: false }),
    createHealthModule({ path: "/healthz" }),
    authModule,
    createAgentIdentityModule(adapter),
    createDelegationModule(adapter),
    createMemoryModule(adapter),
    createAuthorityModule(adapter, SECRET),
    createAttestationModule(adapter, join(ROOT, "keys")),
    createCoordinationModule(adapter),
  ],
});

// --- Request parsing ---
async function parseRequest(req: Request): Promise<HtxRequest> {
  const url = new URL(req.url);
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k] = v; });
  let body: Record<string, unknown> = {};
  let bodyRaw = "";
  if (req.method === "POST") {
    bodyRaw = await req.text();
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("json")) try { body = JSON.parse(bodyRaw); } catch {}
    else if (ct.includes("urlencoded")) {
      for (const p of bodyRaw.split("&")) {
        const [k, ...v] = p.split("=");
        if (k) body[decodeURIComponent(k.replace(/\+/g, " "))] = decodeURIComponent(v.join("=").replace(/\+/g, " "));
      }
    }
  }
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { query[k] = v; });
  const cookies: Record<string, string> = {};
  for (const p of (req.headers.get("cookie") || "").split(";")) {
    const [k, ...v] = p.trim().split("=");
    if (k) cookies[k.trim()] = v.join("=").trim();
  }
  return {
    method: req.method, path: url.pathname, query, headers, cookies,
    body, bodyRaw, contentType: req.headers.get("content-type") || "",
    hxRequest: req.headers.has("hx-request"), auth: null,
  };
}

// --- Server ---
Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);

    // better-auth: route /api/auth/* to the library before the engine
    if (authAdapter) {
      const authResponse = await authAdapter.handleAuthRoute(req);
      if (authResponse) return authResponse;
    }

    // Login POST — handle outside engine (needs async token signing)
    if (url.pathname === "/api/login" && req.method === "POST") {
      try {
        const body = await req.json() as { username?: string; password?: string };
        if (body.username === "admin" && body.password === "presto") {
          const token = await authService.issueToken({
            userId: "admin",
            username: "admin",
            role: "admin",
          });

          const headers: Record<string, string> = { "Content-Type": "application/json" };

          // Cookie mode: set httpOnly cookie alongside the JSON response
          if (AUTH_MODE === "cookie" || AUTH_MODE === "hybrid") {
            headers["Set-Cookie"] = `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`;
          }

          return new Response(JSON.stringify({ success: true, token, authMode: AUTH_MODE }), { headers });
        }
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      } catch {
        return Response.json({ error: "Bad request" }, { status: 400 });
      }
    }

    const htxReq = await parseRequest(req);

    // Pre-resolve session for adapter-based auth (async → stash on request)
    if (authAdapter) {
      await preResolveSession(authAdapter, htxReq);
    }

    const resp = await engine.handle(htxReq);
    return new Response(resp.body, {
      status: resp.status,
      headers: { "Content-Type": resp.contentType, ...resp.headers },
    });
  },
});

// --- API key status ---
if (process.env.ANTHROPIC_API_KEY) console.log("  LLM execution: enabled");
else console.log("  LLM execution: disabled (set ANTHROPIC_API_KEY to enable)");

console.log(`
  Agent Space
  http://0.0.0.0:${PORT}
  Auth: stateless tokens (no cookies)
  Login: POST /api/login { username, password } → { token }
  Access: ?_t=<token> on any URL
`);
