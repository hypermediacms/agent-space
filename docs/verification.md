# Agent Space — Verification Guide

## Running the Verification Suite

```bash
bun test tests/verification.test.ts
```

## What It Tests

### Constraint Tests (9 tests)

| Test | Constraint | Verification |
|------|-----------|--------------|
| Agent identity persists | C1 | Identity survives service reinstantiation |
| Persona retained | C1 | Active persona loaded with agent |
| Identity context assembles | C1 | Prompt context includes identity and persona |
| Concurrency semaphore | C2 | Third acquire blocks when limit is 2 |
| Sandbox status | C2 | Reports active/waiting counts |
| Delegation succeeds for ready | C3 | Ready agent accepts delegation |
| Delegation rejected for non-ready | C3 | Running agent rejects delegation |
| Self-delegation rejected | C3 | Agent cannot delegate to itself |
| Agent state machine | C3 | ready→running→ready on complete/fail |
| Escalation creates structured record | C4a | Pending escalation with context/options/recommendation |
| Mutation requires signed token | C4b | Approval succeeds with correct token, fails with invalid |
| Memory importance hierarchy | C5 | Critical memories prioritized, capacity bounded |
| Merkle tree deterministic | C6 | Same data (any order) produces same root |
| Merkle tree detects change | C6 | Different data produces different root |
| Attestation created and signed | C6 | Non-empty signature and 64-char hex merkle root |
| Conversation creation | C7 | Idle state, participants recorded |
| Round requires idle state | C7 | Cannot start round during active round |
| Messages recorded | C7 | Human messages appear in transcript |

### Property Tests (6 tests)

| Test | Property | Verification |
|------|----------|--------------|
| P1 Trustworthy Autonomy | Structural bounds exist; self-delegation rejected |
| P2 Structured Collaboration | Escalations have formal structure; conversations have defined shape |
| P3 Persistent Identity | Same identity across service instantiations |
| P4 Bounded Capability | Execution bounds set at construction, not configurable at runtime |
| P5 Cryptographic Accountability | Attestations have signatures, merkle roots, checksums |
| P6 Collaborative Emergence | Multi-agent conversation with role differentiation |

## Cross-Implementation Verification

Both Agent Space (TypeScript/presto-ts) and Home Agent Space (PHP/Origen) implement the same 7 constraints. To verify cross-implementation:

1. Run the verification suite against Agent Space: `bun test tests/verification.test.ts`
2. Confirm the same constraints hold in Home Agent Space by inspection or equivalent tests
3. If both implementations pass, the constraints are real — not artifacts of the implementation
