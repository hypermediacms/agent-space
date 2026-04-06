// C6 — Core Self-Checksum
// Computes SHA-256 of the attestation source files.
// Ensures the verification system itself has not been tampered with.

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ATTESTATION_DIR = join(import.meta.dir);

export function computeCoreChecksum(): string {
  const files = readdirSync(ATTESTATION_DIR)
    .filter(f => f.endsWith(".ts"))
    .sort();

  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(readFileSync(join(ATTESTATION_DIR, file)));
  }
  return hash.digest("hex");
}
