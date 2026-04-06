// C6 — Ed25519 Signing
// Key generation, signing, verification.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Use Node's built-in Ed25519 support
import { generateKeyPairSync, sign, verify, createPrivateKey, createPublicKey } from "node:crypto";

export class Signer {
  private privateKey: ReturnType<typeof createPrivateKey>;
  private publicKey: ReturnType<typeof createPublicKey>;
  private publicKeyHex: string;

  constructor(keysDir: string) {
    const privPath = join(keysDir, "ed25519.key");
    const pubPath = join(keysDir, "ed25519.pub");

    if (!existsSync(keysDir)) mkdirSync(keysDir, { recursive: true });

    if (existsSync(privPath) && existsSync(pubPath)) {
      this.privateKey = createPrivateKey(readFileSync(privPath));
      this.publicKey = createPublicKey(readFileSync(pubPath));
    } else {
      const pair = generateKeyPairSync("ed25519");
      writeFileSync(privPath, pair.privateKey.export({ type: "pkcs8", format: "pem" }));
      writeFileSync(pubPath, pair.publicKey.export({ type: "spki", format: "pem" }));
      this.privateKey = pair.privateKey;
      this.publicKey = pair.publicKey;
    }

    this.publicKeyHex = createHash("sha256")
      .update(this.publicKey.export({ type: "spki", format: "der" }))
      .digest("hex")
      .slice(0, 16);
  }

  sign(data: string): string {
    const signature = sign(null, Buffer.from(data), this.privateKey);
    return signature.toString("hex");
  }

  verify(data: string, signatureHex: string): boolean {
    try {
      return verify(null, Buffer.from(data), this.publicKey, Buffer.from(signatureHex, "hex"));
    } catch {
      return false;
    }
  }

  get publicKeyFingerprint(): string {
    return this.publicKeyHex;
  }

  get publicKeyPem(): string {
    return this.publicKey.export({ type: "spki", format: "pem" }) as string;
  }
}
