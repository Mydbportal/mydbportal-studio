import "server-only";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT = "mydbportal-studio-vault";
const DEFAULT_KEY_PATH = path.join(process.cwd(), "data", "vault.key");
const KEY_PATH = process.env.DB_STUDIO_MASTER_KEY_FILE || DEFAULT_KEY_PATH;

function getMasterKey(): Buffer {
  const envKey = process.env.DB_STUDIO_MASTER_KEY;
  if (envKey) {
    return crypto.scryptSync(envKey, SALT, 32);
  }

  if (fs.existsSync(KEY_PATH)) {
    const raw = fs.readFileSync(KEY_PATH, "utf8").trim();
    if (!raw) {
      throw new Error("Vault key file is empty.");
    }
    return crypto.scryptSync(raw, SALT, 32);
  }

  const dir = path.dirname(KEY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const generated = crypto.randomBytes(32).toString("base64");
  fs.writeFileSync(KEY_PATH, generated, { encoding: "utf8", mode: 0o600 });
  try {
    fs.chmodSync(KEY_PATH, 0o600);
  } catch {
    // ignore chmod failures on some platforms
  }

  return crypto.scryptSync(generated, SALT, 32);
}

export function encryptString(plainText: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptString(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted payload format.");
  }

  const key = getMasterKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString("utf8");
}
