"use server";

import { mgConnector } from "@/lib/adapters/mongo";
import { Connection, TableFilter } from "@/types/connection";
import { decryptString } from "@/lib/server/crypto";
import { ObjectId } from "mongodb";

export async function getCollections(connection: Connection) {
  const client = await mgConnector(connection);

  const database = client.db(connection.database);

  const collections = [];
  const colls = database.listCollections({}, { nameOnly: true });

  for await (const doc of colls) {
    const collectionName = doc.name;
    const collection = database.collection(collectionName);
    const count = await collection.estimatedDocumentCount(); // or countDocuments() for more accuracy

    collections.push({
      name: collectionName,
      count,
    });
  }

  return { success: true, tables: collections };
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

export async function getCollectionsEncrypted(
  connection: Omit<Connection, "password"> & { encryptedCredentials: string }
) {
  const full = inflateEncryptedConnection(connection);
  return getCollections(full);
}

export async function deleteCollections({
  collection,
  connection,
}: {
  collection: string;
  connection: Connection;
}): Promise<{ success: boolean; message?: string }> {
  let client;
  try {
    client = await mgConnector(connection);
    const db = client.db(connection.database);

    // Validate collection name
    const isValidIdent = (name: string) => /^[a-zA-Z0-9_]+$/.test(name);

    if (!isValidIdent(collection)) {
      return { success: false, message: "Invalid collection name." };
    }

    const collectionToDelete = db.collection(collection);
    const dropped = await collectionToDelete.drop();

    if (!dropped) {
      return {
        success: false,
        message: `Collection "${collection}" could not be dropped.`,
      };
    }

    return {
      success: true,
      message: `Collection "${collection}" deleted successfully.`,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error deleting collection:", error.message);
      return {
        success: false,
        message: `Failed to delete collection: ${error.message}`,
      };
    }
    console.error("Unknown error deleting collection:", error);
    return {
      success: false,
      message: "Failed to delete collection due to an unknown error.",
    };
  } finally {
    if (client) {
      await client.close().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error(
            "Error closing MongoDB client in deleteCollections:",
            endErr.message
          );
        } else {
          console.error(
            "Unknown error closing MongoDB client in deleteCollections:",
            endErr
          );
        }
      });
    }
  }
}

export async function deleteCollectionsEncrypted(
  connection: Omit<Connection, "password"> & { encryptedCredentials: string },
  collection: string
) {
  const full = inflateEncryptedConnection(connection);
  return deleteCollections({ collection, connection: full });
}

export async function getCollectionDocs({
  collection,
  page = 1,
  pagesize = 10,
  connection,
  filters = [],
}: {
  collection: string;
  page?: number;
  pagesize?: number;
  connection: Connection;
  filters?: TableFilter[];
}): Promise<{
  success: boolean;
  data?: Record<string, unknown>[];
  message?: string;
  totalPages?: number;
}> {
  let client;
  try {
    client = await mgConnector(connection);

    if (!collection || typeof collection !== "string") {
      return { success: false, message: "Invalid collection name." };
    }
    if (page < 1 || pagesize < 1) {
      return {
        success: false,
        message: "Page and pagesize must be positive integers.",
      };
    }

    const offset = (page - 1) * pagesize;
    const db = client.db(connection.database);
    const col = db.collection(collection);
    const query = buildMongoQuery(filters);
    const total = await col.countDocuments(query);
    const totalPages = Math.ceil(total / pagesize);
    const docs = await col.find(query).skip(offset).limit(pagesize).toArray();

    return {
      success: true,
      message: "data fetched successfully",
      data: JSON.parse(JSON.stringify(docs)),
      totalPages,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error fetching MongoDB collection docs:", error.message);
      return {
        success: false,
        message: `Failed to fetch docs: ${error.message}`,
      };
    }
    console.error("Unknown error fetching MongoDB collection docs:", error);
    return {
      success: false,
      message: "Failed to fetch docs due to unknown error.",
    };
  } finally {
    if (client) {
      await client.close().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error("Error closing MongoDB client:", endErr.message);
        } else {
          console.error("Unknown error closing MongoDB client:", endErr);
        }
      });
    }
  }
}

