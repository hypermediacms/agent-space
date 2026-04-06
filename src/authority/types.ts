// C4 — Human Authority Primacy types

export interface Escalation {
  id: number;
  agent_slug: string;
  delegation_id: number | null;
  context: string;
  options: string;
  recommendation: string;
  status: "pending" | "resolved" | "deferred";
  decision: string;
  created_at: string;
  resolved_at: string | null;
}

export interface MutationProposal {
  id: number;
  agent_slug: string;
  delegation_id: number | null;
  resource: string;
  change_type: "create" | "modify" | "delete";
  change_detail: string;
  rationale: string;
  status: "pending" | "approved" | "rejected";
  action_token: string;
  created_at: string;
  resolved_at: string | null;
}
