// C1 — Agent Identity Module
// HtxModule providing agent/persona data to templates and channel API

import type { HtxModule, ModuleManifest, ModuleRegistry } from "../../../presto-ts/src/types";
import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import { AgentIdentityService } from "./service";

export function createAgentIdentityModule(adapter: SqliteAdapter): HtxModule {
  const service = new AgentIdentityService(adapter);

  return {
    name: () => "agent-identity",
    manifest: (): ModuleManifest => ({
      trust: "first-party",
      contextProviders: ["agents"],
      channelHandlers: ["agents"],
    }),
    boot: (registry: ModuleRegistry) => {
      // Context provider — injects agent list into template data
      registry.registerContextProvider({
        name: () => "agents",
        resolve: () => ({
          agents: service.listAgents(),
          personas: service.listPersonas(),
        }),
      });

      // Channel handler — API for agent/persona CRUD
      registry.registerChannelHandler({
        name: () => "agents",
        module: () => "agents",
        handle: (subpath: string, body: Record<string, unknown>) => {
          switch (subpath) {
            case "list":
              return { agents: service.listAgents() };
            case "get":
              return service.getAgent(body.slug as string) || { error: "Not found" };
            case "create":
              return service.createAgent(
                body.slug as string,
                body.name as string,
                body.role as string,
                (body.capabilities as string[]) || [],
                (body.behavioral_style as string) || "",
              );
            case "personas":
              return { personas: service.listPersonas() };
            case "activate-persona":
              return { success: service.activatePersona(body.agentSlug as string, body.personaSlug as string) };
            default:
              return { error: "Unknown subpath" };
          }
        },
      });
    },
  };
}
