"use server";

import { pgConnector } from "@/lib/adapters/postgres";
import { buildSQLFragment } from "@/lib/helpers/helpers";
import { ColumnOptions, Connection, TableFilter } from "@/types/connection";
import { decryptString } from "@/lib/server/crypto";

interface CountRow {
  total: number;
}
export async function getSchemas(connection: Connection): Promise<{
  success: boolean;
  schemas?: string[];
  message?: string;
}> {
  let client;
  try {
    client = await pgConnector(connection);

    const query = `
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      AND schema_name NOT LIKE 'pg_toast%'
      AND schema_name NOT LIKE 'pg_temp%';
    `;

    const data = await client.query<{ schema_name: string }>(query);

    const schemas = data.rows.map((row) => row.schema_name);

    return {
      success: true,
      schemas,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error in getSchemas:", error.message);
    } else {
      console.error("Unknown error in getSchemas:", error);
    }

    return {
      success: false,
      message: "Failed to fetch schemas. Please try again later.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing client in getSchemas:", endErr.message);
        } else {
          console.error("Unknown error closing client in getSchemas:", endErr);
        }
      });
    }
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

export async function getSchemasEncrypted(
  connection: Omit<Connection, "password"> & { encryptedCredentials: string }
) {
  const full = inflateEncryptedConnection(connection);
  return getSchemas(full);
}

export async function getPgTableNames(
  connection: Connection,
  schema?: string
): Promise<{
  success: boolean;
  tables?: { name: string; count: number }[];
  message?: string;
  schema?: string;
}> {
  let client;
  try {
    if (connection.type !== "postgresql") {
      return {
        success: false,
        message: "Only PostgreSQL connections are supported for table listing.",
      };
    }

    if (!connection.host || !connection.user || !connection.database) {
      return {
        success: false,
        message:
          "Missing required PostgreSQL connection details (host, user, database).",
      };
    }

    client = await pgConnector(connection);

    const query = schema
      ? `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema = $1
      `
      : `
        SELECT table_name, table_schema
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
      `;

    const response = schema
      ? await client.query(query, [schema])
      : await client.query(query);

    const tablesWithCounts: { name: string; count: number }[] = [];

    for (const row of response.rows) {
      const tableName = row.table_name;
      const tableSchema = schema ?? row.table_schema;

      const fullName = `"${tableSchema}"."${tableName}"`;

      const countRes = await client.query(`SELECT COUNT(*) FROM ${fullName}`);
      const count = parseInt(countRes.rows[0].count, 10);
      tablesWithCounts.push({ name: tableName, count });
    }

    return { success: true, tables: tablesWithCounts, schema };
  } catch (error) {
    console.error("Error fetching PostgreSQL tables:", error);
    return {
      success: false,
      message: `Failed to fetch tables: ${(error as Error).message}`,
    };
  } finally {
    if (client) {
      await client
        .end()
        .catch((endErr) =>
          console.error("Error closing client in getPgTableNames:", endErr)
        );
    }
  }
}

export async function getPgTableNamesEncrypted(
  connection: Omit<Connection, "password"> & { encryptedCredentials: string },
  schema?: string
) {
  const full = inflateEncryptedConnection(connection);
  return getPgTableNames(full, schema);
}

