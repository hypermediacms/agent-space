// Agent Space — Human-Agent Coordination Server
// Built on presto-ts. Derived from essential constraints.

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
// Memory uses adapter's default schema (body=JSON) — no custom DDL needed
adapter.exec(ESCALATION_DDL);
adapter.exec(MUTATION_PROPOSAL_DDL);
// Attestation uses adapter's default schema (body=JSON) — no custom DDL needed

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
    const htxReq = await parseRequest(req);
    const resp = await engine.handle(htxReq);
    return new Response(resp.body, {
      status: resp.status,
      headers: { "Content-Type": resp.contentType, ...resp.headers },
    });
  },
});

console.log(`
  Agent Space
  http://0.0.0.0:${PORT}
`);
