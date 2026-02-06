"use server";

import { mysqlConnector } from "@/lib/adapters/mysql";
import {
  buildCreateMysqlTableSQL,
  buildSQLFragment,
  sanitizeIdentifier,
} from "@/lib/helpers/helpers";
import {
  ColumnOptions,
  Connection,
  TableColumn,
  TableSchema,
  TableFilter,
} from "@/types/connection";
import { RowDataPacket } from "mysql2";
import { getConnectionById } from "@/lib/server/connection-vault";

interface CountRow extends RowDataPacket {
  total: number;
}

export async function getMysqlData(
  connection: Connection,
  tableName: string,
  page: number = 1,
  pageSize: number = 20,
  filters: TableFilter[] = [],
): Promise<{
  success: boolean;
  data?: Record<string, unknown>[];
  schema?: TableSchema;
  totalPages?: number;
  page?: number;
  pageSize?: number;
  message?: string;
}> {
  let mysqlConnection;
  try {
    mysqlConnection = await mysqlConnector(connection);

    // Validate identifier to prevent SQL injection
    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name." };
    }

    // Fetch schema info
    const [schemaRows] = await mysqlConnection.execute(
      `SHOW COLUMNS FROM \`${tableName}\``,
    );

    interface MySQLSchemaRow {
      Field: string;
      Type: string;
      Null: string;
      Key: string;
      Default: string | null;
      Extra: string;
    }

    const columns: TableColumn[] = (schemaRows as MySQLSchemaRow[]).map(
      (row) => ({
        columnName: row.Field,
        dataType: row.Type,
        isNullable: row.Null === "YES",
        columnKey: row.Key,
        defaultValue: row.Default,
        extra: row.Extra,
      }),
    );

    const schema: TableSchema = { tableName, columns };

    const { whereSql, params } = buildMysqlWhere(filters);

    const [countRows] = await mysqlConnection.execute<CountRow[]>(
      `SELECT COUNT(*) as total FROM \`${tableName}\`${whereSql}`,
      params,
    );

    const totalPages: number = Math.ceil(countRows[0]?.total / pageSize);

    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Fetch data with pagination
    const [dataRows] = await mysqlConnection.query(
      `SELECT * FROM \`${tableName}\`${whereSql} LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), Number(offset)],
    );

    return {
      success: true,
      data: dataRows as Record<string, unknown>[],
      schema,
      totalPages,
      page,
      pageSize,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error fetching MySQL data:", error.message);
      return {
        success: false,
        message: `Failed to fetch data: ${error.message}`,
      };
    }
    console.error("Unknown error fetching MySQL data:", error);
    return {
      success: false,
      message: "Failed to fetch data due to an unknown error.",
    };
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing MySQL connection:", endErr.message);
        } else {
          console.error("Unknown error closing MySQL connection:", endErr);
        }
      });
    }
  }
}

function buildMysqlWhere(filters: TableFilter[]) {
  const clauses: string[] = [];
  const params: Array<string | number | boolean | null> = [];
  const isValidIdent = (name: string) =>
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

  filters.forEach((f) => {
    if (!f.column || !isValidIdent(f.column)) return;
    const col = `\`${f.column}\``;

    switch (f.op) {
      case "eq":
        clauses.push(`${col} = ?`);
        params.push(f.value ?? "");
        break;
      case "neq":
        clauses.push(`${col} != ?`);
        params.push(f.value ?? "");
        break;
      case "gt":
        clauses.push(`${col} > ?`);
        params.push(f.value ?? "");
        break;
      case "gte":
        clauses.push(`${col} >= ?`);
        params.push(f.value ?? "");
        break;
      case "lt":
        clauses.push(`${col} < ?`);
        params.push(f.value ?? "");
        break;
      case "lte":
        clauses.push(`${col} <= ?`);
        params.push(f.value ?? "");
        break;
      case "contains":
        clauses.push(`${col} LIKE ?`);
        params.push(`%${f.value ?? ""}%`);
        break;
      case "starts_with":
        clauses.push(`${col} LIKE ?`);
        params.push(`${f.value ?? ""}%`);
        break;
      case "ends_with":
        clauses.push(`${col} LIKE ?`);
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

export async function insertMysqlRaw(
  connection: Connection,
  tableName: string,
  data: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  let mysqlConnection;
  try {
    mysqlConnection = await mysqlConnector(connection);

    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name." };
    }

    const columns = Object.keys(data).map(sanitizeIdentifier);
    if (columns.length === 0) {
      return { success: false, message: "No data provided for insertion." };
    }

    const values = Object.values(data);
    const placeholders = columns.map(() => "?").join(", ");

    const query = `INSERT INTO \`${sanitizeIdentifier(
      tableName,
    )}\` (\`${columns.join("`, `")}\`) VALUES (${placeholders})`;

    await mysqlConnection.execute(query, values);

    return { success: true, message: "Row inserted successfully." };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error inserting MySQL data:", error.message);
      return { success: false, message: `Insert failed: ${error.message}` };
    }
    console.error("Unknown error inserting MySQL data:", error);
    return {
      success: false,
      message: "Insert failed due to an unknown error.",
    };
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing MySQL connection:", endErr.message);
        } else {
          console.error("Unknown error closing MySQL connection:", endErr);
        }
      });
    }
  }
}