export async function getTableColumns(
  connection: Connection,
  tableName: string,
  schema?: string
): Promise<{
  success: boolean;
  columns?: {
    column_name: string;
    data_type: string;
    column_default: string | null;
    character_maximum_length: number | null;
    is_nullable: "YES" | "NO";
    numeric_precision: number | null;
    dtd_identifier: string;
    constraint_type: "PRIMARY KEY" | "UNIQUE" | null;
  }[];
  message?: string;
}> {
  let client;
  try {
    client = await pgConnector(connection);

    const query = `
      SELECT
        cols.column_name,
        cols.data_type,
        cols.column_default,
        cols.character_maximum_length,
        cols.is_nullable,
        cols.numeric_precision,
        cols.dtd_identifier,
        CASE
          WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PRIMARY KEY'
          WHEN tc.constraint_type = 'UNIQUE' THEN 'UNIQUE'
          ELSE NULL
        END AS constraint_type
      FROM
        information_schema.columns cols
      LEFT JOIN
        information_schema.key_column_usage kcu
        ON cols.table_name = kcu.table_name
        AND cols.column_name = kcu.column_name
        AND cols.table_schema = kcu.table_schema
      LEFT JOIN
        information_schema.table_constraints tc
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_name = cols.table_name
        AND tc.table_schema = cols.table_schema
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
      WHERE
        cols.table_name = $1
        AND cols.table_schema = $2
    `;

    const params = schema ? [tableName, schema] : [tableName, "public"];

    const response = await client.query<{
      column_name: string;
      data_type: string;
      column_default: string | null;
      character_maximum_length: number | null;
      is_nullable: "YES" | "NO";
      numeric_precision: number | null;
      dtd_identifier: string;
      constraint_type: "PRIMARY KEY" | "UNIQUE" | null;
    }>(query, params);

    return {
      success: true,
      columns: response.rows,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error fetching table columns:", error.message);
      return {
        success: false,
        message: `Failed to fetch table columns: ${error.message}`,
      };
    }
    console.error("Unknown error fetching table columns:", error);
    return {
      success: false,
      message: "Failed to fetch table columns due to an unknown error.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error(
            "Error closing client in getTableColumns:",
            endErr.message
          );
        } else {
          console.error(
            "Unknown error closing client in getTableColumns:",
            endErr
          );
        }
      });
    }
  }
}

export async function getTableDatas({
  connection,
  tableName,
  schema,
  limit = 20,
  page = 1,
  filters = [],
}: {
  connection: Connection;
  tableName: string;
  schema?: string;
  limit?: number;
  page?: number;
  filters?: TableFilter[];
}): Promise<{
  success: boolean;
  rows?: Record<string, unknown>[];
  message?: string;
  totalPages?: number;
}> {
  let client;
  try {
    const offset = (page - 1) * limit;

    client = await pgConnector(connection);

    // validate identifiers to avoid SQL injection
    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name" };
    }
    if (schema && !isValidIdent(schema)) {
      return { success: false, message: "Invalid schema name" };
    }

    const fullTableName = schema
      ? `"${schema}"."${tableName}"`
      : `"${tableName}"`;

    const { whereSql, params } = buildPostgresWhere(filters);

    const query = `SELECT COUNT(*)::int AS total FROM ${fullTableName}${whereSql}`;

    const { rows } = await client.query<CountRow>(query, params);

    const totalPages: number = Math.ceil(rows[0]?.total / limit);

    const response = await client.query<Record<string, unknown>>(
      `SELECT * FROM ${fullTableName}${whereSql} LIMIT $${params.length + 1} OFFSET $${
        params.length + 2
      }`,
      [...params, limit, offset]
    );

    return { success: true, rows: response.rows, totalPages };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error fetching table data:", error.message);
      return {
        success: false,
        message: `Failed to fetch table data: ${error.message}`,
      };
    }
    console.error("Unknown error fetching table data:", error);
    return {
      success: false,
      message: "Failed to fetch table data due to an unknown error.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error(
            "Error closing client in getTableDatas:",
            endErr.message
          );
        } else {
          console.error(
            "Unknown error closing client in getTableDatas:",
            endErr
          );
        }
      });
    }
  }
}

