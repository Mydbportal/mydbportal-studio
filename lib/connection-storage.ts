"use client";

import { dexieDb } from "@/lib/dexie-db";
import type { Connection } from "@/types/connection";

const CONNECTIONS_STORAGE_KEY = "master_database_studio_connections";

async function migrateLegacyStorage(): Promise<void> {
  const existing = await dexieDb.connections.count();
  if (existing > 0) return;

  const storedConnections = localStorage.getItem(CONNECTIONS_STORAGE_KEY);
  if (!storedConnections) return;

  try {
    const parsedConnections: Connection[] = JSON.parse(storedConnections);
    if (parsedConnections.length > 0) {
      await dexieDb.connections.bulkPut(parsedConnections);
    }
    localStorage.removeItem(CONNECTIONS_STORAGE_KEY);
  } catch (error) {
    console.error("Error migrating legacy connections:", error);
  }
}

export async function saveConnections(
  connections: Connection[]
): Promise<void> {
  await migrateLegacyStorage();
  await dexieDb.connections.clear();
  await dexieDb.connections.bulkPut(connections);
}

export async function loadConnections(): Promise<Connection[]> {
  await migrateLegacyStorage();
  return dexieDb.connections.toArray();
}

export async function addConnection(
  newConnection: Connection
): Promise<Connection> {
  await migrateLegacyStorage();
  await dexieDb.connections.put(newConnection);
  return newConnection;
}

export async function getConnectionById(
  id: string
): Promise<Connection | null> {
  await migrateLegacyStorage();
  const connections = await loadConnections();
  return connections.find((conn) => conn.id === id) ?? null;
}

export async function deleteConnection(id: string): Promise<Connection[]> {
  await migrateLegacyStorage();
  const connections = await loadConnections();
  await dexieDb.connections.delete(id);
  return connections.filter((conn) => conn.id !== id);
}

export async function updateConnection(
  updatedConnection: Connection
): Promise<Connection[]> {
  await migrateLegacyStorage();
  const connections = await loadConnections();
  const index = connections.findIndex(
    (conn) => conn.id === updatedConnection.id
  );
  if (index > -1) {
    connections[index] = updatedConnection;
    await dexieDb.connections.put(updatedConnection);
  }
  return connections;
}
