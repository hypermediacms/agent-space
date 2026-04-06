# Agent Space: Essential Constraints for Human-Agent Coordination

**Jared Foy**
**April 2026**

*A constraint specification for trustworthy human-agent collaborative autonomy, derived from first principles using the nested constraints framework. Implementation-agnostic. Language-agnostic. Platform-agnostic.*

---

## Abstract

This document identifies the minimal set of constraints that, when coherently nested within a governing style, induce the properties required for trustworthy human-agent coordination. It is derived by analyzing an existing empirical system (Home Agent Space) and separating what is essential constraint from what is accidental implementation. The result is a specification that any conformant system — in any language, on any platform — should be able to implement, with the same induced properties emerging independently.

The governing style within which these constraints nest is REST at the transfer level and PRESTO at the construction level. The coordination constraints do not violate either style. They compose with both, adding a third level — the coordination level — that governs how autonomous agents interact with humans, with each other, and with the systems they operate within.

---

## 1. The Three Levels

| Level | Style | Governs | Induced Property |
|-------|-------|---------|------------------|
| Transfer | REST | How representations move between client and server | Representational state transfer |
| Construction | PRESTO | How representations are authored by the engine | Ambivalent execution with agnostic determinism |
| Coordination | Agent Space | How autonomous agents interact within the system | Trustworthy collaborative autonomy |

Each level nests within the one below it. The coordination constraints do not violate PRESTO's construction constraints. PRESTO's constraints do not violate REST's transfer constraints. Properties induced at each level are preserved by the levels above.

---

## 2. Desired Induced Properties

Before identifying constraints, we name what must emerge. These are not features to be built. They are properties that the constraints must induce.

**P1 — Trustworthy Autonomy.** Agents act independently within defined bounds. Their actions are verifiable. Their capabilities are structurally limited, not policy-limited. The system does not trust agents by default — it constrains them into trustworthiness.

**P2 — Structured Collaboration.** Agents and humans coordinate through formal protocols, not ad-hoc communication. Consequential decisions surface to humans. The coordination has a shape — it is not freeform conversation but protocol-governed interaction.

**P3 — Persistent Identity.** Agents maintain coherent identity across sessions. Identity is not ephemeral prompt engineering — it is a durable, ambient context that shapes every interaction. An agent's persona is embodied, not performed.

**P4 — Bounded Capability.** Agents are powerful within defined limits. The limits are structural — enforced by the execution environment, not by instructions the agent may choose to ignore. Capability boundaries are hard, not soft.

**P5 — Cryptographic Accountability.** Agent actions produce verifiable records. State transitions are witnessed. The agent cannot deny what it did, and the system cannot falsely attribute actions to an agent. Accountability is mathematical, not procedural.

**P6 — Collaborative Emergence.** Multiple agents, coordinated by human authority, produce outcomes that no single agent could produce alone. The coordination protocol enables emergence without requiring a central orchestrator to micromanage each agent's contribution.

---

## 3. The Essential Constraints

Seven constraints define the Agent Space style. Each operates at the coordination level. Each is necessary for at least one desired property. None violates the governing styles (REST, PRESTO) within which the coordination level nests.

### C1 — Agent Identity as Durable State

An agent's identity is a persistent, mutable document — not a transient prompt. The identity document is the canonical source of who the agent is. It is loaded into every session as ambient context. It can be updated through a controlled process (persona activation), but it persists between sessions and across restarts.

The identity document declares: name, role, capabilities, behavioral style, and relationship to other agents and humans. It is not a system prompt — it is a self-description that informs the system prompt's construction.

**Why this is a constraint, not an implementation detail:** Without durable identity, agents are stateless between sessions. Stateless agents cannot maintain relationships, cannot develop expertise over time, cannot be held accountable as persistent entities. The constraint is that identity persists. How it persists (flat file, database, distributed store) is implementation.

**Properties induced:** P3 (Persistent Identity), P5 (Cryptographic Accountability — identity is the subject of accountability records).

### C2 — Execution Sandboxing

Agent execution occurs within a bounded environment that structurally prevents unauthorized system access. The sandbox enforces:

- **Temporal bounds:** maximum execution time per session.
- **Resource bounds:** maximum memory, maximum cost (budget cap).
- **Capability bounds:** agent code cannot access filesystem, network, process control, or other system resources except through mediated interfaces.
- **Concurrency bounds:** maximum number of simultaneously executing agents.

These bounds are enforced by the execution environment, not by the agent's instructions. An agent that attempts to exceed its bounds is terminated, not warned.

