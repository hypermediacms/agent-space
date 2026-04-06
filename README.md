# Agent Space

Human-agent coordination built on [presto-ts](https://github.com/hypermediacms/presto-engine). Seven constraints. Six induced properties. Zero implementation dependencies on the constraint specification.

## What This Is

Agent Space is a coordination system for autonomous AI agents operating under human authority. It implements seven essential constraints derived from the [nested constraints framework](https://github.com/hypermediacms/hypermediaapp.org), producing six emergent properties including trustworthy autonomy, structured collaboration, and cryptographic accountability.

This is the **second conformant implementation** of the essential constraints — a TypeScript/presto-ts system alongside the PHP/Origen system at [home-agent-space](https://github.com/hypermediacms/home-agent-space). Both implement the same constraints; the verification suite confirms the same properties emerge independently.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) runtime (v1.0+)
- [presto-ts](https://github.com/hypermediacms/presto-engine) cloned as a sibling directory

```
parent/
  presto-ts/    ← the engine
  agent-space/  ← this repo
```

### Run

```bash
bun server.ts
```

The server starts on port 4050. Open `http://localhost:4050` to see the dashboard.

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `4050` | Server port |
| `SECRET` | `agent-space-secret-key` | HMAC key for token signing |
| `ANTHROPIC_API_KEY` | _(none)_ | Enables LLM execution in sandbox |

### Test

```bash
bun test tests/verification.test.ts
```

36 tests — 9 constraint verifications, 6 property confirmations, all passing.

## Architecture

Agent Space composes three architectural styles at three levels:

| Level | Style | Governs | Induced Property |
|-------|-------|---------|------------------|
| Transfer | REST | How representations move | Representational state transfer |
| Construction | PRESTO | How representations are authored | Ambivalent execution with agnostic determinism |
| Coordination | Agent Space | How agents interact | Trustworthy collaborative autonomy |

Each level nests within the one below it without violation.

## The Seven Constraints

### C1 — Agent Identity as Durable State

Agents have persistent identity documents stored in SQLite — name, role, capabilities, behavioral style, and an active persona. Identity survives restarts. Personas can be activated to change the agent's operational context.

**Module:** `src/identity/`

### C2 — Execution Sandboxing

Agent execution occurs within bounded environments:

- **Temporal:** configurable timeout per delegation (default 300s)
- **Resource:** budget cap tracked per delegation
- **Concurrency:** semaphore limiting simultaneous executions (default 3)

Bounds are structural — enforced by `Promise.race` and a counting semaphore, not by agent compliance.

**Module:** `src/sandbox/`

### C3 — Two-Phase Delegation

Work follows a two-phase pattern: **delegation** (human or authorized agent assigns a task) then **execution** (agent performs within bounds). Agents cannot self-delegate. State machine enforced: `ready → running → ready`.

**Module:** `src/delegation/`

### C4 — Human Authority Primacy

Three sub-constraints:

- **C4a — Decision Escalation:** agents surface consequential decisions as structured records (context, options, recommendation)
- **C4b — Mutation Approval:** agent-proposed mutations require human approval via HMAC-signed action tokens
- **C4c — Authority Injection:** every agent prompt includes "Human authority supersedes agent judgment" — injected by the system, not advisable by the agent

**Module:** `src/authority/`

### C5 — Bounded Memory with Importance Hierarchy

Agents retain structured memory across sessions:

| Importance | Decay |
|-----------|-------|
| Critical | Never |
| High | 365 days |
| Medium | 90 days |
| Low | 30 days |

Retrieval is capacity-bounded (default 5 entries) and priority-sorted (critical first).

**Module:** `src/memory/`

### C6 — Cryptographic State Attestation

Periodic signed attestations of system state:

- **Merkle tree** (SHA-256) of all content records
- **Ed25519 signature** for non-repudiation
- **Core self-checksum** — the attestation code checksums itself
- **Well-known endpoint** at `/.well-known/cognition-attestation.json`

**Module:** `src/attestation/`

### C7 — Multi-Agent Coordination Protocol

Multiple agents collaborate through sequential turns:

- **Turn order:** agents contribute one at a time, in declared order
- **Shared context:** each agent receives the full transcript
- **Human checkpoints:** conversation returns to idle between rounds
- **Role differentiation:** each agent contributes from its declared expertise

**Module:** `src/coordination/`

## The Six Induced Properties

These are not features. They are consequences of the constraints.

| Property | Emerges From | Verification |
|----------|-------------|--------------|
| **P1 — Trustworthy Autonomy** | C2, C3, C4, C6 | Agent cannot exceed bounds or self-initiate work |
| **P2 — Structured Collaboration** | C3, C4, C5, C7 | Decisions surface formally; interactions have defined shape |
| **P3 — Persistent Identity** | C1, C5 | Same identity across service instantiations |
| **P4 — Bounded Capability** | C2, C3 | Execution limits structural, not configurable at runtime |
| **P5 — Cryptographic Accountability** | C1, C6 | Attestations with signatures and merkle roots |
| **P6 — Collaborative Emergence** | C4, C5, C7 | Multi-agent outcomes via role differentiation |

## Project Structure

```
agent-space/
├── server.ts                    # Entry point — composes all modules
├── package.json
├── tsconfig.json
├── essential-constraints.md     # The constraint specification
├── .plans/
│   └── master-plan.md           # 8-phase implementation plan (COMPLETE)
├── src/
│   ├── identity/                # C1: Agent, Persona, service, module
│   ├── delegation/              # C3: Delegation service, module
│   ├── sandbox/                 # C2: SandboxService, ConcurrencySemaphore
│   ├── memory/                  # C5: MemoryService, module
│   ├── authority/               # C4: Escalation, MutationApproval, module
│   ├── attestation/             # C6: MerkleTree, Signer, Attestation, module
│   └── coordination/            # C7: CoordinationService, transcript, module
├── pages/
│   ├── _layout.htx              # Shared layout with nav
│   ├── index.htx                # Dashboard
│   ├── agents/index.htx
│   ├── delegations/index.htx
│   ├── memory/index.htx
│   ├── approvals/index.htx
│   ├── attestations/index.htx
│   └── conversations/index.htx
├── public/
│   ├── css/                     # presto-ui.css, agent-space.css
│   └── js/                      # presto-signals.js
├── tests/
│   └── verification.test.ts     # 36 tests — constraints + properties
├── docs/
│   ├── constraints.md           # Constraint-to-implementation mapping
│   └── verification.md          # How to run the verification suite
└── data/                        # SQLite database (gitignored, auto-created)
```

## Module Pattern

Every constraint is implemented as an `HtxModule` — presto-ts's extension mechanism. Each module factory follows the same pattern:

```typescript
export function createXxxModule(adapter: SqliteAdapter): HtxModule {
  const service = new XxxService(adapter);
  return {
    name: () => "xxx",
    manifest: () => ({ trust: "first-party", contextProviders: ["xxx"], channelHandlers: ["xxx"] }),
    boot: (registry) => {
      registry.registerContextProvider({ ... });   // Template data
      registry.registerChannelHandler({ ... });    // API endpoints
    },
  };
}
```

Context providers inject data into `.htx` templates. Channel handlers expose API endpoints at `/api/channel/{module}/{subpath}`.

## Cross-Implementation Verification

The essential constraints specification (`essential-constraints.md`) is implementation-agnostic. Two conformant implementations exist:

| Implementation | Language | Framework | Status |
|---------------|----------|-----------|--------|
| **Agent Space** (this repo) | TypeScript | presto-ts | 36/36 tests passing |
| **Home Agent Space** | PHP 8.2 | Origen/Rufinus | Empirical reference |

If both implementations induce the same six properties from the same seven constraints — in different languages, on different frameworks — the constraints are real. They are not artifacts of any particular implementation.

## License

MIT
