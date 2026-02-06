"use server";

import { Connection } from "@/types/connection";
import mysql from "mysql2/promise";
import { Client as PgClient } from "pg";
import { MongoClient } from "mongodb";
import {
  deleteConnection as deleteVaultConnection,
  getConnectionSummary,
  listConnections as listVaultConnections,
  storeConnection,
} from "@/lib/server/connection-vault";
import type { ConnectionSummary } from "@/types/connection";

export async function testConnection(
  connection: Partial<Connection>
): Promise<{ success: boolean; message: string }> {
  if (!connection.host || !connection.port) {
    return {
      success: false,
      message: "Missing required connection details (host or port).",
    };
  }

  try {
    switch (connection.type) {
      case "mysql":
        const mysqlConnection = await mysql.createConnection({
          host: connection.host,
          port: connection.port,
          user: connection.user,
          password: connection.password,
          database: connection.database,
        });
        await mysqlConnection.end();
        return {
          success: true,
          message: `Successfully connected to MySQL at ${connection.host}:${connection.port}.`,
        };
      case "postgresql":
        const pgClient = new PgClient({
          host: connection.host,
          port: connection.port,
          user: connection.user,
          password: connection.password,
          database: connection.database,
        });
        await pgClient.connect();
        await pgClient.end();
        return {
          success: true,
          message: `Successfully connected to PostgreSQL at ${connection.host}:${connection.port}.`,
        };
      case "mongodb":
        let mongoUri: string;
        if (connection.protocol === "mongodb+srv") {
          mongoUri = `mongodb+srv://${connection.user}:${connection.password}@${connection.host}/${connection.database}?retryWrites=true&w=majority&appName=Cluster0`;
        } else {
          mongoUri = `mongodb://${connection.user}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;
        }
        const mongoClient = new MongoClient(mongoUri);
        await mongoClient.connect();
        await mongoClient.close();
        return {
          success: true,
          message: `Successfully connected to MongoDB at ${connection.host}:${connection.port}.`,
        };
      default:
        return {
          success: false,
          message: `Unsupported database type: ${connection.type}.`,
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to ${connection.type}: ${
        (error as { message: string }).message
      }`,
    };
  }
}

export async function createConnection(
  connection: Partial<Connection>
): Promise<{ success: boolean; connection?: ConnectionSummary; message?: string }> {
  try {
    const created = storeConnection(connection);
    return { success: true, connection: created };
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
    return { success: true, connections: listVaultConnections() };
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
    deleteVaultConnection(id);
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
    return { success: true, connection: getConnectionSummary(id) };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message ?? "Failed to load connection.",
    };
  }
}