function buildMongoQuery(filters: TableFilter[]) {
  const clauses: Record<string, any>[] = [];

  const coerceValue = (val?: string) => {
    if (val === undefined) return val;
    const trimmed = val.trim();
    if (trimmed === "") return val;
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    const num = Number(trimmed);
    if (!Number.isNaN(num) && trimmed === String(num)) return num;
    return val;
  };

  filters.forEach((f) => {
    if (!f.column) return;
    const value = coerceValue(f.value);
    switch (f.op) {
      case "eq":
        clauses.push({ [f.column]: value ?? null });
        break;
      case "neq":
        clauses.push({ [f.column]: { $ne: value ?? null } });
        break;
      case "gt":
        clauses.push({ [f.column]: { $gt: value } });
        break;
      case "gte":
        clauses.push({ [f.column]: { $gte: value } });
        break;
      case "lt":
        clauses.push({ [f.column]: { $lt: value } });
        break;
      case "lte":
        clauses.push({ [f.column]: { $lte: value } });
        break;
      case "contains":
        clauses.push({
          [f.column]: { $regex: f.value ?? "", $options: "i" },
        });
        break;
      case "starts_with":
        clauses.push({
          [f.column]: { $regex: `^${escapeRegex(f.value ?? "")}`, $options: "i" },
        });
        break;
      case "ends_with":
        clauses.push({
          [f.column]: { $regex: `${escapeRegex(f.value ?? "")}$`, $options: "i" },
        });
        break;
      case "exists":
        clauses.push({ [f.column]: { $exists: true } });
        break;
      case "not_exists":
        clauses.push({ [f.column]: { $exists: false } });
        break;
      case "is_null":
        clauses.push({ [f.column]: null });
        break;
      case "is_not_null":
        clauses.push({ [f.column]: { $ne: null } });
        break;
      default:
        break;
    }
  });

  if (clauses.length === 0) return {};
  return { $and: clauses };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


export async function insertDoc(
  collectionName: string,
  document: Record<string, unknown>,
  connection: Connection
): Promise<{
  success: boolean;
  message?: string;
}> {
  let client;
  try {
    client = await mgConnector(connection);
    const db = client.db(connection.database);
    // Validate collection name
    const isValidIdent = (name: string) => /^[a-zA-Z0-9_]+$/.test(name);

    if (!isValidIdent(collectionName)) {
      return { success: false, message: "Invalid collection name." };
    }

    const col = db.collection(collectionName);
    await col.insertOne(document);

    return {
      success: true,
      message: "Document inserted successfully.",
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message ?? "Error inserting document:");
      return {
        success: false,
        message: error.message ?? "Failed to insert document",
      };
    }
    console.error("Unknown error inserting document:", error);
    return {
      success: false,
      message: "Failed to insert document.",
    };
  } finally {
    if (client) {
      await client.close().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error(
            "Error closing MongoDB client in insertDoc:",
            endErr.message
          );
        } else {
          console.error(
            "Unknown error closing MongoDB client in insertDoc:",
            endErr
          );
        }
      });
    }
  }
}


export async function updateDoc(
  collectionName: string,
  id: string,
  update: Record<string, unknown>,
  connection: Connection
): Promise<{
  success: boolean;
  message: string;
  matchedCount?: number;
  modifiedCount?: number;
}> {
  let client;
  try {
    client = await mgConnector(connection);
    const db = client.db(connection.database);
    const col = db.collection(collectionName);

    // Validate ObjectId
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return {
        success: false,
        message: "Invalid MongoDB ObjectId format.",
      };
    }

    const result = await col.updateOne({ _id: objectId }, { $set: update });
    if (result.matchedCount === 0) {
      return {
        success: false,
        message: "Document not found.",
        matchedCount: 0,
        modifiedCount: 0,
      };
    }

    if (result.modifiedCount === 0) {
      return {
        success: true,
        message: "No changes were applied.",
        matchedCount: result.matchedCount,
        modifiedCount: 0,
      };
    }

    return {
      success: true,
      message: "Document updated successfully.",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  } catch (error) {
    return {
      success: false,
      message: `Update failed: ${(error as Error).message}`,
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
}


export async function unsetDocField(
  collectionName: string,
  id: string,
  field: string,
  connection: Connection
): Promise<{
  success: boolean;
  message?: string;
}> {
  let client;
  try {
    client = await mgConnector(connection);
    const db = client.db(connection.database);

    // Validate collection name
    const isValidIdent = (name: string) => /^[a-zA-Z0-9_.]+$/.test(name);

    if (!isValidIdent(collectionName)) {
      return { success: false, message: "Invalid collection name." };
    }

    if (!ObjectId.isValid(id)) {
      return { success: false, message: "Invalid document ID." };
    }

    if (!isValidIdent(field)) {
      return { success: false, message: "Invalid field name." };
    }

    const col = db.collection(collectionName);

    const result = await col.updateOne(
      { _id: new ObjectId(id) },
      { $unset: { [field]: "" } }
    );

    if (result.modifiedCount && result.modifiedCount > 0) {
      return {
        success: true,
        message: `Field  removed successfully.`,
      };
    } else {
      return {
        success: false,
        message: "No document found or field already missing.",
      };
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error unsetting field:", error.message);
      return {
        success: false,
        message: error.message ?? "Failed to delete field",
      };
    }
    console.error("Unknown error unsetting field:", error);
    return {
      success: false,
      message: "Failed to unset field due to an unknown error.",
    };
  } finally {
    if (client) {
      await client.close().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error(
            "Error closing MongoDB client in unsetDocField:",
            endErr.message
          );
        } else {
          console.error(
            "Unknown error closing MongoDB client in unsetDocField:",
            endErr
          );
        }
      });
    }
  }
}

