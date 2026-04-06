// C6 — Merkle Tree
// Sorted leaves, pairwise SHA-256 hashing.
// Compatible attestation format with home-agent-space.

import { createHash } from "node:crypto";

export class MerkleTree {
  private leaves: string[];

  constructor(data: string[]) {
    // Sort for deterministic ordering, then hash each leaf
    this.leaves = [...data].sort().map(d => this.hash(d));
  }

  get root(): string {
    if (this.leaves.length === 0) return this.hash("");
    let level = [...this.leaves];
    while (level.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 < level.length) {
          next.push(this.hash(level[i] + level[i + 1]));
        } else {
          next.push(level[i]); // odd node promoted
        }
      }
      level = next;
    }
    return level[0];
  }

  get leafCount(): number {
    return this.leaves.length;
  }

  private hash(data: string): string {
    return createHash("sha256").update(data).digest("hex");
  }
}
