# Agent Space: Master Implementation Plan

**Status:** COMPLETE

---

## Overview

Build Agent Space as a presto-ts application — a second conformant implementation of the 7 essential constraints (C1-C7) for human-agent coordination. The goal is cross-implementation verification: same constraints as Home Agent Space (PHP/Origen/Rufinus), different implementation (TypeScript/presto-ts), same induced properties (P1-P6).

## Architecture Decisions

1. **Sibling application to presto-ts**, not a fork. Imports engine, types, security, adapters, and modules from presto-ts via relative path.
2. **SQLite** for persistence via presto-ts's SqliteAdapter. All records in SQLite, not flat-file markdown.
3. **Ed25519** for attestation signatures via `@noble/ed25519` or native crypto.
4. **LLM execution** via presto-ts's Claude client (`src/llm/claude.ts`).
5. **No room metaphor, no MCP protocol.** These are accidental implementation from home-agent-space.

## Phase Summary

| Phase | Constraints | Properties | Status |
|-------|-------------|------------|--------|
| 1 | (scaffold) | -- | COMPLETE |
| 2 | C1: Agent Identity | P3, P5 | COMPLETE |
| 3 | C2+C3: Sandbox + Delegation | P1, P2, P4 | COMPLETE |
| 4 | C5: Bounded Memory | P3, P2, P6 | COMPLETE |
| 5 | C4: Human Authority | P1, P2, P6 | COMPLETE |
| 6 | C6: Attestation | P5, P1 | COMPLETE |
| 7 | C7: Multi-Agent Protocol | P2, P6 | COMPLETE |
| 8 | (verification) | P1-P6 | COMPLETE |

---

## Phase 1: Application Scaffold

**Goal:** Running presto-ts app on port 4050 with SQLite, layout, index page, standard modules.

**Files:**
- `server.ts` — Entry point (modeled on presto-ts/editor/server.ts)
- `pages/_layout.htx` — Base layout
- `pages/index.htx` — Dashboard
- `public/css/` — presto-ui.css
- `public/js/` — presto-signals.js
- `package.json`, `tsconfig.json`

**Done when:** `bun server.ts` serves the index page, `/healthz` responds.

---

## Phase 2: Agent Identity (C1)

**Goal:** Persistent agent identity in SQLite. Personas. Identity survives restarts.

**Files:**
- `src/identity/types.ts` — Agent, Persona interfaces
- `src/identity/service.ts` — AgentIdentityService
- `src/identity/module.ts` — createAgentIdentityModule()
- `src/identity/schema.ts` — DDL
- `pages/agents/index.htx`, `pages/agents/[slug]/index.htx`

**Done when:** Create agent, restart server, agent persists with identity intact.

---

## Phase 3: Execution Sandboxing + Two-Phase Delegation (C2, C3)

**Goal:** Bounded execution (timeout, budget, concurrency). Delegation state machine (ready→running→ready). No self-delegation.

**Files:**
- `src/delegation/types.ts`, `service.ts`, `module.ts`, `schema.ts`
- `src/sandbox/service.ts`, `semaphore.ts`
- `pages/delegations/index.htx`, `pages/delegations/[id]/index.htx`

**Done when:** Delegation rejected for non-ready agent. Execution terminates at timeout. Concurrency cap enforced.

---

## Phase 4: Bounded Memory (C5)

**Goal:** Structured memory with importance hierarchy, decay, capacity limits.

**Files:**
- `src/memory/types.ts`, `service.ts`, `module.ts`, `schema.ts`
- `pages/memory/index.htx`

**Modify:** `src/sandbox/service.ts` — inject memories into prompt.

**Done when:** Capacity limit enforced. Decay prunes expired entries. Critical memories never displaced.

---

## Phase 5: Human Authority Primacy (C4)

**Goal:** Decision escalation, mutation approval via signed tokens, authority injection in all prompts.

**Files:**
- `src/authority/types.ts`, `escalation.ts`, `mutations.ts`, `module.ts`, `schema.ts`
- `pages/approvals/index.htx`, `pages/approvals/[id]/index.htx`

**Modify:** `src/sandbox/service.ts` — inject authority declaration. `src/delegation/service.ts` — route mutations through approval.

**Done when:** Mutations require human-signed approval token. Prompts contain authority declaration. Escalations surface to dashboard.

---

## Phase 6: Cryptographic Attestation (C6)

**Goal:** Merkle tree content hashes, Ed25519 signed attestations, self-checksumming, well-known endpoints.

**Files:**
- `src/attestation/types.ts`, `merkle.ts`, `signer.ts`, `checksum.ts`, `service.ts`, `module.ts`, `schema.ts`
- `pages/attestations/index.htx`

**Modify:** `server.ts` — well-known endpoint routing.

**Done when:** Attestation created, tampered content detected, self-checksum verified, `/.well-known/cognition-attestation.json` serves.

---

## Phase 7: Multi-Agent Coordination (C7)

**Goal:** Sequential turn-taking, shared context, human checkpoints, role differentiation.

**Files:**
- `src/coordination/types.ts`, `service.ts`, `module.ts`, `schema.ts`, `transcript.ts`
- `pages/conversations/index.htx`, `pages/conversations/[id]/index.htx`

**Modify:** `src/delegation/service.ts` — completion callbacks. `src/sandbox/service.ts` — conversation context.

**Done when:** 3-agent group conversation executes sequentially, shared context verified, human checkpoint between rounds.

---

## Phase 8: Verification Suite

**Goal:** Formal test suite for all constraints and properties. Cross-implementation verification script.

**Files:**
- `tests/verification.test.ts` — 9 constraint + 6 property tests
- `tests/cross-verify.ts` — Cross-implementation script
- `docs/constraints.md`, `docs/verification.md`

**Done when:** All tests pass. Cross-verification confirms home-agent-space satisfies same constraints.

---

## Execution Log

- [x] Phase 1: Scaffold — running on :4050, healthz, layout, dashboard (2026-04-06)
- [x] Phase 2: Agent Identity (C1) — AgentIdentityService, personas, seed agent, template page (2026-04-06)
- [x] Phase 3: Sandbox + Delegation (C2, C3) — DelegationService, SandboxService, semaphore, state machine (2026-04-06)
- [x] Phase 4: Bounded Memory (C5) — MemoryService, importance hierarchy, decay, capacity limit, prompt injection (2026-04-06)
- [x] Phase 5: Human Authority (C4) — EscalationService, MutationApprovalService with action tokens, authority injection (2026-04-06)
- [x] Phase 6: Attestation (C6) — MerkleTree, Ed25519 Signer, core checksum, JSON-in-body storage (2026-04-06)
- [x] Phase 7: Coordination (C7) — CoordinationService, sequential turns, shared transcript, human checkpoints (2026-04-06)
- [x] Phase 8: Verification suite — 36 tests, 0 failures. All 7 constraints verified, all 6 properties confirmed (2026-04-06)
