"use server";

import {
  Connection,
  TableSchema,
  TableColumn,
  CrudResult,
  TableFilter,
} from "@/types/connection";
import { deleteDoc, getCollectionDocs, insertDoc, updateDoc } from "./mongo";
import {
  deleteData,
  getTableColumns,
  getTableDatas,
  insertDatas,
  updateData,
} from "./postgres";
import {
  deleteMysqlRow,
  getMysqlData,
  insertMysqlRaw,
  updateMysqlRow,
} from "./mysql";
import { getConnectionById } from "@/lib/server/connection-vault";

interface GetTableDataResult {
  success: boolean;
  data?: unknown[];
  schema?: TableSchema;
  message?: string;
  totalPages?: number;
}

export async function getTableData(
  connection: Connection,
  tableName: string,

  Schema?: string,
  page: number = 1,
  pageSize: number = 20,
  filters: TableFilter[] = [],
): Promise<GetTableDataResult> {
  try {
    if (connection.type === "mysql") {
      const result = await getMysqlData(
        connection,
        tableName,
        page,
        pageSize,
        filters,
      );
      if (result.success) {
        return {
          success: true,
          data: result.data,
          schema: result.schema,
          totalPages: result.totalPages,
        };
      } else {
        return { success: false, message: result.message };
      }
    } else if (connection.type === "postgresql") {
      const result = await getTableColumns(connection, tableName, Schema);

      if (!result.success || !result.columns) {
        throw new Error(result.message ?? "Failed to fetch columns");
      }

      const columns: TableColumn[] = result.columns.map((col) => ({
        columnName: col.column_name,
        dataType: col.data_type,
        isNullable: col.is_nullable === "YES",
        columnKey:
          col.constraint_type === "PRIMARY KEY"
            ? "PRI"
            : col.constraint_type || "",
        defaultValue: col.column_default,
        extra: "",
      }));

      const schema: TableSchema = { tableName, columns };

      const dataResult = await getTableDatas({
        connection,
        tableName,
        schema: Schema,
        limit: pageSize,
        page,
        filters,
      });

      if (!dataResult.success || !dataResult.rows) {
        throw new Error(dataResult.message ?? "Failed to fetch table data");
      }

      return {
        success: true,
        data: dataResult.rows,
        schema,
        totalPages: dataResult.totalPages,
      };
    } else if (connection.type === "mongodb") {
      try {
        const result = await getCollectionDocs({
          collection: tableName,
          connection,
          page,
          pagesize: pageSize,
          filters,
        });
        if (result.success) {
          return {
            success: true,
            data: result.data,
            message: result.message,
            totalPages: result.totalPages,
          };
        } else {
          return { success: false, message: result.message };
        }
      } catch (error) {
        console.error("Error fetching MongoDB data:", error);
        return {
          success: false,
          message: `Failed to fetch data from MongoDB: ${
            (error as Error).message
          }`,
        };
      }
    } else {
      return { success: false, message: "Unsupported database type." };
    }
  } catch (error: unknown) {
    console.error("Error fetching table data:", error);
    return {
      success: false,
      message: `Failed to fetch table data: ${(error as Error).message}`,
    };
  }
}

export async function getTableDataById(
  connectionId: string,
  tableName: string,
  schema?: string,
  page: number = 1,
  pageSize: number = 20,
  filters: TableFilter[] = [],
): Promise<GetTableDataResult> {
  const connection = getConnectionById(connectionId);
  return getTableData(connection, tableName, schema, page, pageSize, filters);
}

export async function insertRow(
  connection: Connection,
  tableName: string,
  rowData: Record<string, unknown>,
  schema?: string
): Promise<CrudResult> {
  try {
    if (connection.type === "mysql") {
      const result = await insertMysqlRaw(connection, tableName, rowData);
      if (result.success) {
        return { success: true, message: "Row inserted successfully." };
      } else {
        return { success: false, message: "failed to insert row." };
      }
    } else if (connection.type === "postgresql") {
      const insertResult = await insertDatas(
        connection,
        tableName,
        rowData,
        schema
      );

      if (!insertResult.success) {
        throw new Error(insertResult.message ?? "Failed to insert row");
      }

      return { success: true, message: "Row inserted successfully." };
    } else if (connection.type === "mongodb") {
      const result = await insertDoc(tableName, rowData, connection);
      if (result.success) {
        return {
          success: true,
          message: result.message ?? "Document inserted succeccfully",
        };
      } else {
        return { success: false, message: result.message };
      }
      return { success: true, message: "Row inserted successfully." };
    } else {
      return { success: false, message: "Unsupported database type." };
    }
  } catch (error: unknown) {
    console.error("Error inserting row:", error);
    return {
      success: false,
      message: `Failed to insert row: ${(error as Error).message}`,
    };
  }
}

