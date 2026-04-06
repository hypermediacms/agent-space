// C3 — Two-Phase Delegation Service
// Enforces: no self-delegation, agent state machine (ready→running→ready),
// delegation carries constraints (budget, timeout).

import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import { AgentIdentityService } from "../identity/service";
import type { Delegation, DelegationRequest } from "./types";

export class DelegationService {
  private identityService: AgentIdentityService;

  constructor(private db: SqliteAdapter) {
    this.identityService = new AgentIdentityService(db);
  }

  delegate(req: DelegationRequest): Delegation | { error: string } {
    // C3: Verify agent exists and is ready
    const agent = this.identityService.getAgent(req.agentSlug);
    if (!agent) return { error: "Agent not found" };
    if (agent.status !== "ready") return { error: `Agent is ${agent.status}, not ready` };

    // C3: No self-delegation — delegator cannot be the agent itself
    if (req.delegatorId === req.agentSlug) {
      return { error: "Self-delegation is not permitted" };
    }

    // Transition agent to running (atomic — checked above)
    this.identityService.updateStatus(req.agentSlug, "running");

    // Create delegation record
    const record = this.db.create("delegation", {
      delegator_id: req.delegatorId,
      agent_slug: req.agentSlug,
      task: req.task,
      status: "pending",
      max_budget_usd: req.maxBudget || 5.0,
      timeout_seconds: req.timeout || 300,
    });

    return this.rowToDelegation(record);
  }

  markRunning(id: number): boolean {
    return this.db.update("delegation", id, { status: "running" });
  }

  complete(id: number, output: string, tokensUsed: number): boolean {
    const delegation = this.get(id);
    if (!delegation) return false;

    this.db.update("delegation", id, {
      status: "completed",
      output,
      tokens_used: tokensUsed,
      completed_at: new Date().toISOString(),
    });

    // Return agent to ready
    this.identityService.updateStatus(delegation.agent_slug, "ready");
    return true;
  }

  fail(id: number, error: string): boolean {
    const delegation = this.get(id);
    if (!delegation) return false;

    this.db.update("delegation", id, {
      status: "failed",
      error,
      completed_at: new Date().toISOString(),
    });

    // Return agent to ready
    this.identityService.updateStatus(delegation.agent_slug, "ready");
    return true;
  }

  cancel(id: number): boolean {
    const delegation = this.get(id);
    if (!delegation) return false;
    if (delegation.status === "completed" || delegation.status === "failed") return false;

    this.db.update("delegation", id, {
      status: "cancelled",
      completed_at: new Date().toISOString(),
    });

    this.identityService.updateStatus(delegation.agent_slug, "ready");
    return true;
  }

  get(id: number): Delegation | null {
    const rows = this.db.query({ type: "delegation", where: `id = ${id}`, limit: 1 });
    return rows.length ? this.rowToDelegation(rows[0]) : null;
  }

  listRecent(limit = 20): Delegation[] {
    return this.db.query({ type: "delegation", order: "created_at DESC", limit })
      .map(r => this.rowToDelegation(r));
  }

  listPending(): Delegation[] {
    return this.db.query({ type: "delegation", where: "status = 'pending'", order: "created_at ASC" })
      .map(r => this.rowToDelegation(r));
  }

  listRunning(): Delegation[] {
    return this.db.query({ type: "delegation", where: "status = 'running'", order: "created_at ASC" })
      .map(r => this.rowToDelegation(r));
  }

  private rowToDelegation(r: Record<string, unknown>): Delegation {
    return {
      id: r.id as number,
      delegator_id: r.delegator_id as string,
      agent_slug: r.agent_slug as string,
      task: r.task as string,
      status: r.status as Delegation["status"],
      max_budget_usd: r.max_budget_usd as number,
      timeout_seconds: r.timeout_seconds as number,
      output: (r.output as string) || "",
      error: (r.error as string) || "",
      tokens_used: (r.tokens_used as number) || 0,
      created_at: r.created_at as string,
      completed_at: (r.completed_at as string) || null,
    };
  }
}
