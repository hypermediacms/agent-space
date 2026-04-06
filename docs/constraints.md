# Agent Space — Constraint-to-Implementation Mapping

## How Constraints Map to Code

| Constraint | Module | Service | Key File |
|---|---|---|---|
| C1 Agent Identity | `agent-identity` | `AgentIdentityService` | `src/identity/service.ts` |
| C2 Execution Sandboxing | `delegation` | `SandboxService` | `src/sandbox/service.ts` |
| C3 Two-Phase Delegation | `delegation` | `DelegationService` | `src/delegation/service.ts` |
| C4a Decision Escalation | `authority` | `EscalationService` | `src/authority/escalation.ts` |
| C4b Mutation Approval | `authority` | `MutationApprovalService` | `src/authority/mutations.ts` |
| C4c Authority Injection | `delegation` | `SandboxService` | `src/sandbox/service.ts:58-62` |
| C5 Bounded Memory | `memory` | `MemoryService` | `src/memory/service.ts` |
| C6 Cryptographic Attestation | `attestation` | `AttestationService` | `src/attestation/service.ts` |
| C7 Multi-Agent Protocol | `coordination` | `CoordinationService` | `src/coordination/service.ts` |

## Storage Pattern

All services use the SqliteAdapter's default content schema (`id, slug, title, body, status, created_at`). Structured data is stored as JSON in the `body` field. This respects the adapter's constraint — no custom DDL needed for most tables.

Exception: `agent`, `persona`, `delegation`, `escalation`, and `mutation_proposal` use custom DDL run at server boot before any adapter operations.

## Module Composition

All modules follow the `createXxxModule(adapter): HtxModule` factory pattern. Each registers context providers (template data) and channel handlers (API endpoints) via the `ModuleRegistry`.
