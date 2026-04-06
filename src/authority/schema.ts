// C4 — Authority table schemas

export const ESCALATION_DDL = `
CREATE TABLE IF NOT EXISTS escalation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_slug TEXT NOT NULL,
  delegation_id INTEGER,
  context TEXT NOT NULL DEFAULT '',
  options TEXT NOT NULL DEFAULT '',
  recommendation TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  decision TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
)`;

export const MUTATION_PROPOSAL_DDL = `
CREATE TABLE IF NOT EXISTS mutation_proposal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_slug TEXT NOT NULL,
  delegation_id INTEGER,
  resource TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'modify',
  change_detail TEXT NOT NULL DEFAULT '',
  rationale TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  action_token TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
)`;
