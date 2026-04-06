// C6 — Cryptographic State Attestation types

export interface Attestation {
  id: number;
  version: number;
  merkle_root: string;
  file_count: number;
  delta_summary: string;
  signature: string;
  public_key: string;
  core_checksum: string;
  created_at: string;
}
