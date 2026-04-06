// C5 — Bounded Memory Service
// Importance hierarchy, decay, capacity limits.
// Critical: no decay. High: 365d. Medium: 90d. Low: 30d.

import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import type { Memory, MemoryImportance, MemoryType } from "./types";

const DECAY_DAYS: Record<MemoryImportance, number | null> = {
  critical: null,  // never decays
  high: 365,
  medium: 90,
  low: 30,
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
      agent_slug: agentSlug,
      title,
      body,
      memory_type: type,
      importance,
      decay_at: decayAt,
    });

    return this.rowToMemory(record);
  }

  retrieve(agentSlug: string, limit = 5): Memory[] {
    // Priority cascade: critical first, then high, then by recency
    // This is the structural capacity bound — at most `limit` entries returned
    const all = this.db.query({
      type: "memory",
      where: `agent_slug = '${agentSlug}' AND (decay_at IS NULL OR decay_at > datetime('now'))`,
      order: `CASE importance WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, last_accessed_at DESC`,
      limit,
    }).map(r => this.rowToMemory(r));

    // Update last_accessed_at for retrieved memories
    for (const m of all) {
      this.db.update("memory", m.id, { last_accessed_at: new Date().toISOString() });
    }

    return all;
  }

  prune(): number {
    // Remove expired entries (past decay_at)
    const expired = this.db.query({
      type: "memory",
      where: "decay_at IS NOT NULL AND decay_at < datetime('now')",
    });
    for (const r of expired) {
      this.db.delete("memory", r.id as number);
    }
    return expired.length;
  }

  listForAgent(agentSlug: string): Memory[] {
    return this.db.query({
      type: "memory",
      where: `agent_slug = '${agentSlug}'`,
      order: "created_at DESC",
    }).map(r => this.rowToMemory(r));
  }

  listAll(limit = 50): Memory[] {
    return this.db.query({
      type: "memory",
      order: "created_at DESC",
      limit,
    }).map(r => this.rowToMemory(r));
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

  private rowToMemory(r: Record<string, unknown>): Memory {
    return {
      id: r.id as number,
      agent_slug: r.agent_slug as string,
      title: (r.title as string) || "",
      body: (r.body as string) || "",
      memory_type: (r.memory_type as MemoryType) || "long-term",
      importance: (r.importance as MemoryImportance) || "medium",
      created_at: r.created_at as string,
      last_accessed_at: r.last_accessed_at as string,
      decay_at: (r.decay_at as string) || null,
    };
  }
}
