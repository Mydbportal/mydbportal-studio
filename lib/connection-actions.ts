"use client";

import { v4 as uuidv4 } from "uuid";

import type { Connection, ConnectionSummary } from "@/types/connection";
import {
  addConnection,
  deleteConnection,
  loadConnections,
} from "@/lib/connection-storage";
import { encryptConnectionPayload } from "@/app/actions/connection";

function toSummary(connection: Connection): ConnectionSummary {
  return {
    id: connection.id,
    name: connection.name,
    type: connection.type,
    host: connection.host,
    protocol: connection.protocol ?? undefined,
    search: connection.search ?? undefined,
    port: connection.port ?? undefined,
    user: connection.user,
    database: connection.database,
    filepath: connection.filepath,
    ssl: connection.ssl,
  };
}

export async function createConnection(
  connection: Partial<Connection>
): Promise<{ success: boolean; connection?: ConnectionSummary; message?: string }> {
  try {
    const prepared: Connection = {
      id: uuidv4(),
      name: connection.name ?? "",
      type: connection.type ?? "mysql",
      host: connection.host ?? "",
      protocol: connection.protocol,
      search: connection.search ?? "",
      port: connection.port ?? 0,
      user: connection.user ?? "",
      password: connection.password ?? "",
      database: connection.database ?? "",
      filepath: connection.filepath ?? "",
      encryptedCredentials: "",
      ssl: connection.ssl,
    };

    const encrypted = await encryptConnectionPayload(prepared);
    if (!encrypted.success || !encrypted.encryptedCredentials) {
      throw new Error(encrypted.message || "Failed to encrypt credentials.");
    }

    const stored: Connection = {
      ...prepared,
      password: "",
      encryptedCredentials: encrypted.encryptedCredentials,
    };

    const created = await addConnection(stored);
    return { success: true, connection: toSummary(created) };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message ?? "Failed to create connection.",
    };
  }
}

export async function listConnections(): Promise<{
  success: boolean;
  connections?: ConnectionSummary[];
  message?: string;
}> {
  try {
    const connections = await loadConnections();
    return { success: true, connections: connections.map(toSummary) };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message ?? "Failed to list connections.",
    };
  }
}

export async function removeConnection(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await deleteConnection(id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message ?? "Failed to delete connection.",
    };
  }
}

export async function getConnectionMeta(id: string): Promise<{
  success: boolean;
  connection?: ConnectionSummary | null;
  message?: string;
}> {
  try {
    const connections = await loadConnections();
    const found = connections.find((conn) => conn.id === id) ?? null;
    return { success: true, connection: found ? toSummary(found) : null };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message ?? "Failed to load connection.",
    };
  }
}
