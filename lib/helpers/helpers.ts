import { ColumnOptions, Connection, Dialect } from "@/types/connection";

export const parseConnectionString = (
  str: string,
): Omit<Connection, "name" | "id"> => {
  try {
    const url = new URL(str);
    const urlProtocol = url.protocol.replace(":", "");

    if (
      !["mysql", "postgres", "postgresql", "mongodb", "mongodb+srv"].includes(
        urlProtocol,
      )
    ) {
      throw new Error("Unsupported protocol");
    }

    const type: Connection["type"] = urlProtocol.startsWith("mongo")
      ? "mongodb"
      : urlProtocol.startsWith("postgresql")
        ? "postgresql"
        : "mysql";

    const protocol =
      type === "mongodb" ? (urlProtocol as Connection["protocol"]) : undefined;

    const search = url.search
      ? (url.search as Connection["search"])
      : undefined;

    return {
      type,
      protocol,
      search,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: parseInt(url.port) || undefined,
      database: url.pathname.replace("/", ""),
    };
  } catch {
    throw new Error("Invalid connection string");
  }
};

export const getConnectionPayload = (
  details: Partial<Connection> | undefined,
) => {
  const payload: Partial<Connection> = {
    name: details?.name,
    type: details?.type,
    host: details?.host,
    search: details?.search,
    port: details?.port,
    user: details?.user,
    password: details?.password,
    database: details?.database,
  };
  if (details?.type === "mongodb") {
    payload.protocol = details?.protocol;
  }
  return payload;
};

export function sanitizeIdentifier(identifier: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error("Invalid identifier: " + identifier);
  }
  return identifier;
}

