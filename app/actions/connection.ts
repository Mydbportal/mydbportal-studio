"use server";

import { Connection } from "@/types/connection";
import mysql from "mysql2/promise";
import { Client as PgClient } from "pg";
import { MongoClient } from "mongodb";
import { encryptString } from "@/lib/server/crypto";


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

export async function encryptConnectionPayload(
  connection: Partial<Connection>
): Promise<{ success: boolean; encryptedCredentials?: string; message?: string }> {
  if (!connection.name) {
    return { success: false, message: "Connection name is required." };
  }
  if (!connection.type) {
    return { success: false, message: "Connection type is required." };
  }
  if (!connection.host) {
    return { success: false, message: "Host is required." };
  }
  if (!connection.user) {
    return { success: false, message: "User is required." };
  }
  if (!connection.database) {
    return { success: false, message: "Database is required." };
  }
  if (!connection.password) {
    return { success: false, message: "Password is required." };
  }

  if (connection.type === "mongodb" && !connection.protocol) {
    connection.protocol = "mongodb";
  }

  const encryptedCredentials = encryptString(
    JSON.stringify({
      password: connection.password ?? "",
      filepath: connection.filepath ?? "",
    })
  );

  return { success: true, encryptedCredentials };
}
