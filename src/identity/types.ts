// C1 — Agent Identity as Durable State

export interface Agent {
  id: number;
  slug: string;
  name: string;
  role: string;
  capabilities: string[];
  behavioral_style: string;
  status: "ready" | "running" | "paused" | "retired";
  active_persona_id: number | null;
  created_at: string;
}

export interface Persona {
  id: number;
  slug: string;
  name: string;
  tone: string;
  traits: string;
  system_prompt: string;
  created_at: string;
}

export interface AgentWithPersona extends Agent {
  persona: Persona | null;
}
