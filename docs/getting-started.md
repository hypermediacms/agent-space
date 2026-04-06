# Getting Started with Agent Space

This guide walks through setting up Agent Space, creating your first agent, delegating a task, and verifying the system works.

## Setup

### 1. Clone both repos

Agent Space depends on presto-ts as a sibling directory:

```bash
git clone https://github.com/hypermediacms/presto-ts.git presto-ts
git clone https://github.com/hypermediacms/agent-space.git agent-space
```

### 2. Start the server

```bash
cd agent-space
bun server.ts
```

You should see:

```
  Agent Space
  http://0.0.0.0:4050
```

### 3. Open the dashboard

Navigate to `http://localhost:4050`. You'll see six cards — one for each section of the system. A default "Assistant" agent is pre-seeded.

## Your First Agent

### View agents

Open `http://localhost:4050/agents`. The seeded "Assistant" agent appears with role "general-purpose" and status "ready".

### Create an agent via the API

```bash
curl -X POST http://localhost:4050/api/channel/agents/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "slug": "researcher",
    "name": "Researcher",
    "role": "research",
    "capabilities": ["search", "analysis", "summarization"],
    "behavioral_style": "thorough and methodical"
  }'
```

Refresh `/agents` — the new agent appears.

## Delegating Work

### Create a delegation

Delegation follows the two-phase pattern: **delegate** (assign the task), then the sandbox **executes** it.

```bash
curl -X POST http://localhost:4050/api/channel/delegations/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "delegatorId": "human",
    "agentSlug": "assistant",
    "task": "Summarize the key points of REST architecture",
    "maxBudget": 1.0,
    "timeout": 120
  }'
```

The delegation is created with status "pending", then executed asynchronously by the sandbox. If `ANTHROPIC_API_KEY` is set, the sandbox calls Claude. Otherwise, it runs in dry-run mode.

### View delegations

Open `http://localhost:4050/delegations` to see all delegations with their status and output.

### Key constraints enforced

- **No self-delegation:** an agent cannot delegate to itself
- **State machine:** only agents in "ready" status accept delegations
- **Timeout:** execution terminates at the configured limit
- **Budget:** tracked per delegation (token count * cost)
- **Concurrency:** max 3 simultaneous executions

## Recording Memory

Agents retain information across sessions through bounded memory.

```bash
curl -X POST http://localhost:4050/api/channel/memory/record \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "agentSlug": "assistant",
    "title": "REST is an induced property",
    "body": "Representational State Transfer is not a behavior — it is a property induced by REST constraints.",
    "type": "long-term",
    "importance": "high"
  }'
```

View at `http://localhost:4050/memory`.

### Importance hierarchy

| Level | Decay | Context priority |
|-------|-------|-----------------|
| `critical` | Never | Always included |
| `high` | 365 days | Included first |
| `medium` | 90 days | Included if room |
| `low` | 30 days | Included last |

At most 5 memories are injected into each agent's prompt context.

## Human Authority

### Escalations

When an agent encounters a consequential decision, it creates an escalation:

```bash
curl -X POST http://localhost:4050/api/channel/authority/escalate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "agentSlug": "assistant",
    "context": "Should we restructure the database schema?",
    "options": "Option A: migrate incrementally. Option B: full rebuild.",
    "recommendation": "Option A — lower risk"
  }'
```

View pending escalations at `http://localhost:4050/approvals`. Resolve with:

```bash
curl -X POST http://localhost:4050/api/channel/authority/resolve-escalation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{ "id": 1, "decision": "Proceed with Option A" }'
```

### Mutation proposals

Agent-proposed changes to shared resources require human approval via signed action tokens. The system generates a token when the proposal is created; the human must submit that exact token to approve.

## Cryptographic Attestation

The system creates a signed attestation on boot and can create additional attestations on demand:

```bash
curl -X POST http://localhost:4050/api/channel/attestations/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{ "summary": "Manual checkpoint" }'
```

Each attestation includes:
- A SHA-256 Merkle root of all content records
- An Ed25519 signature
- A self-checksum of the attestation source code

View at `http://localhost:4050/attestations`.

## Multi-Agent Conversations

### Create a conversation

```bash
curl -X POST http://localhost:4050/api/channel/conversations/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "slug": "architecture-review",
    "title": "Architecture Review",
    "participants": ["assistant", "researcher"]
  }'
```

### Start a round

```bash
curl -X POST http://localhost:4050/api/channel/conversations/start-round \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "slug": "architecture-review",
    "message": "Review the current API design and suggest improvements."
  }'
```

Agents contribute sequentially in the declared order. After all agents respond, the conversation returns to "idle" and waits for the next human message.

View at `http://localhost:4050/conversations`.

## Running the Verification Suite

```bash
bun test tests/verification.test.ts
```

This runs 36 tests:
- 9 constraint tests verify structural enforcement of C1–C7
- 6 property tests confirm P1–P6 emerge from the constraints

All tests should pass. If any fail, a constraint is not being structurally enforced.

## What's Next

- **Set `ANTHROPIC_API_KEY`** to enable live LLM execution
- **Add the Cloudflare CNAME** for `agents.hypermediaapp.org` → `8a13b815-e549-415c-a368-b1326fa6f8cf.cfargotunnel.com` to make it publicly accessible
- **Create custom personas** to shape agent behavior for specific domains
- **Run cross-implementation verification** against Home Agent Space to confirm constraint portability
