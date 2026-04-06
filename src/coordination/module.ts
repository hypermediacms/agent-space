// C7 — Multi-Agent Coordination Module

import type { HtxModule, ModuleManifest, ModuleRegistry } from "../../../presto-ts/src/types";
import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import { CoordinationService } from "./service";

export function createCoordinationModule(adapter: SqliteAdapter): HtxModule {
  const service = new CoordinationService(adapter);

  return {
    name: () => "coordination",
    manifest: (): ModuleManifest => ({
      trust: "first-party",
      contextProviders: ["conversations"],
      channelHandlers: ["conversations"],
    }),
    boot: (registry: ModuleRegistry) => {
      registry.registerContextProvider({
        name: () => "conversations",
        resolve: () => ({
          conversations: service.listConversations(10),
        }),
      });

      registry.registerChannelHandler({
        name: () => "conversations",
        module: () => "conversations",
        handle: (subpath: string, body: Record<string, unknown>) => {
          switch (subpath) {
            case "create":
              return service.createConversation(
                body.slug as string,
                body.title as string,
                body.participants as string[],
              );
            case "start-round":
              return service.startRound(body.slug as string, body.message as string);
            case "agent-complete":
              service.onAgentComplete(body.slug as string, body.agentSlug as string, body.output as string);
              return { success: true };
            case "cancel-round":
              return { success: service.cancelRound(body.slug as string) };
            case "get":
              return service.getConversation(body.slug as string) || { error: "Not found" };
            case "messages":
              return { messages: service.getMessages(body.slug as string) };
            case "list":
              return { conversations: service.listConversations() };
            default:
              return { error: "Unknown subpath" };
          }
        },
      });
    },
  };
}
