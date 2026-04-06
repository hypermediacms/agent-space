// C1 — Agent and Persona table schemas

export const AGENT_DDL = `
CREATE TABLE IF NOT EXISTS agent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  capabilities TEXT NOT NULL DEFAULT '[]',
  behavioral_style TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ready',
  active_persona_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const PERSONA_DDL = `
CREATE TABLE IF NOT EXISTS persona (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT '',
  traits TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const SEED_PERSONA = `
INSERT OR IGNORE INTO persona (slug, name, tone, traits, system_prompt)
VALUES ('default', 'Default', 'professional and concise', 'helpful, precise, honest',
  'You are a collaborative AI agent. You work within defined constraints, escalate consequential decisions to humans, and maintain accountability for your actions.')`;

export const SEED_AGENT = `
INSERT OR IGNORE INTO agent (slug, name, role, capabilities, behavioral_style, active_persona_id)
VALUES ('assistant', 'Assistant', 'general-purpose', '["research","code","analysis"]', 'methodical',
  (SELECT id FROM persona WHERE slug = 'default'))`;