export async function unsetDocFieldEncrypted(
  connection: Omit<Connection, "password"> & { encryptedCredentials: string },
  collectionName: string,
  id: string,
  field: string
) {
  const full = inflateEncryptedConnection(connection);
  return unsetDocField(collectionName, id, field, full);
}
export async function deleteDoc(
  collectionName: string,
  id: string,
  connection: Connection
): Promise<{
  success: boolean;
  message?: string;
}> {
  let client;
  try {
    client = await mgConnector(connection);
    const db = client.db(connection.database);

    // Validate collection name
    const isValidIdent = (name: string) => /^[a-zA-Z0-9_]+$/.test(name);

    if (!isValidIdent(collectionName)) {
      return { success: false, message: "Invalid collection name." };
    }

    if (!ObjectId.isValid(id)) {
      return { success: false, message: "Invalid document ID." };
    }

    const col = db.collection(collectionName);
    const result = await col.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount && result.deletedCount > 0) {
      return {
        success: true,
        message: "Document deleted successfully.",
      };
    } else {
      return {
        success: false,
        message: "No document found with the given ID.",
      };
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error deleting document:", error.message);
      return {
        success: false,
        message: `Failed to delete document: ${error.message}`,
      };
    }
    console.error("Unknown error deleting document:", error);
    return {
      success: false,
      message: "Failed to delete document due to an unknown error.",
    };
  } finally {
    if (client) {
      await client.close().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error(
            "Error closing MongoDB client in deleteDoc:",
            endErr.message
          );
        } else {
          console.error(
            "Unknown error closing MongoDB client in deleteDoc:",
            endErr
          );
        }
      });
    }
  }
}


export async function createCollection(
  collectionName: string,
  connection: Connection
): Promise<{ success: boolean; message?: string }> {
  let client;
  try {
    client = await mgConnector(connection);
    const db = client.db(connection.database);

    // Validate collection name
    const isValidIdent = (name: string) => /^[a-zA-Z0-9_]+$/.test(name);

    if (!isValidIdent(collectionName)) {
      return { success: false, message: "Invalid collection name." };
    }

    await db.createCollection(collectionName);

    return {
      success: true,
      message: `Collection "${collectionName}" created successfully.`,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error creating collection:", error.message);
      return {
        success: false,
        message: `Failed to create collection: ${error.message}`,
      };
    }
    console.error("Unknown error creating collection:", error);
    return {
      success: false,
      message: "Failed to create collection due to an unknown error.",
    };
  } finally {
    if (client) {
      await client.close().catch((endErr: unknown) => {
        if (endErr instanceof Error) {
          console.error(
            "Error closing MongoDB client in createCollection:",
            endErr.message
          );
        } else {
          console.error(
            "Unknown error closing MongoDB client in createCollection:",
            endErr
          );
        }
      });
    }
  }
}

export async function createCollectionEncrypted(
  connection: Omit<Connection, "password"> & { encryptedCredentials: string },
  collectionName: string
) {
  const full = inflateEncryptedConnection(connection);
  return createCollection(collectionName, full);
}
