// C6 — Attestation Module

import type { HtxModule, ModuleManifest, ModuleRegistry } from "../../../presto-ts/src/types";
import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import { AttestationService } from "./service";

export function createAttestationModule(adapter: SqliteAdapter, keysDir: string): HtxModule {
  const service = new AttestationService(adapter, keysDir);

  return {
    name: () => "attestation",
    manifest: (): ModuleManifest => ({
      trust: "first-party",
      contextProviders: ["attestations"],
      channelHandlers: ["attestations"],
    }),
    boot: (registry: ModuleRegistry) => {
      // Create initial attestation on boot (after DDL has run)
      service.createAttestation("System boot");
      registry.registerContextProvider({
        name: () => "attestations",
        resolve: () => ({
          latestAttestation: service.getLatest(),
          attestationHistory: service.getHistory(5),
        }),
      });

      registry.registerChannelHandler({
        name: () => "attestations",
        module: () => "attestations",
        handle: (subpath: string, body: Record<string, unknown>) => {
          switch (subpath) {
            case "create":
              return service.createAttestation((body.summary as string) || "");
            case "verify": {
              const latest = service.getLatest();
              if (!latest) return { verified: false, error: "No attestation found" };
              return { verified: service.verify(latest), attestation: latest };
            }
            case "latest":
              return service.getLatest() || { error: "No attestations" };
            case "history":
              return { attestations: service.getHistory(body.limit as number || 20) };
            case "well-known":
              return service.toWellKnown();
            default:
              return { error: "Unknown subpath" };
          }
        },
      });
    },
  };
}
