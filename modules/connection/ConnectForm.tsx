"use client";

import {
  Beaker,
  Database,
  Link,
  Plug,
  PlusCircle,
  Save,
  RefreshCw,
} from "lucide-react";
import React, { useState } from "react";
import { match } from "ts-pattern";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { testConnection } from "@/app/actions/connection";
import { createConnection } from "@/lib/connection-actions";
import { Toaster } from "@/components/ui/sonner";
import {
  getConnectionPayload,
  parseConnectionString,
} from "@/lib/helpers/helpers";
import { InputField } from "@/components/inputField";
import type { Connection } from "@/types/connection";

export function ConnectForm() {
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState<"manual" | "auto">("manual");
  const [details, setDetails] = useState<Partial<Connection>>();
  const [connectionString, setConnectionString] = useState("");
  const [saveToVault, setSaveToVault] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);

  const handleDetailsChange = (updates: Partial<Connection>) => {
    setDetails((prev) => ({ ...prev, ...updates }));
  };

  const handleTypeChange = (newType: Connection["type"]) => {
    const defaultPort = match(newType)
      .with("mysql", () => 3306)
      .with("postgresql", () => 5432)
      .with("mongodb", () => 27017)
      .otherwise(() => undefined);

    handleDetailsChange({
      type: newType,
      port: defaultPort,
    });
  };

  const connectionStringExample = match(details ? details.type : "")
    .with("mysql", () => "mysql://user:pass@host:3306/db")
    .with("postgresql", () => "postgresql://user:pass@host:5432/db")
    .with("mongodb", () => "mongodb+srv://user:pass@cluster.mongodb.net/db")
    .otherwise(() => "protocol://user:pass@host/db");

  const resetForm = () => {
    setDetails(undefined);
    setConnectionString("");
    setSaveToVault(true);
    setTab("manual");
  };

  const handleConnectionStringChange = (str: string) => {
    setConnectionString(str);

    const parsed = parseConnectionString(str);
    handleDetailsChange(parsed);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const result = await testConnection(getConnectionPayload(details));
      if (result.success) {
        toast.success("Connection Successful", {
          description: result.message,
        });
      } else {
        toast.error("Test Failed", { description: result.message });
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error(e.message);
      } else {
        toast.error("Error", { description: "An unexpected error occurred." });
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const handleConnect = async () => {
    try {
      const newConnection = getConnectionPayload(details);
      if (saveToVault) {
        const result = await createConnection(newConnection);
        if (!result.success || !result.connection) {
          throw new Error(result.message || "Failed to save connection.");
        }
        toast.success("Saved", {
          description: `Connected and saved "${newConnection.name}"`,
        });
        router.push(`/studio?connectionId=${result.connection.id}`);
      } else {
        toast.success("Connected", {
          description: `Connected to "${newConnection.name}"`,
        });
      }
      setDialogOpen(false);
      resetForm();
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error("Connection Failed", {
          description: e.message,
        });
      } else {
        toast.error("Connection failed");
      }
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Add Connection
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <Toaster />
        <DialogHeader>
          <DialogTitle>New Database Connection</DialogTitle>
          <DialogDescription>
            Connect via manual setup or a connection string.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as typeof tab);
            if (v === "auto") {
              handleDetailsChange({ port: undefined });
            }
          }}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="manual">
              <Database className="mr-2 h-4 w-4" /> Manual
            </TabsTrigger>
            <TabsTrigger value="auto">
              <Link className="mr-2 h-4 w-4" /> Connection String
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="pt-4">
            <div className="grid gap-4">
              <InputField
                label="Connection Name"
                value={details?.name ?? ""}
                onChange={(v) => handleDetailsChange({ name: v })}
              />
              <div className="space-y-2">
                <Label>Database Type</Label>
                <Select
                  value={details?.type ?? ""}
                  onValueChange={(v) =>
                    handleTypeChange(v as Connection["type"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Database" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="mongodb">MongoDB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* MongoDB Protocol Selector */}
              {details?.type === "mongodb" && (
                <div className="space-y-2">
                  <Label>Protocol</Label>
                  <Select
                    value={details.protocol}
                    onValueChange={(v) =>
                      handleDetailsChange({
                        protocol: v as Connection["protocol"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select MongoDB Protocol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mongodb+srv">mongodb+srv</SelectItem>
                      <SelectItem value="mongodb">mongodb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Host"
                  value={details?.host ?? ""}
                  onChange={(v) => handleDetailsChange({ host: v })}
                />
                <InputField
                  label="Port"
                  value={String(details?.port ?? "")}
                  onChange={(v) => handleDetailsChange({ port: Number(v) })}
                />
              </div>
              <InputField
                label="User"
                value={details?.user ?? ""}
                onChange={(v) => handleDetailsChange({ user: v })}
              />
              <InputField
                label="Password"
                type="password"
                value={details?.password ?? ""}
                onChange={(v) => handleDetailsChange({ password: v })}
              />
              <InputField
                label="Database Name"
                value={details?.database ?? ""}
                onChange={(v) => handleDetailsChange({ database: v })}
              />
            </div>
          </TabsContent>

          <TabsContent value="auto" className="pt-4">
            <div className="space-y-4">
              <InputField
                label="Connection Name"
                value={details?.name ?? ""}
                onChange={(v) => handleDetailsChange({ name: v })}
              />
              <InputField
                label="Connection String"
                value={connectionString}
                onChange={handleConnectionStringChange}
                placeholder={connectionStringExample}
              />
              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <CardDescription className="text-xs">
                    Example:{" "}
                    <code className="font-mono">{connectionStringExample}</code>
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              disabled
              id="save-connection"
              checked={saveToVault}
              onCheckedChange={setSaveToVault}
            />
            <Label
              htmlFor="save-connection"
              className="text-muted-foreground text-sm flex gap-2"
            >
              <Save className="h-4 w-4" />
              Save to vault
            </Label>
          </div>
          <div className="flex gap-2 self-end">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="gap-2"
            >
              {testingConnection ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Beaker className="h-4 w-4" />
              )}
              Test
            </Button>
            <Button className="gap-2" onClick={handleConnect}>
              <Plug className="h-4 w-4" />
              Connect
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
