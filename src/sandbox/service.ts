// C2 — Execution Sandbox Service
// Structural bounds: temporal (timeout), resource (budget), concurrency (semaphore).
// Wraps LLM execution. On bound violation: terminate, mark failed.

import { ConcurrencySemaphore } from "./semaphore";
import { DelegationService } from "../delegation/service";
import { AgentIdentityService } from "../identity/service";
import { MemoryService } from "../memory/service";
import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import type { Delegation } from "../delegation/types";

// Cost estimate: ~$3 per 1M input tokens, ~$15 per 1M output tokens (Claude Sonnet)
const COST_PER_INPUT_TOKEN = 3 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000;

export interface SandboxConfig {
  maxConcurrent?: number;
  anthropicApiKey?: string;
}

export class SandboxService {
  private semaphore: ConcurrencySemaphore;
  private delegationService: DelegationService;
  private identityService: AgentIdentityService;
  private memoryService: MemoryService;
  private apiKey: string;

  constructor(private db: SqliteAdapter, config: SandboxConfig = {}) {
    this.semaphore = new ConcurrencySemaphore(config.maxConcurrent || 3);
    this.delegationService = new DelegationService(db);
    this.identityService = new AgentIdentityService(db);
    this.memoryService = new MemoryService(db);
    this.apiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "";
  }

  async execute(delegation: Delegation): Promise<void> {
    // C2: Concurrency bound — wait for slot
    await this.semaphore.acquire();

    try {
      this.delegationService.markRunning(delegation.id);

      // Assemble prompt
      const agent = this.identityService.getAgent(delegation.agent_slug);
      if (!agent) {
        this.delegationService.fail(delegation.id, "Agent not found");
        return;
      }

      const identityContext = this.identityService.assembleIdentityContext(agent);

      // C4c: Authority injection — unconditional, structural
      const authorityDeclaration = [
        "# Human Authority",
        "Human authority supersedes agent judgment.",
        "Do not proceed with consequential decisions without human approval.",
        "Use the escalation protocol for ambiguous or high-impact choices.",
      ].join("\n");

      // C5: Inject bounded memory context
      const memories = this.memoryService.retrieve(delegation.agent_slug, 5);
      const memoryContext = this.memoryService.formatForContext(memories);

      const systemPrompt = [identityContext, "", authorityDeclaration, "", memoryContext].join("\n");

      // C2: Temporal bound — race execution against timeout
      const timeoutMs = delegation.timeout_seconds * 1000;
      const result = await Promise.race([
        this.callLLM(systemPrompt, delegation.task),
        this.timeout(timeoutMs, delegation.id),
      ]);

      if (result.timedOut) {
        this.delegationService.fail(delegation.id, `Execution timed out after ${delegation.timeout_seconds}s`);
        return;
      }

      // C2: Budget bound — check cost
      const cost = (result.inputTokens * COST_PER_INPUT_TOKEN) + (result.outputTokens * COST_PER_OUTPUT_TOKEN);
      if (cost > delegation.max_budget_usd) {
        this.delegationService.fail(delegation.id, `Budget exceeded: $${cost.toFixed(4)} > $${delegation.max_budget_usd}`);
        return;
      }

      this.delegationService.complete(
        delegation.id,
        result.output,
        result.inputTokens + result.outputTokens,
      );
    } finally {
      this.semaphore.release();
    }
  }

  private async callLLM(systemPrompt: string, task: string): Promise<{
    output: string; inputTokens: number; outputTokens: number; timedOut: false;
  }> {
    if (!this.apiKey) {
      return { output: "[No API key — dry run] Task: " + task, inputTokens: 0, outputTokens: 0, timedOut: false };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: task }],
      }),
    });

    const data = await response.json() as {
      content: { type: string; text: string }[];
      usage: { input_tokens: number; output_tokens: number };
    };

    const output = data.content?.map(c => c.text).join("\n") || "";
    return {
      output,
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
      timedOut: false,
    };
  }

  private timeout(ms: number, delegationId: number): Promise<{ timedOut: true; output: string; inputTokens: number; outputTokens: number }> {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ timedOut: true, output: "", inputTokens: 0, outputTokens: 0 }), ms);
    });
  }

  get status() {
    return {
      active: this.semaphore.currentActive,
      waiting: this.semaphore.currentWaiting,
      hasApiKey: !!this.apiKey,
    };
  }
}