export async function deleteMysqlRow(
  connection: Connection,
  tableName: string,
  primaryKeyColumn: string,
  primaryKeyValue: string | number,
): Promise<{ success: boolean; message: string }> {
  let mysqlConnection;
  try {
    mysqlConnection = await mysqlConnector(connection);

    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name." };
    }
    if (!isValidIdent(primaryKeyColumn)) {
      return { success: false, message: "Invalid primary key column." };
    }

    const query = `DELETE FROM \`${tableName}\` WHERE \`${primaryKeyColumn}\` = ?`;
    await mysqlConnection.execute(query, [primaryKeyValue]);

    return { success: true, message: "Row deleted successfully." };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error deleting MySQL row:", error.message);
      return { success: false, message: `Delete failed: ${error.message}` };
    }
    console.error("Unknown error deleting MySQL row:", error);
    return {
      success: false,
      message: "Delete failed due to an unknown error.",
    };
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing MySQL connection:", endErr.message);
        } else {
          console.error("Unknown error closing MySQL connection:", endErr);
        }
      });
    }
  }
}

export async function updateMysqlRow(
  connection: Connection,
  tableName: string,
  primaryKeyColumn: string,
  primaryKeyValue: string | number,
  rowData: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  let mysqlConnection;
  try {
    mysqlConnection = await mysqlConnector(connection);

    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name." };
    }
    if (!isValidIdent(primaryKeyColumn)) {
      return { success: false, message: "Invalid primary key column." };
    }
    if (!rowData || Object.keys(rowData).length === 0) {
      return { success: false, message: "No data provided to update." };
    }

    const updates = Object.keys(rowData)
      .map((col) => {
        if (!isValidIdent(col)) throw new Error(`Invalid column name: ${col}`);
        return `\`${col}\` = ?`;
      })
      .join(", ");

    const values = [...Object.values(rowData), primaryKeyValue];
    const query = `UPDATE \`${tableName}\` SET ${updates} WHERE \`${primaryKeyColumn}\` = ?`;

    await mysqlConnection.execute(query, values);

    return { success: true, message: "Row updated successfully." };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error updating MySQL row:", error.message);
      return { success: false, message: `Update failed: ${error.message}` };
    }
    console.error("Unknown error updating MySQL row:", error);
    return {
      success: false,
      message: "Update failed due to an unknown error.",
    };
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing MySQL connection:", endErr.message);
        } else {
          console.error("Unknown error closing MySQL connection:", endErr);
        }
      });
    }
  }
}

export async function addMysqlColumn(
  connection: Connection,
  columns: ColumnOptions[],
  tableName: string,
): Promise<{ success: boolean; message: string }> {
  let client;
  try {
    client = await mysqlConnector(connection);

    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name." };
    }
    if (!columns || columns.length === 0) {
      return { success: false, message: "No column definitions provided." };
    }

    for (const col of columns) {
      if (!col.name || !isValidIdent(col.name)) {
        return {
          success: false,
          message: `Invalid column name: ${col.name || "(empty)"}`,
        };
      }
      const fragment = buildSQLFragment(
        { ...col, name: sanitizeIdentifier(col.name) },
        "mysql",
      );
      const query = `ALTER TABLE \`${tableName}\` ADD COLUMN ${fragment}`;
      await client.query(query);
    }

    return { success: true, message: "Column(s) added successfully." };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error adding MySQL column:", error.message);
      return { success: false, message: `Add column failed: ${error.message}` };
    }
    console.error("Unknown error adding MySQL column:", error);
    return {
      success: false,
      message: "Add column failed due to unknown error.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing MySQL connection:", endErr.message);
        } else {
          console.error("Unknown error closing MySQL connection:", endErr);
        }
      });
    }
  }
}

