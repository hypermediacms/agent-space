// C5 — Memory Module

import type { HtxModule, ModuleManifest, ModuleRegistry } from "../../../presto-ts/src/types";
import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import { MemoryService } from "./service";

export function createMemoryModule(adapter: SqliteAdapter): HtxModule {
  const service = new MemoryService(adapter);

  return {
    name: () => "memory",
    manifest: (): ModuleManifest => ({
      trust: "first-party",
      contextProviders: ["memory"],
      channelHandlers: ["memory"],
    }),
    boot: (registry: ModuleRegistry) => {
      registry.registerContextProvider({
        name: () => "memory",
        resolve: () => ({
          memories: service.listAll(20),
        }),
      });

      registry.registerChannelHandler({
        name: () => "memory",
        module: () => "memory",
        handle: (subpath: string, body: Record<string, unknown>) => {
          switch (subpath) {
            case "record":
              return service.record(
                body.agentSlug as string,
                body.title as string,
                (body.body as string) || "",
                body.type as any || "long-term",
                body.importance as any || "medium",
              );
            case "retrieve":
              return { memories: service.retrieve(body.agentSlug as string, body.limit as number || 5) };
            case "prune":
              return { pruned: service.prune() };
            case "list":
              return { memories: body.agentSlug ? service.listForAgent(body.agentSlug as string) : service.listAll() };
            default:
              return { error: "Unknown subpath" };
          }
        },
      });
    },
  };
}
