"use server";

import { mysqlConnector } from "@/lib/adapters/mysql";
import { pgConnector } from "@/lib/adapters/postgres";
import { Connection } from "@/types/connection";
import { decryptString } from "@/lib/server/crypto";

export async function executeQuery(
  connectionDetails: Connection,
  query: string
) {
  try {
    let results;
    if (
      !connectionDetails.database ||
      !connectionDetails.host ||
      !connectionDetails.user ||
      !connectionDetails.password ||
      !connectionDetails.port
    ) {
      return { error: "Missing required connection details" };
    }
    if (connectionDetails.type === "mysql") {
      const connection = await mysqlConnector(connectionDetails);
      [results] = await connection.execute(query);
      await connection.end();
    } else if (connectionDetails.type === "postgresql") {
      const client = await pgConnector(connectionDetails);
      const { rows } = await client.query(query);
      results = rows;
      await client.end();
    } else {
      throw new Error("Unsupported database type");
    }
    return { data: results };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function executeEncryptedQuery(
  connectionDetails: Omit<Connection, "password"> & {
    encryptedCredentials: string;
  },
  query: string
) {
  try {
    const decrypted = JSON.parse(
      decryptString(connectionDetails.encryptedCredentials)
    );
    const fullConnection: Connection = {
      ...connectionDetails,
      password: decrypted.password ?? "",
      filepath: decrypted.filepath ?? "",
      encryptedCredentials: connectionDetails.encryptedCredentials,
    };
    return executeQuery(fullConnection, query);
  } catch (error) {
    return { error: (error as Error).message };
  }
}
