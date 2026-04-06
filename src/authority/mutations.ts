// C4b — Mutation Approval Service
// Agent-proposed mutations require human approval via signed action tokens.
// Mirrors PRESTO's server-embedded authorization at the coordination level.

import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import { ActionTokenService } from "../../../presto-ts/src/security/tokens";
import type { MutationProposal } from "./types";

export class MutationApprovalService {
  private tokenService: ActionTokenService;

  constructor(private db: SqliteAdapter, secret: string) {
    this.tokenService = new ActionTokenService(secret, 3600);
  }

  async propose(
    agentSlug: string,
    delegationId: number | null,
    resource: string,
    changeType: MutationProposal["change_type"],
    changeDetail: string,
    rationale: string,
  ): Promise<MutationProposal> {
    // Generate approval token — the human must submit this to approve
    const token = await this.tokenService.issue(
      "approve-mutation",
      "mutation_proposal",
      undefined,
      { sub: "system", ttl: 3600 },
    );

    const record = this.db.create("mutation_proposal", {
      agent_slug: agentSlug,
      delegation_id: delegationId,
      resource, change_type: changeType,
      change_detail: changeDetail,
      rationale, status: "pending",
      action_token: token,
    });

    return this.rowToProposal(record);
  }

  async approve(id: number, token: string): Promise<boolean> {
    const proposal = this.get(id);
    if (!proposal || proposal.status !== "pending") return false;

    // Verify the action token
    const verified = await this.tokenService.verify(token);
    if (!verified) return false;

    return this.db.update("mutation_proposal", id, {
      status: "approved",
      resolved_at: new Date().toISOString(),
    });
  }

  reject(id: number, reason?: string): boolean {
    return this.db.update("mutation_proposal", id, {
      status: "rejected",
      rationale: reason || "",
      resolved_at: new Date().toISOString(),
    });
  }

  get(id: number): MutationProposal | null {
    const rows = this.db.query({ type: "mutation_proposal", where: `id = ${id}`, limit: 1 });
    return rows.length ? this.rowToProposal(rows[0]) : null;
  }

  listPending(): MutationProposal[] {
    return this.db.query({ type: "mutation_proposal", where: "status = 'pending'", order: "created_at ASC" })
      .map(r => this.rowToProposal(r));
  }

  listAll(limit = 20): MutationProposal[] {
    return this.db.query({ type: "mutation_proposal", order: "created_at DESC", limit })
      .map(r => this.rowToProposal(r));
  }

  private rowToProposal(r: Record<string, unknown>): MutationProposal {
    return {
      id: r.id as number,
      agent_slug: r.agent_slug as string,
      delegation_id: (r.delegation_id as number) || null,
      resource: (r.resource as string) || "",
      change_type: (r.change_type as MutationProposal["change_type"]) || "modify",
      change_detail: (r.change_detail as string) || "",
      rationale: (r.rationale as string) || "",
      status: r.status as MutationProposal["status"],
      action_token: (r.action_token as string) || "",
      created_at: r.created_at as string,
      resolved_at: (r.resolved_at as string) || null,
    };
  }
}
