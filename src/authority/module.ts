// C4 — Human Authority Module

import type { HtxModule, ModuleManifest, ModuleRegistry } from "../../../presto-ts/src/types";
import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import { EscalationService } from "./escalation";
import { MutationApprovalService } from "./mutations";

export function createAuthorityModule(adapter: SqliteAdapter, secret: string): HtxModule {
  const escalationService = new EscalationService(adapter);
  const mutationService = new MutationApprovalService(adapter, secret);

  return {
    name: () => "authority",
    manifest: (): ModuleManifest => ({
      trust: "first-party",
      contextProviders: ["authority"],
      channelHandlers: ["authority"],
    }),
    boot: (registry: ModuleRegistry) => {
      registry.registerContextProvider({
        name: () => "authority",
        resolve: () => ({
          pendingEscalations: escalationService.listPending(),
          pendingProposals: mutationService.listPending(),
        }),
      });

      registry.registerChannelHandler({
        name: () => "authority",
        module: () => "authority",
        handle: (subpath: string, body: Record<string, unknown>) => {
          switch (subpath) {
            case "escalate":
              return escalationService.escalate(
                body.agentSlug as string,
                (body.delegationId as number) || null,
                body.context as string,
                (body.options as string) || "",
                (body.recommendation as string) || "",
              );
            case "resolve-escalation":
              return { success: escalationService.resolve(body.id as number, body.decision as string) };
            case "propose-mutation":
              return mutationService.propose(
                body.agentSlug as string,
                (body.delegationId as number) || null,
                body.resource as string,
                body.changeType as any,
                body.changeDetail as string,
                (body.rationale as string) || "",
              );
            case "approve-mutation":
              return mutationService.approve(body.id as number, body.token as string);
            case "reject-mutation":
              return { success: mutationService.reject(body.id as number, body.reason as string) };
            case "escalations":
              return { escalations: escalationService.listAll() };
            case "proposals":
              return { proposals: mutationService.listAll() };
            default:
              return { error: "Unknown subpath" };
          }
        },
      });
    },
  };
}
