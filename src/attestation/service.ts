// C6 — Attestation Service
// Periodic cryptographically signed attestations of system state.
// Stores attestation data as JSON in the adapter's body field.

import type { SqliteAdapter } from "../../../presto-ts/src/adapters/sqlite";
import { MerkleTree } from "./merkle";
import { Signer } from "./signer";
import { computeCoreChecksum } from "./checksum";
import type { Attestation } from "./types";

export class AttestationService {
  private signer: Signer;

  constructor(private db: SqliteAdapter, keysDir: string) {
    this.signer = new Signer(keysDir);
  }

  createAttestation(deltaSummary = ""): Attestation {
    const tables = ["agent", "persona", "delegation", "memory", "escalation", "mutation_proposal"];
    const leaves: string[] = [];

    for (const table of tables) {
      try {
        const rows = this.db.query({ type: table });
        for (const row of rows) {
          leaves.push(JSON.stringify(row));
        }
      } catch { /* table may not exist */ }
    }

    const tree = new MerkleTree(leaves);
    const coreChecksum = computeCoreChecksum();
    const version = this.getNextVersion();

    const payload = JSON.stringify({
      version,
      merkle_root: tree.root,
      file_count: tree.leafCount,
      delta_summary: deltaSummary,
      core_checksum: coreChecksum,
      timestamp: new Date().toISOString(),
    });

    const signature = this.signer.sign(payload);

    const attestationData = {
      version,
      merkle_root: tree.root,
      file_count: tree.leafCount,
      delta_summary: deltaSummary,
      signature,
      public_key: this.signer.publicKeyFingerprint,
      core_checksum: coreChecksum,
    };

    // Store as content record: title=version label, body=JSON, slug=unique
    const record = this.db.create("attestation", {
      slug: `v${version}-${Date.now()}`,
      title: `v${version}`,
      body: JSON.stringify(attestationData),
      status: "verified",
    });

    return this.recordToAttestation(record);
  }

  verify(attestation: Attestation): boolean {
    const payload = JSON.stringify({
      version: attestation.version,
      merkle_root: attestation.merkle_root,
      file_count: attestation.file_count,
      delta_summary: attestation.delta_summary,
      core_checksum: attestation.core_checksum,
      timestamp: attestation.created_at,
    });
    return this.signer.verify(payload, attestation.signature);
  }

  getLatest(): Attestation | null {
    const rows = this.db.query({ type: "attestation", order: "id DESC", limit: 1 });
    return rows.length ? this.recordToAttestation(rows[0]) : null;
  }

  getHistory(limit = 20): Attestation[] {
    return this.db.query({ type: "attestation", order: "id DESC", limit })
      .map(r => this.recordToAttestation(r));
  }

  toWellKnown(): Record<string, unknown> {
    const latest = this.getLatest();
    return {
      version: latest?.version || 0,
      merkle_root: latest?.merkle_root || "",
      file_count: latest?.file_count || 0,
      signature: latest?.signature || "",
      public_key: this.signer.publicKeyFingerprint,
      core_checksum: latest?.core_checksum || "",
      timestamp: latest?.created_at || "",
    };
  }

  private getNextVersion(): number {
    const latest = this.getLatest();
    return latest ? latest.version + 1 : 1;
  }

  private recordToAttestation(r: Record<string, unknown>): Attestation {
    const data = JSON.parse((r.body as string) || "{}");
    return {
      id: r.id as number,
      version: data.version || 0,
      merkle_root: data.merkle_root || "",
      file_count: data.file_count || 0,
      delta_summary: data.delta_summary || "",
      signature: data.signature || "",
      public_key: data.public_key || "",
      core_checksum: data.core_checksum || "",
      created_at: r.created_at as string,
    };
  }
}
