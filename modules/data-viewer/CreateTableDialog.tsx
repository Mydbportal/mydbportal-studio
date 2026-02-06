"use client";
import { createCollectionById } from "@/app/actions/mongo";
import { createMysqlTableById } from "@/app/actions/mysql";
import { createTableById } from "@/app/actions/postgres";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MYSQL_TYPES } from "@/lib/constants";
import { ColumnOptions } from "@/types/connection";
import { useState } from "react";
import { toast } from "sonner";

export function CreateTableDialog({
  connectionId,
  connectionType,
  schema,
}: {
  connectionId: string;
  connectionType: "postgresql" | "mysql" | "mongodb";
  schema?: string;
}) {
  const [table, setTable] = useState<string>("");
  const [columns, setColumns] = useState<ColumnOptions[]>([
    {
      name: "",
      type: "text",
      isNullable: false,
      isPrimaryKey: false,
      isUnique: false,
      autoincrement: false,
      default: "",
      check: "",
    },
  ]);

  const handleChange = <K extends keyof ColumnOptions>(
    index: number,
    key: K,
    value: ColumnOptions[K],
  ) => {
    setColumns((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const addColumn = () => {
    setColumns((prev) => [
      ...prev,
      {
        name: "",
        type: "text",
        isNullable: true,
        isPrimaryKey: false,
        isUnique: false,
        autoincrement: false,
        default: "",
        check: "",
      },
    ]);
  };

  const removeColumn = (index: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (connectionType === "postgresql") {
      const result = await createTableById(connectionId, table, schema);
      if (result.success) {
        toast.success(result.message ?? "Table create successfully");
      } else {
        toast.error(result.message ?? "failed to create table");
      }
    } else if (connectionType === "mongodb") {
      const result = await createCollectionById(connectionId, table);
      if (result.success) {
        toast.success(result.message ?? "table created successfully ");
      } else {
        toast.error(result.message ?? "failed to create table");
      }
    } else if (connectionType === "mysql") {
      const tableName = table.trim();
      const isValidIdent = (name: string) =>
        /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

      if (!tableName) {
        toast.error("Table name is required");
        return;
      }
      if (!isValidIdent(tableName)) {
        toast.error("Table name must be letters, numbers, and underscores only.");
        return;
      }
      if (columns.length === 0) {
        toast.error("At least one column is required");
        return;
      }
      if (columns.some((c) => !c.name || !c.type)) {
        toast.error("All columns must have a name and type");
        return;
      }
      for (const col of columns) {
        const colName = col.name.trim();
        if (!colName) {
          toast.error("Column name cannot be empty");
          return;
        }
        if (!isValidIdent(colName)) {
          toast.error(
            `Invalid column name \"${colName}\". Use letters, numbers, and underscores only.`,
          );
          return;
        }
      }

      const normalized = columns.map((col) => ({
        ...col,
        name: col.name.trim(),
        type: col.type.toLowerCase(),
      }));

      const result = await createMysqlTableById(
        connectionId,
        tableName,
        normalized,
      );
      if (result.success) {
        toast.success(result.message ?? "Table created successfully");
        setTable("");
        setColumns([
          {
            name: "",
            type: "text",
            isNullable: false,
            isPrimaryKey: false,
            isUnique: false,
            autoincrement: false,
            default: "",
            check: "",
          },
        ]);
      } else {
        toast.error(result.message ?? "failed to create table");
      }
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer hover:bg-primary/10 p-2 rounded-md">
          Add {connectionType === "mongodb" ? "Collection" : "Table"}
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[calc(100vh-10rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Create {connectionType === "mongodb" ? "Collection" : "Table"}{" "}
            {schema ? (
              <span>
                {" "}
                to <span className="text-red-500">{schema}</span> schema
              </span>
            ) : (
              ""
            )}
          </DialogTitle>
          <DialogDescription>
            Enter the name for your new{" "}
            {connectionType === "mongodb" ? "Collection" : "Table"}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="  items-center gap-4">
            <Input
              id="tableName"
              value={table}
              className="col-span-3"
              onChange={(e) => setTable(e.target.value)}
            />
          </div>
        </div>
        {connectionType === "mysql" && (
          <div className="space-y-4">
            {columns.map((col, idx) => (
              <div key={idx} className="border p-4 rounded space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Column {idx + 1}</Label>
                  {columns.length > 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeColumn(idx)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <Input
                    placeholder="Name"
                    value={col.name}
                    onChange={(e) => handleChange(idx, "name", e.target.value)}
                  />
                  <Select
                    value={col.type}
                    onValueChange={(value) =>
                      handleChange(idx, "type", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Data type" />
                    </SelectTrigger>
                    <SelectContent className="h-[200px]">
                      {MYSQL_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {["varchar", "char"].includes(col.type) && (
                    <Input
                      type="number"
                      placeholder="Length"
                      value={col.length || ""}
                      onChange={(e) =>
                        handleChange(
                          idx,
                          "length",
                          e.target.value ? parseInt(e.target.value) : undefined,
                        )
                      }
                    />
                  )}
                </div>
                <div className="flex gap-4 items-center flex-wrap">
                  <Checkbox
                    checked={col.isNullable}
                    onCheckedChange={(value) =>
                      handleChange(idx, "isNullable", value === true)
                    }
                  />
                  <Label>Nullable</Label>
                  <Checkbox
                    checked={col.isPrimaryKey}
                    onCheckedChange={(value) =>
                      handleChange(idx, "isPrimaryKey", value === true)
                    }
                  />
                  <Label>Primary Key</Label>
                  <Checkbox
                    checked={col.isUnique}
                    onCheckedChange={(value) =>
                      handleChange(idx, "isUnique", value === true)
                    }
                  />
                  <Label>Unique</Label>
                  <Checkbox
                    checked={col.autoincrement}
                    onCheckedChange={(value) =>
                      handleChange(idx, "autoincrement", value === true)
                    }
                  />
                  <Label>Auto Increment</Label>
                </div>
                <Input
                  placeholder="Default / expression"
                  value={col.default}
                  onChange={(e) =>
                    handleChange(idx, "default", e.target.value)
                  }
                />
                <Input
                  placeholder="Check (optional)"
                  value={col.check}
                  onChange={(e) =>
                    handleChange(idx, "check", e.target.value)
                  }
                />
              </div>
            ))}
            <Button variant="outline" onClick={addColumn}>
              Add Another Column
            </Button>
          </div>
        )}
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>
            Create Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
