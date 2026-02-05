import "server-only";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { decryptString, encryptString } from "./crypto";
import type { Connection, ConnectionSummary } from "@/types/connection";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "vault.sqlite");
const DB_PATH = process.env.DB_STUDIO_VAULT_PATH || DEFAULT_DB_PATH;

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      host TEXT NOT NULL,
      protocol TEXT,
      search TEXT,
      port INTEGER,
      user TEXT NOT NULL,
      database TEXT NOT NULL,
      encrypted_credentials TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  return db;
}

function toSummary(row: any): ConnectionSummary {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    host: row.host,
    protocol: row.protocol ?? undefined,
    search: row.search ?? undefined,
    port: row.port ?? undefined,
    user: row.user,
    database: row.database,
    filepath: undefined,
    ssl: undefined,
  };
}

function validatePayload(payload: Partial<Connection>) {
  if (!payload.type) throw new Error("Connection type is required.");
  if (!payload.name) throw new Error("Connection name is required.");
  if (!payload.host) throw new Error("Host is required.");
  if (!payload.user) throw new Error("User is required.");
  if (!payload.database) throw new Error("Database is required.");
  if (!payload.password) throw new Error("Password is required.");

  if (payload.type === "mongodb") {
    if (!payload.protocol) payload.protocol = "mongodb";
  }
}

export function storeConnection(payload: Partial<Connection>): ConnectionSummary {
  validatePayload(payload);

  const id = uuidv4();
  const encryptedCredentials = encryptString(
    JSON.stringify({
      password: payload.password ?? "",
      filepath: payload.filepath ?? "",
    })
  );

  const now = Date.now();
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO connections (
      id, name, type, host, protocol, search, port, user, database, encrypted_credentials, created_at
    ) VALUES (
      @id, @name, @type, @host, @protocol, @search, @port, @user, @database, @encrypted_credentials, @created_at
    )
  `);

  stmt.run({
    id,
    name: payload.name,
    type: payload.type,
    host: payload.host,
    protocol: payload.protocol ?? null,
    search: payload.search ?? null,
    port: payload.port ?? null,
    user: payload.user,
    database: payload.database,
    encrypted_credentials: encryptedCredentials,
    created_at: now,
  });

  return {
    id,
    name: payload.name!,
    type: payload.type!,
    host: payload.host!,
    protocol: payload.protocol ?? undefined,
    search: payload.search ?? undefined,
    port: payload.port ?? undefined,
    user: payload.user!,
    database: payload.database!,
    filepath: undefined,
    ssl: payload.ssl,
  };
}

export function listConnections(): ConnectionSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, type, host, protocol, search, port, user, database FROM connections ORDER BY created_at DESC`
    )
    .all();

  return rows.map(toSummary);
}

export function deleteConnection(id: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM connections WHERE id = ?`).run(id);
}

export function getConnectionById(id: string): Connection {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, name, type, host, protocol, search, port, user, database, encrypted_credentials FROM connections WHERE id = ?`
    )
    .get(id);

  if (!row) {
    throw new Error("Connection not found.");
  }

  const decrypted = JSON.parse(decryptString(row.encrypted_credentials));

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    host: row.host,
    protocol: row.protocol ?? undefined,
    search: row.search ?? undefined,
    port: row.port ?? undefined,
    user: row.user,
    password: decrypted.password ?? "",
    database: row.database,
    filepath: decrypted.filepath ?? "",
    encryptedCredentials: row.encrypted_credentials,
  };
}

export function getConnectionSummary(id: string): ConnectionSummary | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, name, type, host, protocol, search, port, user, database FROM connections WHERE id = ?`
    )
    .get(id);

  return row ? toSummary(row) : null;
}