function buildPostgresWhere(filters: TableFilter[]) {
  const clauses: string[] = [];
  const params: Array<string | number | boolean | null> = [];
  const isValidIdent = (name: string) =>
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  const quoteIdent = (ident: string) => `"${ident.replace(/\"/g, '\"\"')}"`;

  filters.forEach((f) => {
    if (!f.column || !isValidIdent(f.column)) return;
    const col = quoteIdent(f.column);
    const nextParam = () => `$${params.length + 1}`;

    switch (f.op) {
      case "eq":
        clauses.push(`${col} = ${nextParam()}`);
        params.push(f.value ?? "");
        break;
      case "neq":
        clauses.push(`${col} != ${nextParam()}`);
        params.push(f.value ?? "");
        break;
      case "gt":
        clauses.push(`${col} > ${nextParam()}`);
        params.push(f.value ?? "");
        break;
      case "gte":
        clauses.push(`${col} >= ${nextParam()}`);
        params.push(f.value ?? "");
        break;
      case "lt":
        clauses.push(`${col} < ${nextParam()}`);
        params.push(f.value ?? "");
        break;
      case "lte":
        clauses.push(`${col} <= ${nextParam()}`);
        params.push(f.value ?? "");
        break;
      case "contains":
        clauses.push(`${col} ILIKE ${nextParam()}`);
        params.push(`%${f.value ?? ""}%`);
        break;
      case "starts_with":
        clauses.push(`${col} ILIKE ${nextParam()}`);
        params.push(`${f.value ?? ""}%`);
        break;
      case "ends_with":
        clauses.push(`${col} ILIKE ${nextParam()}`);
        params.push(`%${f.value ?? ""}`);
        break;
      case "is_null":
        clauses.push(`${col} IS NULL`);
        break;
      case "is_not_null":
        clauses.push(`${col} IS NOT NULL`);
        break;
      default:
        break;
    }
  });

  if (clauses.length === 0) {
    return { whereSql: "", params: [] as Array<string | number | boolean | null> };
  }

  return { whereSql: ` WHERE ${clauses.join(" AND ")}`, params };
}

export async function insertDatas(
  connection: Connection,
  tableName: string,
  data: Record<string, unknown>,
  schema?: string
): Promise<{
  success: boolean;
  rows?: Record<string, unknown>[];
  message?: string;
}> {
  let client;
  try {
    client = await pgConnector(connection);

    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name" };
    }
    if (schema && !isValidIdent(schema)) {
      return { success: false, message: "Invalid schema name" };
    }

    const columns = Object.keys(data);
    if (columns.length === 0) {
      return { success: false, message: "No data provided for insert" };
    }

    for (const col of columns) {
      if (!isValidIdent(col)) {
        return { success: false, message: `Invalid column name: ${col}` };
      }
    }

    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

    const fullTableName = schema
      ? `"${schema}"."${tableName}"`
      : `"${tableName}"`;

    const query = `
      INSERT INTO ${fullTableName} (${columns
      .map((col) => `"${col}"`)
      .join(", ")})
      VALUES (${placeholders})
      RETURNING *
    `;

    const response = await client.query<Record<string, unknown>>(query, values);

    return { success: true, rows: response.rows };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error inserting data:", error.message);
      return {
        success: false,
        message: `Failed to insert data: ${error.message}`,
      };
    }
    console.error("Unknown error inserting data:", error);
    return {
      success: false,
      message: "Failed to insert data due to an unknown error.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing client in insertDatas:", endErr.message);
        } else {
          console.error("Unknown error closing client in insertDatas:", endErr);
        }
      });
    }
  }
}

export async function updateData(
  connection: Connection,
  tableName: string,
  pk: Record<string, unknown>,
  data: Record<string, unknown>,
  schema?: string
): Promise<{
  success: boolean;
  rows?: Record<string, unknown>[];
  message?: string;
}> {
  let client;
  try {
    client = await pgConnector(connection);

    const columns = Object.keys(data);
    const values = Object.values(data);

    const quoteIdent = (ident: string) => `"${ident.replace(/"/g, '""')}"`;

    if (columns.length === 0) {
      return { success: false, message: "No columns provided for update" };
    }

    const pkColumn = Object.keys(pk)[0];
    const pkValue = Object.values(pk)[0];
    if (!pkColumn) {
      return { success: false, message: "No primary key specified" };
    }

    const placeHolders = columns
      .map((column, i) => `${quoteIdent(column)} = $${i + 1}`)
      .join(", ");

    const pkParameterized = values.length + 1;

    const fullTableName = schema
      ? `"${schema}"."${tableName}"`
      : `"${tableName}"`;

    const query = `
      UPDATE ${fullTableName}
      SET ${placeHolders}
      WHERE ${quoteIdent(pkColumn)} = $${pkParameterized}
      RETURNING *
    `;

    const response = await client.query<Record<string, unknown>>(query, [
      ...values,
      pkValue,
    ]);

    return { success: true, rows: response.rows };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error updating data:", error.message);
      return {
        success: false,
        message: `Failed to update data: ${error.message}`,
      };
    }
    console.error("Unknown error updating data:", error);
    return {
      success: false,
      message: "Failed to update data due to an unknown error.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing client in updateData:", endErr.message);
        } else {
          console.error("Unknown error closing client in updateData:", endErr);
        }
      });
    }
  }
}