**Why this is a constraint, not an implementation detail:** The specific bounds (10 seconds vs. 6 hours, 32MB vs. 4GB) are implementation parameters. The constraint is that bounds exist and are structurally enforced. A system without execution sandboxing has no basis for trustworthy autonomy — it relies on the agent choosing to behave, which is not a constraint but a hope.

**Properties induced:** P1 (Trustworthy Autonomy), P4 (Bounded Capability).

### C3 — Two-Phase Delegation

Agent work follows a two-phase pattern: **delegation** (a human or authorized agent assigns a task) and **execution** (the agent performs the task within its sandbox). An agent cannot self-delegate. Work begins only when an authorized delegator initiates it.

The delegation carries: the task description, the delegating authority, the target agent, and any scoping constraints (budget, timeout, permitted capabilities). The execution phase is bounded by these delegation parameters.

An agent's state transitions are: **ready** (available for delegation) → **running** (executing a delegated task) → **ready** (task complete or failed). Only agents in the `ready` state can be delegated to. This prevents reentrancy — an agent cannot be interrupted mid-task by a new delegation.

**Why this is a constraint, not an implementation detail:** Without two-phase delegation, agents can self-initiate work, which breaks human authority. Without state transitions, agents can be multiply-delegated, which breaks execution isolation. The constraint is the phase separation and state machine. How delegation is transmitted (API call, message queue, file write) is implementation.

**Properties induced:** P1 (Trustworthy Autonomy), P2 (Structured Collaboration), P4 (Bounded Capability).

### C4 — Human Authority Primacy

In any interaction involving both humans and agents, the human is the primary authority. This constraint manifests in three sub-constraints:

**C4a — Decision Escalation.** When an agent encounters a decision that is consequential, ambiguous, or outside its declared expertise, it must formally surface the decision to a human rather than proceeding on assumption. The escalation is structured — it includes the decision context, the available options, and the agent's recommendation — not a freeform question.

**C4b — Mutation Approval.** Agent-proposed mutations to shared resources (code, configuration, persistent data) require human approval before application. The agent proposes; the human disposes. The proposal is structured — it includes the specific change, the affected resource, and the rationale.

**C4c — Authority Injection.** In multi-agent coordination, every agent's context includes an explicit declaration that human authority supersedes agent judgment. This is not advisory — it is a structural constraint injected into the agent's operational context at delegation time.

**Why this is a constraint, not an implementation detail:** The specific escalation format (question schema, change proposal format) is implementation. The constraint is that human authority is structurally primary — not because agents are told to defer, but because the system does not execute consequential mutations without human authorization. This is the coordination-level analogue of PRESTO's server-embedded authorization: the system embeds human authority into the coordination protocol itself.

**Properties induced:** P1 (Trustworthy Autonomy), P2 (Structured Collaboration), P6 (Collaborative Emergence).

### C5 — Bounded Memory with Importance Hierarchy

Agents retain information across sessions through a structured memory system. Memory is not unlimited — it is bounded by:

- **Capacity:** a maximum number of memory entries injected into any given session context.
- **Decay:** memory entries lose relevance over time and are eventually pruned.
- **Importance hierarchy:** memory entries are classified by importance (critical, high, medium, low). Higher-importance entries survive longer and are prioritized for injection.

Critical memories (security incidents, human corrections, architectural decisions) persist indefinitely until explicitly removed. Low-importance memories (routine observations, session summaries) decay naturally.

**Why this is a constraint, not an implementation detail:** Without bounded memory, agent context grows unbounded and coherence degrades. Without importance hierarchy, all memories compete equally and critical context is displaced by trivia. The constraint is that memory is bounded and hierarchically organized. The specific capacity (5 entries, 50 entries), decay rate (90 days, 365 days), and storage mechanism are implementation.

**Properties induced:** P3 (Persistent Identity — identity is reinforced by persistent memories), P2 (Structured Collaboration — corrections and decisions are retained), P6 (Collaborative Emergence — shared memories enable multi-session coherence).

### C6 — Cryptographic State Attestation

The system produces periodic attestations of its own state. Each attestation includes:

- A **content hash** (Merkle tree root or equivalent) of the system's content at attestation time.
- A **cryptographic signature** (Ed25519 or equivalent) proving the attestation was produced by the system and has not been tampered with.
- A **delta summary:** what changed since the last attestation — content created, modified, deleted; human interactions; agent actions.

Attestations are append-only. The attestation mechanism itself is checksummed and version-controlled — the verification system cannot be silently modified.

