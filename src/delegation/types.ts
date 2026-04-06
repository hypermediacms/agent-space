// C3 — Two-Phase Delegation types

export interface Delegation {
  id: number;
  delegator_id: string;
  agent_slug: string;
  task: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  max_budget_usd: number;
  timeout_seconds: number;
  output: string;
  error: string;
  tokens_used: number;
  created_at: string;
  completed_at: string | null;
}

export interface DelegationRequest {
  delegatorId: string;
  agentSlug: string;
  task: string;
  maxBudget?: number;
  timeout?: number;
}
