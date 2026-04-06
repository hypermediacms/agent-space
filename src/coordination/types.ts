// C7 — Multi-Agent Coordination types

export interface Conversation {
  id: number;
  slug: string;
  title: string;
  participants: string[];  // agent slugs, ordered
  status: "idle" | "round_in_progress" | "completed";
  current_round: number;
  current_agent_index: number;
  created_at: string;
}

export interface Message {
  id: number;
  conversation_slug: string;
  round: number;
  sender_type: "human" | "agent";
  sender_slug: string;
  content: string;
  created_at: string;
}
