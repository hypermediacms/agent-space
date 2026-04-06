// C3 — Delegation table schema

export const DELEGATION_DDL = `
CREATE TABLE IF NOT EXISTS delegation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delegator_id TEXT NOT NULL,
  agent_slug TEXT NOT NULL,
  task TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  max_budget_usd REAL NOT NULL DEFAULT 5.0,
  timeout_seconds INTEGER NOT NULL DEFAULT 300,
  output TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
)`;
