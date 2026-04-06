// C5 — Bounded Memory types

export type MemoryImportance = "critical" | "high" | "medium" | "low";
export type MemoryType = "long-term" | "daily" | "topic" | "state";

export interface Memory {
  id: number;
  agent_slug: string;
  title: string;
  body: string;
  memory_type: MemoryType;
  importance: MemoryImportance;
  created_at: string;
  last_accessed_at: string;
  decay_at: string | null;
}