export async function insertRowById(
  connectionId: string,
  tableName: string,
  rowData: Record<string, unknown>,
  schema?: string
): Promise<CrudResult> {
  const connection = getConnectionById(connectionId);
  return insertRow(connection, tableName, rowData, schema);
}

export async function updateRow(
  connection: Connection,
  tableName: string,
  primaryKeyColumn: string,
  primaryKeyValue: string | number,
  rowData: Record<string, unknown>,
  schema?: string
): Promise<CrudResult> {
  try {
    if (connection.type === "mysql") {
      const result = await updateMysqlRow(
        connection,
        tableName,
        primaryKeyColumn,
        primaryKeyValue,
        rowData
      );
      if (result.success) {
        return { success: true, message: "Row updated successfully." };
      } else {
        return {
          success: false,
          message: result.message ?? "failed to update row.",
        };
      }
    } else if (connection.type === "postgresql") {
      const pk = {
        [primaryKeyColumn]: primaryKeyValue,
      };
      const result = await updateData(
        connection,
        tableName,
        pk,
        rowData,
        schema
      );
      if (!result.success) {
        throw new Error(result.message ?? "Failed to update row");
      }
      return { success: true, message: "Row updated successfully." };
    } else if (connection.type === "mongodb") {
      const result = await updateDoc(
        tableName,
        primaryKeyValue?.toString(),
        rowData,
        connection
      );
      if (result.success) {
        return {
          success: true,
          message: result.message ?? "Row updated successfully.",
        };
      } else {
        return {
          success: false,
          message: result.message ?? "failed to update",
        };
      }
    } else {
      return { success: false, message: "Unsupported database type." };
    }
  } catch (error: unknown) {
    console.error("Error updating row:", error);
    return {
      success: false,
      message: `Failed to update row: ${(error as Error).message}`,
    };
  }
}

export async function updateRowById(
  connectionId: string,
  tableName: string,
  primaryKeyColumn: string,
  primaryKeyValue: string | number,
  rowData: Record<string, unknown>,
  schema?: string
): Promise<CrudResult> {
  const connection = getConnectionById(connectionId);
  return updateRow(
    connection,
    tableName,
    primaryKeyColumn,
    primaryKeyValue,
    rowData,
    schema
  );
}

export async function deleteRow(
  connection: Connection,
  tableName: string,
  primaryKeyColumn: string,
  primaryKeyValue: string | number,
  schema?: string
): Promise<CrudResult> {
  try {
    if (connection.type === "mysql") {
      const result = await deleteMysqlRow(
        connection,
        tableName,
        primaryKeyColumn,
        primaryKeyValue
      );
      if (result.success) {
        return { success: true, message: "Row deleted successfully." };
      } else {
        return { success: false, message: "Failed to delete row." };
      }
    } else if (connection.type === "postgresql") {
      const pk = {
        [primaryKeyColumn]: primaryKeyValue,
      };
      const deleteResult = await deleteData(connection, tableName, pk, schema);
      if (!deleteResult.success) {
        throw new Error(deleteResult.message ?? "failed to delete row");
      }

      return { success: true, message: "Row deleted successfully." };
    } else if (connection.type === "mongodb") {
      const result = await deleteDoc(
        tableName,
        primaryKeyValue?.toString(),
        connection
      );
      if (result.success) {
        return {
          success: true,
          message: result.message ?? "Doc deleted successfully",
        };
      } else {
        return {
          success: false,
          message: result.message ?? "Failed to delete doc",
        };
      }
    } else {
      return { success: false, message: "Unsupported database type." };
    }
  } catch (error: unknown) {
    console.error("Error deleting row:", error);
    return {
      success: false,
      message: `Failed to delete row: ${(error as Error).message}`,
    };
  }
}

export async function deleteRowById(
  connectionId: string,
  tableName: string,
  primaryKeyColumn: string,
  primaryKeyValue: string | number,
  schema?: string
): Promise<CrudResult> {
  const connection = getConnectionById(connectionId);
  return deleteRow(
    connection,
    tableName,
    primaryKeyColumn,
    primaryKeyValue,
    schema
  );
}
