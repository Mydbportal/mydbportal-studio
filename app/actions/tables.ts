"use server";

import mysql from "mysql2/promise";
import { Connection } from "@/types/connection";
import { MongoClient } from "mongodb";
import { getPgTableNames } from "./postgres";
import { decryptString } from "@/lib/server/crypto";

export async function getMysqlTables(connection: Connection): Promise<{
  success: boolean;
  tables?: { name: string; count: number }[];
  message?: string;
}> {
  try {
    if (connection.type !== "mysql") {
      return {
        success: false,
        message: "Only MySQL connections are supported for table listing.",
      };
    }

    if (!connection.host || !connection.user || !connection.database) {
      return {
        success: false,
        message:
          "Missing required MySQL connection details (host, user, database).",
      };
    }

    const mysqlConnection = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      user: connection.user,
      password: connection.password,
      database: connection.database,
    });

    const [rows] = await mysqlConnection.execute("SHOW TABLES");
    const tableNames = (rows as unknown[]).map(
      (row) => Object.values(row as Record<string, unknown>)[0]
    ) as string[];

    const tablesWithCounts: { name: string; count: number }[] = [];
    for (const tableName of tableNames) {
      const [countRows] = await mysqlConnection.execute(
        `SELECT COUNT(*) FROM \`${tableName}\``
      );
      const count = Object.values(
        (countRows as mysql.RowDataPacket[])[0] as Record<string, number>
      )[0] as number;
      tablesWithCounts.push({ name: tableName, count });
    }

    await mysqlConnection.end();

    return { success: true, tables: tablesWithCounts };
  } catch (error) {
    console.error("Error fetching MySQL tables:", error);
    return {
      success: false,
      message: `Failed to fetch tables: ${(error as Error).message}`,
    };
  }
}

export async function getMongoTables(connection: Connection): Promise<{
  success: boolean;
  tables?: { name: string; count: number }[];
  message?: string;
}> {
  try {
    if (connection.type !== "mongodb") {
      return {
        success: false,
        message: "Only MongoDB connections are supported for table listing.",
      };
    }

    if (!connection.host || !connection.user || !connection.database) {
      return {
        success: false,
        message:
          "Missing required MongoDB connection details (host, user, database).",
      };
    }

    const mongoUri =
      connection.protocol === "mongodb+srv"
        ? `mongodb+srv://${connection.user}:${connection.password}@${connection.host}/${connection.database}?retryWrites=true&w=majority&appName=Cluster0`
        : `mongodb://${connection.user}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;
    const client = new MongoClient(mongoUri);
    await client.connect();
    const database = client.db(connection.database);

    const collections = [];
    const colls = database.listCollections({}, { nameOnly: true });

    for await (const doc of colls) {
      const collectionName = doc.name;
      const collection = database.collection(collectionName);
      const count = await collection.estimatedDocumentCount();

      collections.push({
        name: collectionName,
        count,
      });
    }

    await client.close();

    return { success: true, tables: collections };
  } catch (error) {
    console.error("Error fetching MongoDB tables:", error);
    return {
      success: false,
      message: `Failed to fetch tables: ${(error as Error).message}`,
    };
  }
}

function inflateEncryptedConnection(
  connection: Omit<Connection, "password"> & { encryptedCredentials: string }
): Connection {
  const decrypted = JSON.parse(
    decryptString(connection.encryptedCredentials)
  );
  return {
    ...connection,
    password: decrypted.password ?? "",
    filepath: decrypted.filepath ?? "",
    encryptedCredentials: connection.encryptedCredentials,
  };
}

export async function getTablesEncrypted(
  connection: Omit<Connection, "password"> & { encryptedCredentials: string },
  schema?: string
): Promise<{
  success: boolean;
  tables?: { name: string; count: number }[];
  message?: string;
}> {
  try {
    const full = inflateEncryptedConnection(connection);
    if (full.type === "mysql") {
      return getMysqlTables(full);
    }
    if (full.type === "mongodb") {
      return getMongoTables(full);
    }
    if (full.type === "postgresql") {
      return getPgTableNames(full, schema);
    }
    return { success: false, message: "Unsupported database type." };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message ?? "Failed to fetch tables.",
    };
  }
}