export function buildSQLFragment(col: ColumnOptions, dialect: Dialect) {
  if (dialect === "postgresql") {
    let typeStr = col.type;
    if (["VARCHAR", "CHAR"].includes(col.type) && col.length)
      typeStr += `(${col.length})`;
    if (["NUMERIC", "DECIMAL"].includes(col.type)) {
      if (col.precision)
        typeStr += `(${col.precision}${col.scale ? `, ${col.scale}` : ""})`;
    }
    if (col.arrayDimension) typeStr += "[]".repeat(col.arrayDimension);
    const constraints: string[] = [];
    if (col.isPrimaryKey) constraints.push("PRIMARY KEY");
    if (col.isUnique) constraints.push("UNIQUE");
    if (col.isNullable === false) constraints.push("NOT NULL");
    if (col.default) constraints.push(`DEFAULT ${col.default}`);
    if (col.check) constraints.push(`CHECK (${col.check})`);
    return `"${col.name}" ${typeStr} ${constraints.join(" ")}`.trim();
  }

  if (dialect === "mysql") {
    let typeStr = col.type;

    if (["VARCHAR", "CHAR"].includes(col.type) && col.length) {
      typeStr += `(${col.length})`;
    }
    if (["DECIMAL", "NUMERIC", "FLOAT", "DOUBLE"].includes(col.type)) {
      if (col.precision) {
        typeStr += `(${col.precision}${col.scale ? `, ${col.scale}` : ""})`;
      }
    }

    const constraints: string[] = [];
    if (col.isPrimaryKey) constraints.push("PRIMARY KEY");
    if (col.isUnique) constraints.push("UNIQUE");
    if (col.isNullable === false) constraints.push("NOT NULL");
    if (col.default) constraints.push(`DEFAULT ${col.default}`);
    if (col.autoincrement && col.isPrimaryKey)
      constraints.push("AUTO_INCREMENT");
    if (col.check) constraints.push(`CHECK (${col.check})`);

    return `\`${col.name}\` ${typeStr} ${constraints.join(" ")}`.trim();
  }

  return "";
}
export function buildSQL(
  cols: ColumnOptions[],
  dialect: Dialect,
  tableName: string,
) {
  if (dialect === "postgresql") {
    return (
      cols
        .map((col: ColumnOptions) => {
          let typeStr = col.type;
          if (["VARCHAR", "CHAR"].includes(col.type) && col.length)
            typeStr += `(${col.length})`;
          if (["NUMERIC", "DECIMAL"].includes(col.type)) {
            if (col.precision)
              typeStr += `(${col.precision}${
                col.scale ? `, ${col.scale}` : ""
              })`;
          }
          if (col.arrayDimension) typeStr += "[]".repeat(col.arrayDimension);
          const constraints: string[] = [];
          if (col.isPrimaryKey) constraints.push("PRIMARY KEY");
          if (col.isUnique) constraints.push("UNIQUE");
          if (col.isNullable === false) constraints.push("NOT NULL");
          if (col.default) constraints.push(`DEFAULT ${col.default}`);
          if (col.check) constraints.push(`CHECK (${col.check})`);
          return `ALTER TABLE ${tableName} ADD COLUMN "${
            col.name
          }" ${typeStr} ${constraints.join(" ")}`.trim();
        })
        .join(";\n") + ";"
    );
  }

  if (dialect === "mysql") {
    return (
      cols
        .map((col: ColumnOptions) => {
          let typeStr = col.type;

          if (["VARCHAR", "CHAR", "varchar"].includes(col.type) && col.length) {
            typeStr += `(${col.length})`;
          }
          if (["DECIMAL", "NUMERIC", "FLOAT", "DOUBLE"].includes(col.type)) {
            if (col.precision) {
              typeStr += `(${col.precision}${
                col.scale ? `, ${col.scale}` : ""
              })`;
            }
          }

          const constraints: string[] = [];
          if (col.isPrimaryKey) constraints.push("PRIMARY KEY");
          if (col.isUnique) constraints.push("UNIQUE");
          if (col.isNullable === false) constraints.push("NOT NULL");
          if (col.default) constraints.push(`DEFAULT ${col.default}`);
          if (col.autoincrement && col.isPrimaryKey)
            constraints.push("AUTO_INCREMENT");
          if (col.check) constraints.push(`CHECK (${col.check})`);

          return `ALTER TABLE ${tableName} ADD COLUMN \`${
            col.name
          }\` ${typeStr} ${constraints.join(" ")}`.trim();
        })
        .join(";\n") + ";"
    );
  }

  return "";
}
export function buildCreateMysqlTableSQL(
  cols: ColumnOptions[],
  tableName: string,
) {
  const colDefs = cols.map((col: ColumnOptions) => {
    let typeStr = col.type;

    if (["VARCHAR", "CHAR", "varchar"].includes(col.type) && col.length) {
      typeStr += `(${col.length})`;
    }
    if (["DECIMAL", "NUMERIC", "FLOAT", "DOUBLE"].includes(col.type)) {
      if (col.precision) {
        typeStr += `(${col.precision}${col.scale ? `, ${col.scale}` : ""})`;
      }
    }

    const constraints: string[] = [];
    if (col.isPrimaryKey) constraints.push("PRIMARY KEY");
    if (col.isUnique) constraints.push("UNIQUE");
    if (col.isNullable === false) constraints.push("NOT NULL");
    if (col.default) constraints.push(`DEFAULT ${col.default}`);
    if (col.autoincrement && col.isPrimaryKey)
      constraints.push("AUTO_INCREMENT");
    if (col.check) constraints.push(`CHECK (${col.check})`);

    return `\`${col.name}\` ${typeStr} ${constraints.join(" ")}`.trim();
  });

  return `CREATE TABLE ${tableName} (\n  ${colDefs.join(",\n  ")}\n);`;
}

export function generatMysqlDummyColumnName(): string {
  const prefix = "portalv1_placeholder_";
  const random = Math.random().toString(16).slice(2, 10);
  return `${prefix}${random}`;
}

export async function buildFullPath(
  indexOrName: string | number,
  parentPath: (string | number)[],
) {
  const path: (string | number)[] = [];
  let namespace = parentPath;

  namespace = parentPath.slice(1);

  for (const key of namespace) {
    path.push(String(key));
  }

  path.push(indexOrName);
  return path.join(".");
}
