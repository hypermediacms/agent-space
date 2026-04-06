// C4a — Decision Escalation Service
// Agents surface consequential decisions to humans via structured escalations.

import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import type { Escalation } from "./types";

export class EscalationService {
  constructor(private db: SqliteAdapter) {}

  escalate(agentSlug: string, delegationId: number | null, context: string, options: string, recommendation: string): Escalation {
    const record = this.db.create("escalation", {
      agent_slug: agentSlug,
      delegation_id: delegationId,
      context, options, recommendation,
      status: "pending",
    });
    return this.rowToEscalation(record);
  }

  resolve(id: number, decision: string): boolean {
    return this.db.update("escalation", id, {
      status: "resolved",
      decision,
      resolved_at: new Date().toISOString(),
    });
  }

  defer(id: number): boolean {
    return this.db.update("escalation", id, { status: "deferred" });
  }

  listPending(): Escalation[] {
    return this.db.query({ type: "escalation", where: "status = 'pending'", order: "created_at ASC" })
      .map(r => this.rowToEscalation(r));
  }

  listAll(limit = 20): Escalation[] {
    return this.db.query({ type: "escalation", order: "created_at DESC", limit })
      .map(r => this.rowToEscalation(r));
  }

  private rowToEscalation(r: Record<string, unknown>): Escalation {
    return {
      id: r.id as number,
      agent_slug: r.agent_slug as string,
      delegation_id: (r.delegation_id as number) || null,
      context: (r.context as string) || "",
      options: (r.options as string) || "",
      recommendation: (r.recommendation as string) || "",
      status: r.status as Escalation["status"],
      decision: (r.decision as string) || "",
      created_at: r.created_at as string,
      resolved_at: (r.resolved_at as string) || null,
    };
  }
}
