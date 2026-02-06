"use client";

import Editor from "react-simple-code-editor";
// @ts-expect-error due to prism core doesnt have types
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-sql";
import "prismjs/themes/prism-tomorrow.css";
import { format } from "sql-formatter";
import { Play, Sparkles, X, PlusCircle, Loader, History } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { executeEncryptedQuery } from "@/app/actions/query";
import { Connection, ConnectionSummary } from "@/types/connection";
import { getConnectionById } from "@/lib/connection-storage";
import { useSearchParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const initialTabs = [
  { id: "tab1", name: "Query 1", query: "SELECT * FROM users;" },
];

export function QueryEditor() {
  const searchParams = useSearchParams();

  const connectionId = searchParams.get("connectionId");
  const [activeConnection, setConnection] =
    React.useState<ConnectionSummary | null>(null);
  const [activeConnectionFull, setConnectionFull] =
    React.useState<Connection | null>(null);

  React.useEffect(() => {
    async function GetConnection() {
      if (!connectionId) {
        setError("Connection not found.");
        return;
      }
      const connection = await getConnectionById(connectionId);
      if (!connection) {
        setError("Connection not found.");
        return;
      }
      setConnection({
        id: connection.id,
        name: connection.name,
        type: connection.type,
        host: connection.host,
        protocol: connection.protocol ?? undefined,
        search: connection.search ?? undefined,
        port: connection.port ?? undefined,
        user: connection.user,
        database: connection.database,
        filepath: connection.filepath,
        ssl: connection.ssl,
      });
      setConnectionFull(connection);
    }
    GetConnection();
  }, [connectionId]);

  const [tabs, setTabs] = React.useState(initialTabs);
  const [activeTabId, setActiveTabId] = React.useState("tab1");
  const [history, setHistory] = React.useState<string[]>([]);
  const [results, setResults] = React.useState<Array<{
    [key: string]: string | number | boolean | null;
  }> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const handleQueryChange = (newQuery: string) => {
    setTabs(
      tabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, query: newQuery } : tab
      )
    );
  };

  const handleRunQuery = async () => {
    if (!activeTab || !activeConnectionFull) {
      setError("No active connection or query tab.");
      return;
    }
    if (!activeConnectionFull.encryptedCredentials) {
      setError("Connection credentials are missing.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    if (!history.includes(activeTab.query)) {
      setHistory([activeTab.query, ...history]);
    }

    if (!connectionId) {
      setError("Connection not found.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await executeEncryptedQuery(
      activeConnectionFull,
      activeTab.query
    );

    if (error) {
      setError(error);
    } else {
      setResults(Array.isArray(data) ? data : null);
    }
    setIsLoading(false);
  };

  const handleFormatQuery = () => {
    if (activeTab) {
      try {
        const formatted = format(activeTab.query, {
          language: activeConnection?.type === "mongodb" ? "n1ql" : "sql",
        });
        handleQueryChange(formatted);
      } catch (error) {
        console.error("Failed to format query:", error);
      }
    }
  };

  const addTab = () => {
    const newTabId = `tab${Date.now()}`;
    const newTab = {
      id: newTabId,
      name: `Query ${tabs.length + 1}`,
      query: "-- New Query",
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTabId);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return;

    const tabIndex = tabs.findIndex((tab) => tab.id === tabId);
    setTabs(tabs.filter((tab) => tab.id !== tabId));

    if (activeTabId === tabId) {
      const newActiveTab = tabs[tabIndex - 1] || tabs[tabIndex + 1];
      setActiveTabId(newActiveTab.id);
    }
  };

  return (
    <TooltipProvider>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Master Console</CardTitle>
            <CardDescription>
              Run SQL or MongoDB queries with tabbed editing.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="border border-gray-400 py-1 px-2 rounded-md">
              {activeConnection?.name}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFormatQuery}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Format Query</p>
              </TooltipContent>
            </Tooltip>

            {/* to do a querry hostory*/}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <History className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Query History</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 py-4">
                  {history.length > 0 ? (
                    history.map((q, i) => (
                      <div
                        key={i}
                        className="text-sm p-2 border rounded-md bg-muted/50 font-mono"
                      >
                        {q}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No queries run yet.
                    </p>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* export query*/}
            {/* <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <FileDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Export as CSV</DropdownMenuItem>
                <DropdownMenuItem>Export as JSON</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu> */}

            <Button
              className="gap-x-2"
              onClick={handleRunQuery}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Query
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 ">
          <Tabs
            value={activeTabId}
            onValueChange={setActiveTabId}
            className="flex-1 flex flex-col h-full"
          >
            <div className="px-4 max-w-2xl overflow-x-auto ">
              <TabsList className="h-auto ">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="h-auto p-0 inline-flex"
                    asChild
                  >
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <span>{tab.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                        className="p-0.5 rounded hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </TabsTrigger>
                ))}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={addTab}
                      className="ml-2 p-1.5 rounded-md hover:bg-muted"
                    >
                      <PlusCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>New Query Tab</p>
                  </TooltipContent>
                </Tooltip>
              </TabsList>
            </div>

            {tabs.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="flex-1 mt-0 h-full"
              >
                <Editor
                  value={tab.query}
                  onValueChange={handleQueryChange}
                  highlight={(code) => highlight(code, languages.sql, "sql")}
                  padding={16}
                  className="font-mono text-sm bg-[#282a36] text-white rounded-b-lg h-full focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                  style={{
                    minHeight: "100%",
                  }}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
        <ResultViewer results={results} error={error} isLoading={isLoading} />

        <CardFooter className="text-sm text-muted-foreground border-t pt-4">
          Status:{" "}
          {isLoading
            ? "Running query..."
            : error
            ? `Error: ${error}`
            : results
            ? `${results.length} rows returned`
            : "Ready"}
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}

function ResultViewer({
  results,
  error,
  isLoading,
}: {
  results: Array<Record<string, string | number | boolean | null>> | null;
  error: string | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-500/10 rounded-lg m-4">
        {error}
      </div>
    );
  }

  if (!results) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Run a query to see results.
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Query returned no results.
      </div>
    );
  }

  const headers = Object.keys(results[0]);

  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {headers.map((header) => (
                <TableCell key={header}>
                  {JSON.stringify(row[header])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
