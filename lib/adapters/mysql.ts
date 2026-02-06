import { Connection } from "@/types/connection";
import mysql, { ConnectionOptions } from "mysql2/promise";

function parseMysqlSslMode(
  value: string | null | undefined,
): ConnectionOptions["ssl"] | undefined {
  if (!value) return undefined;
  const mode = value.toUpperCase();
  if (mode === "DISABLED") return undefined;
  if (mode === "VERIFY_CA" || mode === "VERIFY_IDENTITY") {
    return { rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
}

function buildMysqlUri(connection: Connection) {
  const base = `mysql://${connection.user}:${connection.password}@${connection.host}${
    connection.port ? `:${connection.port}` : ""
  }${connection.database ? `/${connection.database}` : ""}`;

  if (!connection.search) return { uri: base, params: new URLSearchParams() };

  const raw = connection.search.startsWith("?")
    ? connection.search.slice(1)
    : connection.search;
  const params = new URLSearchParams(raw);
  return { uri: base, params };
}

export const mysqlConnector = async (connection: Connection) => {
  const { uri, params } = buildMysqlUri(connection);

  const sslMode = params.get("ssl-mode") ?? params.get("sslmode");
  const sslParam = params.get("ssl");

  if (sslMode) {
    params.delete("ssl-mode");
    params.delete("sslmode");
  }
  if (sslParam) {
    params.delete("ssl");
  }

  const query = params.toString();
  const finalUri = query ? `${uri}?${query}` : uri;

  const options: ConnectionOptions = { uri: finalUri };

  if (connection.ssl) {
    options.ssl = { rejectUnauthorized: false };
  }
  if (sslMode) {
    options.ssl = parseMysqlSslMode(sslMode);
  } else if (sslParam && sslParam.toLowerCase() === "true") {
    options.ssl = { rejectUnauthorized: false };
  }

  const client = await mysql.createConnection(options);
  return client;
};
