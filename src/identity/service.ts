// C1 — AgentIdentityService
// Persistent agent identity. Survives restarts. Personas activatable.

import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import type { Agent, Persona, AgentWithPersona } from "./types";

export class AgentIdentityService {
  constructor(private db: SqliteAdapter) {}

  createAgent(slug: string, name: string, role: string, capabilities: string[], style: string): Agent {
    const record = this.db.create("agent", {
      slug, name, role,
      capabilities: JSON.stringify(capabilities),
      behavioral_style: style,
      status: "ready",
    });
    return this.rowToAgent(record);
  }

  getAgent(slug: string): AgentWithPersona | null {
    const record = this.db.get("agent", slug);
    if (!record) return null;
    const agent = this.rowToAgent(record);
    let persona: Persona | null = null;
    if (agent.active_persona_id) {
      const rows = this.db.query({ type: "persona", where: `id = ${agent.active_persona_id}`, limit: 1 });
      if (rows.length) persona = this.rowToPersona(rows[0]);
    }
    return { ...agent, persona };
  }

  listAgents(): Agent[] {
    return this.db.query({ type: "agent", order: "name ASC" }).map(r => this.rowToAgent(r));
  }

  updateStatus(slug: string, status: Agent["status"]): boolean {
    const agent = this.db.get("agent", slug);
    if (!agent) return false;
    return this.db.update("agent", agent.id, { status });
  }

  activatePersona(agentSlug: string, personaSlug: string): boolean {
    const agent = this.db.get("agent", agentSlug);
    const persona = this.db.get("persona", personaSlug);
    if (!agent || !persona) return false;
    return this.db.update("agent", agent.id, { active_persona_id: persona.id });
  }

  createPersona(slug: string, name: string, tone: string, traits: string, systemPrompt: string): Persona {
    const record = this.db.create("persona", {
      slug, name, tone, traits, system_prompt: systemPrompt,
    });
    return this.rowToPersona(record);
  }

  listPersonas(): Persona[] {
    return this.db.query({ type: "persona", order: "name ASC" }).map(r => this.rowToPersona(r));
  }

  assembleIdentityContext(agent: AgentWithPersona): string {
    const lines = [
      `# Agent Identity`,
      `Name: ${agent.name}`,
      `Role: ${agent.role}`,
      `Capabilities: ${agent.capabilities.join(", ")}`,
      `Style: ${agent.behavioral_style}`,
    ];
    if (agent.persona) {
      lines.push("", `# Persona: ${agent.persona.name}`);
      lines.push(`Tone: ${agent.persona.tone}`);
      lines.push(`Traits: ${agent.persona.traits}`);
      if (agent.persona.system_prompt) {
        lines.push("", agent.persona.system_prompt);
      }
    }
    return lines.join("\n");
  }

  private rowToAgent(r: Record<string, unknown>): Agent {
    return {
      id: r.id as number,
      slug: r.slug as string,
      name: r.name as string,
      role: r.role as string,
      capabilities: JSON.parse((r.capabilities as string) || "[]"),
      behavioral_style: (r.behavioral_style as string) || "",
      status: (r.status as Agent["status"]) || "ready",
      active_persona_id: (r.active_persona_id as number) || null,
      created_at: r.created_at as string,
    };
  }

  private rowToPersona(r: Record<string, unknown>): Persona {
    return {
      id: r.id as number,
      slug: r.slug as string,
      name: r.name as string,
      tone: (r.tone as string) || "",
      traits: (r.traits as string) || "",
      system_prompt: (r.system_prompt as string) || "",
      created_at: r.created_at as string,
    };
  }
}