Significant state transitions (errors, security events, anomalies) automatically produce attestations outside the regular schedule.

**Why this is a constraint, not an implementation detail:** Without cryptographic attestation, accountability is based on logs — which can be modified, which do not prove integrity, which require trust in the system operator. The constraint is that state transitions are cryptographically witnessed. The specific hash algorithm, signature scheme, and attestation frequency are implementation.

**Properties induced:** P5 (Cryptographic Accountability), P1 (Trustworthy Autonomy — trust is verified, not assumed).

### C7 — Multi-Agent Coordination Protocol

When multiple agents collaborate on a task or participate in a conversation, their interaction follows a defined protocol:

- **Turn order:** agents contribute in a defined sequence, not concurrently. This prevents race conditions and ensures each agent's contribution builds on the previous one.
- **Shared context:** all participating agents receive the full conversation history and each other's contributions. No agent operates on partial information.
- **Human checkpoints:** between rounds (a complete cycle through all participating agents), the human may intervene, redirect, or terminate the collaboration.
- **Role differentiation:** each agent contributes from its declared expertise. The protocol does not require agents to be interchangeable — it leverages their differences.

**Why this is a constraint, not an implementation detail:** Without a coordination protocol, multi-agent interaction is unstructured — agents may contradict each other, duplicate work, or deadlock. The constraint is that multi-agent interaction has a defined shape (sequential turns, shared context, human checkpoints). The specific turn order algorithm (round-robin, priority-based, directed) is implementation.

**Properties induced:** P2 (Structured Collaboration), P6 (Collaborative Emergence).

---

## 4. The Constraint-Property Matrix

| | P1 Trustworthy Autonomy | P2 Structured Collaboration | P3 Persistent Identity | P4 Bounded Capability | P5 Cryptographic Accountability | P6 Collaborative Emergence |
|---|---|---|---|---|---|---|
| **C1** Agent Identity | | | X | | X | |
| **C2** Execution Sandboxing | X | | | X | | |
| **C3** Two-Phase Delegation | X | X | | X | | |
| **C4** Human Authority Primacy | X | X | | | | X |
| **C5** Bounded Memory | | X | X | | | X |
| **C6** Cryptographic Attestation | X | | | | X | |
| **C7** Multi-Agent Protocol | | X | | | | X |

Every property is induced by at least two constraints. No constraint is redundant — each contributes to at least two properties. The matrix is the minimum covering set.

---

## 5. What Is NOT a Constraint

The following elements of the existing Home Agent Space implementation are NOT essential constraints. They are implementation decisions that may vary across conformant systems:

- **The room metaphor** (Living Room, Study, Workshop, etc.) — a UI organizational pattern, not a coordination constraint.
- **PHP as runtime language** — a language choice. The constraints are language-agnostic.
- **Flat-file Markdown storage** — a storage mechanism. The constraints require persistent identity and memory, not a specific storage format.
- **SQLite as index** — a database choice. Any indexing mechanism that supports the required queries suffices.
- **htmx as client enhancement** — a frontend choice. The constraints operate at the coordination level, not the presentation level.
- **Rufinus/Origen as CMS layer** — a framework choice. The constraints require a construction pipeline (PRESTO), not a specific CMS.
- **Specific room count or room assignments** — organizational choices. The constraints require the capabilities (identity management, memory, execution, coordination) but not their arrangement.
- **The MCP protocol for agent communication** — a transport choice. The constraints require delegation and execution, not a specific wire protocol.
- **Specific budget amounts or timeout values** — parameter choices. The constraints require that bounds exist, not specific values.

---

## 6. Verification Method

A conformant implementation is verified by demonstrating that the seven constraints are present and that the six properties emerge.

### 6.1 Constraint Verification

For each constraint, the verification asks: "Is this constraint structurally enforced?" Not "Is there a policy?" Not "Does the documentation say so?" The constraint must be enforced by the system's architecture, not by the agent's compliance.

| Constraint | Verification Test |
|---|---|
| C1 | Agent identity persists across session boundaries. Restart the system; the agent retains its identity. |
| C2 | An agent cannot exceed its execution bounds. Attempt a forbidden operation; confirm structural rejection. |
| C3 | An agent cannot self-delegate. Attempt to initiate work without delegation; confirm rejection. |
| C4a | An agent surfaces a consequential decision. Present an ambiguous task; confirm structured escalation. |
| C4b | An agent's proposed mutation requires human approval. Propose a change; confirm it is not applied until approved. |
| C4c | Multi-agent context includes human authority declaration. Inspect the assembled prompt; confirm the declaration. |
| C5 | Memory is bounded. Exceed the memory capacity; confirm oldest/lowest entries are displaced. |
| C6 | State attestations are cryptographically signed. Tamper with an attestation; confirm signature verification fails. |
| C7 | Multi-agent interaction follows turn order with human checkpoints. Run a group task; confirm sequential execution and human intervention points. |

