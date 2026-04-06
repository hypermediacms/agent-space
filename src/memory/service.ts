// C5 — Bounded Memory Service
// Importance hierarchy, decay, capacity limits.
// Uses adapter's default schema: slug, title, body (JSON), status, created_at.

import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import type { Memory, MemoryImportance, MemoryType } from "./types";

const DECAY_DAYS: Record<MemoryImportance, number | null> = {
  critical: null,
  high: 365,
  medium: 90,
  low: 30,
};

const IMPORTANCE_RANK: Record<MemoryImportance, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

export class MemoryService {
  constructor(private db: SqliteAdapter) {}

  record(
    agentSlug: string,
    title: string,
    body: string,
    type: MemoryType = "long-term",
    importance: MemoryImportance = "medium",
  ): Memory {
    const decayDays = DECAY_DAYS[importance];
    const decayAt = decayDays
      ? new Date(Date.now() + decayDays * 86400000).toISOString()
      : null;

    const record = this.db.create("memory", {
      slug: `${agentSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      body: JSON.stringify({
        agent_slug: agentSlug,
        content: body,
        memory_type: type,
        importance,
        last_accessed_at: new Date().toISOString(),
        decay_at: decayAt,
      }),
      status: importance,
    });

    return this.recordToMemory(record);
  }

  retrieve(agentSlug: string, limit = 5): Memory[] {
    const all = this.db.query({ type: "memory", order: "id DESC", limit: 100 })
      .map(r => this.recordToMemory(r))
      .filter(m => m.agent_slug === agentSlug)
      .filter(m => !m.decay_at || new Date(m.decay_at) > new Date());

    // Sort by importance rank, then by recency
    all.sort((a, b) => {
      const rankDiff = IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance];
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return all.slice(0, limit);
  }

  prune(): number {
    const all = this.db.query({ type: "memory", limit: 1000 });
    let pruned = 0;
    for (const r of all) {
      const m = this.recordToMemory(r);
      if (m.decay_at && new Date(m.decay_at) < new Date()) {
        this.db.delete("memory", r.id as number);
        pruned++;
      }
    }
    return pruned;
  }

  listForAgent(agentSlug: string): Memory[] {
    return this.db.query({ type: "memory", order: "id DESC", limit: 100 })
      .map(r => this.recordToMemory(r))
      .filter(m => m.agent_slug === agentSlug);
  }

  listAll(limit = 50): Memory[] {
    return this.db.query({ type: "memory", order: "id DESC", limit })
      .map(r => this.recordToMemory(r));
  }

  formatForContext(memories: Memory[]): string {
    if (!memories.length) return "";
    const lines = ["# Active Memories", ""];
    for (const m of memories) {
      const marker = m.importance === "critical" ? "[CRITICAL] " : m.importance === "high" ? "[HIGH] " : "";
      lines.push(`## ${marker}${m.title}`);
      if (m.body) lines.push(m.body);
      lines.push("");
    }
    return lines.join("\n");
  }

  private recordToMemory(r: Record<string, unknown>): Memory {
    const data = JSON.parse((r.body as string) || "{}");
    return {
      id: r.id as number,
      agent_slug: data.agent_slug || "",
      title: (r.title as string) || "",
      body: data.content || "",
      memory_type: data.memory_type || "long-term",
      importance: data.importance || "medium",
      created_at: r.created_at as string,
      last_accessed_at: data.last_accessed_at || r.created_at as string,
      decay_at: data.decay_at || null,
    };
  }
}
