// C7 — Transcript assembly for agent context

import type { Message } from "./types";

export function assembleTranscript(messages: Message[], maxTokens = 8000): string {
  const lines: string[] = [];
  // Estimate ~4 chars per token
  let charBudget = maxTokens * 4;

  for (const msg of messages) {
    const label = msg.sender_type === "human" ? "Human" : msg.sender_slug;
    const line = `[${label} — Round ${msg.round}]\n${msg.content}\n`;
    if (charBudget - line.length < 0) break;
    lines.push(line);
    charBudget -= line.length;
  }

  return lines.join("\n---\n\n");
}
