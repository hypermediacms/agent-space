// C2+C3 — Delegation Module
// HtxModule providing delegation data to templates and channel API

import type { HtxModule, ModuleManifest, ModuleRegistry } from "../../../presto-ts/src/types";
import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import { DelegationService } from "./service";
import { SandboxService } from "../sandbox/service";

export function createDelegationModule(adapter: SqliteAdapter): HtxModule {
  const delegationService = new DelegationService(adapter);
  const sandboxService = new SandboxService(adapter);

  return {
    name: () => "delegation",
    manifest: (): ModuleManifest => ({
      trust: "first-party",
      contextProviders: ["delegations"],
      channelHandlers: ["delegations"],
    }),
    boot: (registry: ModuleRegistry) => {
      registry.registerContextProvider({
        name: () => "delegations",
        resolve: () => ({
          delegations: delegationService.listRecent(10),
          pendingDelegations: delegationService.listPending(),
          runningDelegations: delegationService.listRunning(),
          sandboxStatus: sandboxService.status,
        }),
      });

      registry.registerChannelHandler({
        name: () => "delegations",
        module: () => "delegations",
        handle: (subpath: string, body: Record<string, unknown>) => {
          switch (subpath) {
            case "create": {
              const result = delegationService.delegate({
                delegatorId: (body.delegatorId as string) || "human",
                agentSlug: body.agentSlug as string,
                task: body.task as string,
                maxBudget: body.maxBudget as number | undefined,
                timeout: body.timeout as number | undefined,
              });
              if ("error" in result) return result;
              // Execute asynchronously — don't block the channel response
              sandboxService.execute(result).catch(err => {
                delegationService.fail(result.id, String(err));
              });
              return { delegation: result };
            }
            case "get": {
              const d = delegationService.get(body.id as number);
              return d || { error: "Not found" };
            }
            case "cancel": {
              return { success: delegationService.cancel(body.id as number) };
            }
            case "list":
              return { delegations: delegationService.listRecent(body.limit as number || 20) };
            case "status":
              return sandboxService.status;
            default:
              return { error: "Unknown subpath" };
          }
        },
      });
    },
  };
}