export async function addMysqlColumnById(
  connectionId: string,
  columns: ColumnOptions[],
  tableName: string,
) {
  const connection = getConnectionById(connectionId);
  return addMysqlColumn(connection, columns, tableName);
}

export async function createMysqlTable(
  connection: Connection,
  tableName: string,
  columns: ColumnOptions[],
): Promise<{ success: boolean; message: string }> {
  let client;
  try {
    client = await mysqlConnector(connection);

    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name." };
    }

    if (!columns || columns.length === 0) {
      return { success: false, message: "At least one column is required." };
    }

    const safeColumns = columns.map((col) => {
      if (!col.name || !isValidIdent(col.name)) {
        throw new Error(`Invalid column name: ${col.name || "(empty)"}`);
      }
      return { ...col, name: sanitizeIdentifier(col.name) };
    });

    const query = buildCreateMysqlTableSQL(safeColumns, tableName);
    await client.execute(query);

    return { success: true, message: "Table created successfully." };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error creating MySQL table:", error.message);
      return {
        success: false,
        message: `Table creation failed: ${error.message}`,
      };
    }
    console.error("Unknown error creating MySQL table:", error);
    return {
      success: false,
      message: "Table creation failed due to unknown error.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing MySQL connection:", endErr.message);
        } else {
          console.error("Unknown error closing MySQL connection:", endErr);
        }
      });
    }
  }
}

export async function createMysqlTableById(
  connectionId: string,
  tableName: string,
  columns: ColumnOptions[],
) {
  const connection = getConnectionById(connectionId);
  return createMysqlTable(connection, tableName, columns);
}

export async function truncateMysqlTable(
  connection: Connection,
  tableName: string,
): Promise<{ success: boolean; message: string }> {
  let client;
  try {
    client = await mysqlConnector(connection);

    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name." };
    }

    const query = `TRUNCATE TABLE \`${tableName}\``;
    await client.execute(query);

    return {
      success: true,
      message: `Table "${tableName}" truncated successfully.`,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error truncating MySQL table:", error.message);
      return {
        success: false,
        message: `Failed to truncate table: ${error.message}`,
      };
    }
    console.error("Unknown error truncating MySQL table:", error);
    return {
      success: false,
      message: "Failed to truncate table due to unknown error.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing MySQL connection:", endErr.message);
        } else {
          console.error("Unknown error closing MySQL connection:", endErr);
        }
      });
    }
  }
}

export async function truncateMysqlTableById(
  connectionId: string,
  tableName: string,
) {
  const connection = getConnectionById(connectionId);
  return truncateMysqlTable(connection, tableName);
}

export async function deleteMysqlTable(
  connection: Connection,
  tableName: string,
): Promise<{ success: boolean; message: string }> {
  let client;
  try {
    client = await mysqlConnector(connection);

    const isValidIdent = (name: string) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

    if (!isValidIdent(tableName)) {
      return { success: false, message: "Invalid table name." };
    }

    const query = `DROP TABLE \`${tableName}\``;
    await client.execute(query);

    return {
      success: true,
      message: `Table "${tableName}" deleted successfully.`,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error deleting MySQL table:", error.message);
      return {
        success: false,
        message: `Failed to delete table: ${error.message}`,
      };
    }
    console.error("Unknown error deleting MySQL table:", error);
    return {
      success: false,
      message: "Failed to delete table due to unknown error.",
    };
  } finally {
    if (client) {
      await client.end().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing MySQL connection:", endErr.message);
        } else {
          console.error("Unknown error closing MySQL connection:", endErr);
        }
      });
    }
  }
}

export async function deleteMysqlTableById(
  connectionId: string,
  tableName: string,
) {
  const connection = getConnectionById(connectionId);
  return deleteMysqlTable(connection, tableName);
}
