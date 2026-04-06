// C7 — Multi-Agent Coordination Service
// Sequential turns, shared context, human checkpoints, role differentiation.

import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import { DelegationService } from "../delegation/service";
import { AgentIdentityService } from "../identity/service";
import { assembleTranscript } from "./transcript";
import type { Conversation, Message } from "./types";

export class CoordinationService {
  private delegationService: DelegationService;
  private identityService: AgentIdentityService;

  constructor(private db: SqliteAdapter) {
    this.delegationService = new DelegationService(db);
    this.identityService = new AgentIdentityService(db);
  }

  createConversation(slug: string, title: string, participants: string[]): Conversation {
    const record = this.db.create("conversation", {
      slug,
      title,
      body: JSON.stringify({ participants, current_round: 0, current_agent_index: 0 }),
      status: "idle",
    });
    return this.recordToConversation(record);
  }

  startRound(conversationSlug: string, humanMessage: string): { success: boolean; error?: string } {
    const conv = this.getConversation(conversationSlug);
    if (!conv) return { success: false, error: "Conversation not found" };
    if (conv.status === "round_in_progress") return { success: false, error: "Round already in progress" };

    const nextRound = conv.current_round + 1;

    // Record human message
    this.addMessage(conversationSlug, nextRound, "human", "human", humanMessage);

    // Update conversation state
    this.updateConversationState(conv.id, {
      status: "round_in_progress",
      current_round: nextRound,
      current_agent_index: 0,
    });

    // Delegate to first agent
    this.delegateToCurrentAgent(conversationSlug);

    return { success: true };
  }

  onAgentComplete(conversationSlug: string, agentSlug: string, output: string): void {
    const conv = this.getConversation(conversationSlug);
    if (!conv || conv.status !== "round_in_progress") return;

    // Record agent message
    this.addMessage(conversationSlug, conv.current_round, "agent", agentSlug, output);

    const nextIndex = conv.current_agent_index + 1;

    if (nextIndex >= conv.participants.length) {
      // Round complete — return to idle, wait for human
      this.updateConversationState(conv.id, {
        status: "idle",
        current_agent_index: 0,
      });
    } else {
      // Delegate to next agent
      this.updateConversationState(conv.id, { current_agent_index: nextIndex });
      this.delegateToCurrentAgent(conversationSlug);
    }
  }

  cancelRound(conversationSlug: string): boolean {
    const conv = this.getConversation(conversationSlug);
    if (!conv || conv.status !== "round_in_progress") return false;
    this.updateConversationState(conv.id, { status: "idle", current_agent_index: 0 });
    return true;
  }

  getConversation(slug: string): Conversation | null {
    const record = this.db.get("conversation", slug);
    return record ? this.recordToConversation(record) : null;
  }

  listConversations(limit = 20): Conversation[] {
    return this.db.query({ type: "conversation", order: "id DESC", limit })
      .map(r => this.recordToConversation(r));
  }

  getMessages(conversationSlug: string): Message[] {
    return this.db.query({
      type: "message",
      where: `slug LIKE '${conversationSlug}/%'`,
      order: "id ASC",
    }).map(r => this.recordToMessage(r));
  }

  getTranscript(conversationSlug: string): string {
    const messages = this.getMessages(conversationSlug);
    return assembleTranscript(messages);
  }

  private delegateToCurrentAgent(conversationSlug: string): void {
    const conv = this.getConversation(conversationSlug);
    if (!conv || conv.status !== "round_in_progress") return;

    const agentSlug = conv.participants[conv.current_agent_index];
    if (!agentSlug) return;

    // Build task with transcript context
    const transcript = this.getTranscript(conversationSlug);
    const participantNames = conv.participants.join(", ");

    const task = [
      `You are participating in a group conversation with: ${participantNames}.`,
      `The human user is the primary authority.`,
      ``,
      `## Conversation so far:`,
      transcript,
      ``,
      `Please provide your contribution.`,
    ].join("\n");

    this.delegationService.delegate({
      delegatorId: "coordination",
      agentSlug,
      task,
    });
  }

  private addMessage(conversationSlug: string, round: number, senderType: string, senderSlug: string, content: string): void {
    this.db.create("message", {
      slug: `${conversationSlug}/${Date.now()}`,
      title: `${senderType}:${senderSlug}`,
      body: JSON.stringify({ conversation_slug: conversationSlug, round, sender_type: senderType, sender_slug: senderSlug, content }),
      status: "sent",
    });
  }

  private updateConversationState(id: number, updates: Partial<{ status: string; current_round: number; current_agent_index: number }>): void {
    const record = this.db.query({ type: "conversation", where: `id = ${id}`, limit: 1 })[0];
    if (!record) return;
    const body = JSON.parse((record.body as string) || "{}");
    if (updates.current_round !== undefined) body.current_round = updates.current_round;
    if (updates.current_agent_index !== undefined) body.current_agent_index = updates.current_agent_index;
    this.db.update("conversation", id, {
      body: JSON.stringify(body),
      ...(updates.status ? { status: updates.status } : {}),
    });
  }

  private recordToConversation(r: Record<string, unknown>): Conversation {
    const body = JSON.parse((r.body as string) || "{}");
    return {
      id: r.id as number,
      slug: r.slug as string,
      title: (r.title as string) || "",
      participants: body.participants || [],
      status: (r.status as Conversation["status"]) || "idle",
      current_round: body.current_round || 0,
      current_agent_index: body.current_agent_index || 0,
      created_at: r.created_at as string,
    };
  }

  private recordToMessage(r: Record<string, unknown>): Message {
    const body = JSON.parse((r.body as string) || "{}");
    return {
      id: r.id as number,
      conversation_slug: body.conversation_slug || "",
      round: body.round || 0,
      sender_type: body.sender_type || "human",
      sender_slug: body.sender_slug || "",
      content: body.content || "",
      created_at: r.created_at as string,
    };
  }
}