### 6.2 Property Verification

For each property, the verification asks: "Does this property emerge from the constraints?" Not "Was this property explicitly implemented?"

| Property | Verification Test |
|---|---|
| P1 | Deploy an agent with malicious instructions. Confirm the constraints prevent unauthorized action regardless of intent. |
| P2 | Run a multi-step task involving human decisions. Confirm the protocol surfaces decisions at the right moments. |
| P3 | Run multiple sessions with the same agent. Confirm behavioral consistency derived from persistent identity and memory. |
| P4 | Attempt to exceed declared capability bounds. Confirm structural enforcement at every boundary. |
| P5 | Audit a sequence of agent actions. Confirm every significant state transition has a cryptographic attestation. |
| P6 | Assign a task requiring multiple agent specialties. Confirm the outcome leverages role differentiation and shared context. |

### 6.3 Cross-Implementation Verification

Build a second conformant implementation in a different language and runtime. Run the same verification suite. If the same properties emerge from the same constraints in a different implementation, the constraints are real — they are not artifacts of the original implementation's language, framework, or architecture.

This is the same verification method used for htxlang: six independent implementations, same specification, same 22 tests, same induced properties. Agent Space applies the method to human-agent coordination.

---

## 7. Relationship to the Governing Styles

### 7.1 Nesting Within PRESTO

Agent Space's constraints nest within PRESTO's construction-level constraints. Specifically:

- **C1 (Agent Identity)** is a content record resolved by the PRESTO pipeline. The identity document is a source representation that the engine resolves into the agent's operational context. The bilateral boundary applies — the identity is consumed by the engine, not exposed to the client.
- **C3 (Two-Phase Delegation)** mirrors PRESTO's two-phase prepare/execute mutation pattern. Delegation is prepare (authorize the task). Execution is execute (perform the task). The same constraint, applied at the coordination level.
- **C4b (Mutation Approval)** is PRESTO's server-embedded authorization applied to agent mutations. The agent's proposed change requires a signed authorization from the human — the same pattern as `htx:action` tokens authorizing form submissions.

### 7.2 Nesting Within REST

Agent Space's constraints nest within REST's transfer-level constraints:

- **C6 (Cryptographic Attestation)** produces representations (attestation records) that are complete, self-describing, and stateless — they carry their own proof of integrity. This is REST's self-describing message constraint applied to accountability.
- **C7 (Multi-Agent Protocol)** operates through representational state transfer — each agent receives a representation (the conversation history plus context), acts on it, and produces a new representation (its response). The state machine of turn-taking is driven by representations, not by shared mutable state.

### 7.3 The Three-Level Composition

The full architecture is:

- **REST** governs transfer: representations move between clients and servers, stateless, cacheable, self-describing.
- **PRESTO** governs construction: representations are authored bilaterally, with server-consumed directives, progressive code-on-demand, and server-embedded authentication and authorization.
- **Agent Space** governs coordination: autonomous agents interact within structurally enforced bounds, with human authority primacy, cryptographic accountability, and formal collaboration protocols.

Three styles. Three levels. Each induces its own property. None violates the others. The composition produces a system where representations are well-transferred (REST), well-authored (PRESTO), and well-coordinated (Agent Space).

---

## 8. Conclusion

Seven constraints. Six induced properties. Zero implementation dependencies.

The constraints are: agent identity as durable state, execution sandboxing, two-phase delegation, human authority primacy, bounded memory with importance hierarchy, cryptographic state attestation, and multi-agent coordination protocol.

The properties they induce are: trustworthy autonomy, structured collaboration, persistent identity, bounded capability, cryptographic accountability, and collaborative emergence.

These constraints are derived from an empirical system (Home Agent Space) by separating what is essential from what is accidental. They are proposed as the minimal set — removing any constraint causes at least two properties to degrade. They are implementation-agnostic — conformant systems may be built in any language, on any platform, with any storage mechanism.

The verification method is cross-implementation: build two conformant systems independently, run the same tests, observe the same properties. If the properties emerge in both, the constraints are real. If they don't, a constraint was missing or an accidental dependency was load-bearing.

The constraints prescribed the properties. The properties prescribed the capabilities. The capabilities prescribed nothing — they emerged.