export async function deleteData(
  connection: Connection,
  tableName: string,
  pk: Record<string, unknown>,
  schema?: string
): Promise<{ success: boolean; message?: string }> {
  let client;
  try {
    client = await pgConnector(connection);

    const pkColumn = Object.keys(pk)[0];
    const pkValue = Object.values(pk)[0];

    if (!pkColumn || pkValue === undefined) {
      return { success: false, message: "Primary key is missing or invalid." };
    }

    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name" };
    }
    if (schema && !isValidIdent(schema)) {
      return { success: false, message: "Invalid schema name" };
    }
    if (!isValidIdent(pkColumn)) {
      return {
        success: false,
        message: `Invalid primary key column: ${pkColumn}`,
      };
    }

    const fullTableName = schema
      ? `"${schema}"."${tableName}"`
      : `"${tableName}"`;

    const query = `DELETE FROM ${fullTableName} WHERE "${pkColumn}" = $1`;

    await client.query(query, [pkValue]);

    return { success: true, message: "Row deleted successfully." };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error deleting data:", error.message);
      return {
        success: false,
        message: `Failed to delete data: ${error.message}`,
      };
    }
    console.error("Unknown error deleting data:", error);
    return {
      success: false,
      message: "Failed to delete data due to an unknown error.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing client in deleteData:", endErr.message);
        } else {
          console.error("Unknown error closing client in deleteData:", endErr);
        }
      });
    }
  }
}

export async function createTable(
  connection: Connection,
  tableName: string,
  schema?: string
): Promise<{ success: boolean; message?: string }> {
  let client;
  try {
    client = await pgConnector(connection);

    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name" };
    }
    if (schema && !isValidIdent(schema)) {
      return { success: false, message: "Invalid schema name" };
    }

    const fullTableName = schema
      ? `"${schema}"."${tableName}"`
      : `"${tableName}"`;

    const query = `CREATE TABLE ${fullTableName} ();`;

    await client.query(query);

    return { success: true, message: "Table created successfully." };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error creating table:", error.message);
      return {
        success: false,
        message: `Failed to create table: ${error.message}`,
      };
    }
    console.error("Unknown error creating table:", error);
    return {
      success: false,
      message: "Failed to create table due to an unknown error.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing client in createTable:", endErr.message);
        } else {
          console.error("Unknown error closing client in createTable:", endErr);
        }
      });
    }
  }
}

export async function createTableEncrypted(
  connection: Omit<Connection, "password"> & { encryptedCredentials: string },
  tableName: string,
  schema?: string
) {
  const full = inflateEncryptedConnection(connection);
  return createTable(full, tableName, schema);
}

export async function addPostgresColumn(
  connection: Connection,
  columns: ColumnOptions[],
  tableName: string,
  schema?: string
): Promise<{ success: boolean; message?: string }> {
  let client;
  try {
    client = await pgConnector(connection);

    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name" };
    }
    if (schema && !isValidIdent(schema)) {
      return { success: false, message: "Invalid schema name" };
    }

    const fullTableName = schema
      ? `"${schema}"."${tableName}"`
      : `"${tableName}"`;

    for (const col of columns) {
      const fragment = buildSQLFragment(col, "postgresql");
      const query = `ALTER TABLE ${fullTableName} ADD COLUMN ${fragment}`;
      await client.query(query);
    }

    return { success: true, message: "Columns added successfully." };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error adding columns:", error.message);
      return {
        success: false,
        message: `Failed to add columns: ${error.message}`,
      };
    }
    console.error("Unknown error adding columns:", error);
    return {
      success: false,
      message: "Failed to add columns due to an unknown error.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error(
            "Error closing client in addPostgresColumn:",
            endErr.message
          );
        } else {
          console.error(
            "Unknown error closing client in addPostgresColumn:",
            endErr
          );
        }
      });
    }
  }
}

