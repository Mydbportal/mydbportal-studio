"use client";
import { Search, Table } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { ConnectForm } from "../connection/ConnectForm";
import { QueryEditorDialog } from "../master-console/QueryEditorDialog";
import { ConnectionList } from "../connection/ConnectionList";
import { getTablesById } from "@/app/actions/tables";
import Link from "next/link";
import { getSchemasById } from "@/app/actions/postgres";
import { getConnectionMeta } from "@/app/actions/connection";

import SchemaOptions from "./SchemaOptions";
import { ConnectionSummary } from "@/types/connection";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { SelectTrigger } from "@radix-ui/react-select";
import DeleteTriger from "./DeleteTriger";

export function ExplorerSidebar() {
  const searchParams = useSearchParams();
  const connectionId = searchParams.get("connectionId");
  const tableName = searchParams.get("table");

  const [connected, setConnected] = useState<ConnectionSummary | undefined>();
  const [schemas, setSchemas] = useState<string[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<string>();
  const [tables, setTables] = useState<{ name: string; count: number }[]>([]);
  const [activeTable, setActiveTable] = useState(tableName || "");
  const [loadingTables, setLoadingTables] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter tables efficiently
  const filteredTables = useMemo(() => {
    return tables.filter((t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [tables, searchTerm]);

  // Load connection whenever connectionId changes
  useEffect(() => {
    if (!connectionId) {
      setConnected(undefined);
      setSchemas([]);
      setSelectedSchema(undefined);
      setTables([]);
      return;
    }

    const loadConnection = async () => {
      const result = await getConnectionMeta(connectionId);
      if (!result.success || !result.connection) {
        toast.error("Connection not found", {
          description: "The selected connection could not be found.",
        });
        setConnected(undefined);
        return;
      }
      setConnected(result.connection ?? undefined);
    };

    loadConnection();
  }, [connectionId]);

  // Load schemas if PostgreSQL
  useEffect(() => {
    if (!connected || connected.type !== "postgresql") {
      setSchemas([]);
      setSelectedSchema(undefined);
      return;
    }

    const fetchSchemas = async () => {
      if (!connectionId) return;
      const schema = await getSchemasById(connectionId);
      if (schema.success && schema.schemas && schema.schemas.length > 0) {
        setSchemas(schema.schemas);
        setSelectedSchema(schema.schemas[0]);
      } else {
        setSchemas([]);
        setSelectedSchema(undefined);
      }
    };

    fetchSchemas();
  }, [connected, connectionId]);

  // Load tables whenever connection or schema changes
  useEffect(() => {
    if (!connected) {
      setTables([]);
      return;
    }
    const fetchTables = async () => {
      setLoadingTables(true);
      let result: {
        success: boolean;
        tables?: { name: string; count: number }[];
        message?: string;
      } = { success: false, message: "Connection type not supported." };
      if (connectionId) {
        result = await getTablesById(connectionId, selectedSchema);
      }
      if (result.success && result.tables) {
        setTables(result.tables);
        setActiveTable(result.tables[0]?.name || "");
      } else {
        toast.error("Failed to load tables", {
          description: result.message || "An unknown error occurred.",
        });
        setTables([]);
      }
      setLoadingTables(false);
    };

    fetchTables();
  }, [connected, selectedSchema, connectionId]);

  return (
    <div className="flex h-full flex-col gap-4 px-2 py-4 w-full">
      {/* --- Connections Section --- */}
      <div className="w-full">
        <h3 className="mb-2 px-4 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          Connections {selectedSchema}
        </h3>
        <nav className="grid gap-1 w-full">
          <ConnectionList currentConnectionId={connectionId ?? ""} />
          <ConnectForm />
        </nav>
      </div>

      {/* --- Tables Section --- */}
      <Accordion
        type="single"
        collapsible
        defaultValue="item-1"
        className="w-full h-full"
      >
        <AccordionItem value="item-1" className="border-b-0 h-full">
          <div className="px-3 py-2 text-xs font-semibold flex justify-between tracking-wider uppercase text-muted-foreground hover:no-underline">
            {connected?.type === "postgresql" ? (
              <Select value={selectedSchema} onValueChange={setSelectedSchema}>
                <SelectTrigger className="w-[180px] focus:outline-none">
                  <div className="w-full border border-gray-400/50 p-2 rounded-md">
                    <SelectValue placeholder="Select schema" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {schemas.map((schema, i) => (
                      <SelectItem value={schema} key={i}>
                        {schema}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : (
              <div>tables</div>
            )}
            {connected && connectionId && (
              <SchemaOptions
                connection={connected}
                connectionId={connectionId}
                schema={selectedSchema}
              />
            )}
          </div>

          <AccordionContent className="pt-1 h-full">
            <div className="flex flex-col gap-2 px-1 h-full">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search tables..."
                  className="w-full rounded-lg bg-background pl-8"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Table List */}
              <div className="flex flex-col gap-1 max-h-[50vh] w-full overflow-auto">
                {loadingTables ? (
                  <p className="text-sm text-muted-foreground px-3 py-2">
                    Loading tables...
                  </p>
                ) : filteredTables.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-3 py-2">
                    {connectionId
                      ? "No tables found"
                      : "Select a connection to view tables."}
                  </p>
                ) : (
                  filteredTables.map((table) => (
                    <div
                      className="flex w-full justify-between pr-4"
                      key={table.name}
                    >
                      <Link
                        href={`/studio?connectionId=${connectionId}&tableName=${
                          table.name
                        }${selectedSchema ? `&schema=${selectedSchema}` : ""}`}
                        onClick={() => setActiveTable(table.name)}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-md px-1 py-2 text-sm text-muted-foreground transition-all hover:bg-muted/50 group hover:text-foreground",
                          activeTable === table.name &&
                            "bg-muted/90 font-medium text-foreground dark:bg-muted",
                        )}
                      >
                        <div className="flex items-center gap-2 relative">
                          <Table className="h-4 w-4" />
                          <span>
                            {table.name.length > 7
                              ? `${table.name.slice(0, 7)}..`
                              : table.name}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs"
                        >
                          {table.count.toLocaleString()}
                        </Badge>
                      </Link>

                      {connected && connectionId && (
                        <DeleteTriger
                          connectionId={connectionId}
                          connectionType={connected.type}
                          tableName={table.name}
                          schema={selectedSchema}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {connected?.type === "mysql" ||
        (connected?.type === "postgresql" && <QueryEditorDialog />)}
    </div>
  );
}