export async function addPostgresColumnEncrypted(
  connection: Omit<Connection, "password"> & { encryptedCredentials: string },
  columns: ColumnOptions[],
  tableName: string,
  schema?: string
) {
  const full = inflateEncryptedConnection(connection);
  return addPostgresColumn(full, columns, tableName, schema);
}

export async function createSchema(
  connection: Connection,
  schema: string
): Promise<{ success: boolean; message?: string }> {
  let client;
  try {
    client = await pgConnector(connection);

    const isValidIdent = (name: string) => /^[a-zA-Z0-9_]+$/.test(name);
    if (!isValidIdent(schema)) {
      return { success: false, message: "Invalid schema name" };
    }

    const query = `CREATE SCHEMA "${schema}"`;

    await client.query(query);

    return { success: true, message: "Schema created successfully." };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error creating schema:", error.message);
      return {
        success: false,
        message: `Failed to create schema: ${error.message}`,
      };
    }
    console.error("Unknown error creating schema:", error);
    return {
      success: false,
      message: "Failed to create schema due to an unknown error.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error(
            "Error closing client in createSchema:",
            endErr.message
          );
        } else {
          console.error(
            "Unknown error closing client in createSchema:",
            endErr
          );
        }
      });
    }
  }
}

export async function createSchemaEncrypted(
  connection: Omit<Connection, "password"> & { encryptedCredentials: string },
  schema: string
) {
  const full = inflateEncryptedConnection(connection);
  return createSchema(full, schema);
}

export async function deletePgTable(
  connection: Connection,
  tableName: string,
  schema?: string
): Promise<{ success: boolean; message: string }> {
  let client;
  try {
    client = await pgConnector(connection);

    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name." };
    }
    if (schema && !isValidIdent(schema)) {
      return { success: false, message: "Invalid schema name." };
    }

    const fullTableName = schema
      ? `"${schema}"."${tableName}"`
      : `"${tableName}"`;

    const query = `DROP TABLE ${fullTableName}`;
    await client.query(query);

    return {
      success: true,
      message: `Table "${fullTableName}" deleted successfully.`,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error deleting PostgreSQL table:", error.message);
      return {
        success: false,
        message: `Failed to delete table: ${error.message}`,
      };
    }
    console.error("Unknown error deleting PostgreSQL table:", error);
    return {
      success: false,
      message: "Failed to delete table due to unknown error.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing PostgreSQL connection:", endErr.message);
        } else {
          console.error("Unknown error closing PostgreSQL connection:", endErr);
        }
      });
    }
  }
}

export async function deletePgTableEncrypted(
  connection: Omit<Connection, "password"> & { encryptedCredentials: string },
  tableName: string,
  schema?: string
) {
  const full = inflateEncryptedConnection(connection);
  return deletePgTable(full, tableName, schema);
}

export async function truncatePgTable(
  connection: Connection,
  tableName: string,
  schema?: string
): Promise<{ success: boolean; message: string }> {
  let client;
  try {
    client = await pgConnector(connection);

    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name." };
    }
    if (schema && !isValidIdent(schema)) {
      return { success: false, message: "Invalid schema name." };
    }

    const fullTableName = schema
      ? `"${schema}"."${tableName}"`
      : `"${tableName}"`;

    const query = `TRUNCATE TABLE ${fullTableName}`;
    await client.query(query);

    return {
      success: true,
      message: `Table "${fullTableName}" truncated successfully.`,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error truncating PostgreSQL table:", error.message);
      return {
        success: false,
        message: `Failed to truncate table: ${error.message}`,
      };
    }
    console.error("Unknown error truncating PostgreSQL table:", error);
    return {
      success: false,
      message: "Failed to truncate table due to unknown error.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing PostgreSQL connection:", endErr.message);
        } else {
          console.error("Unknown error closing PostgreSQL connection:", endErr);
        }
      });
    }
  }
}

export async function truncatePgTableEncrypted(
  connection: Omit<Connection, "password"> & { encryptedCredentials: string },
  tableName: string,
  schema?: string
) {
  const full = inflateEncryptedConnection(connection);
  return truncatePgTable(full, tableName, schema);
}
