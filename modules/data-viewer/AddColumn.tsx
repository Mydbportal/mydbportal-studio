"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColumnOptions, Dialect } from "@/types/connection";
import { MYSQL_TYPES, POSTGRES_TYPES } from "@/lib/constants";
import { buildSQLFragment } from "@/lib/helpers/helpers";
import { addPostgresColumnById } from "@/app/actions/postgres";
import { Plus } from "lucide-react";
import { addMysqlColumnById, createMysqlTableById } from "@/app/actions/mysql";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function AddColumnDialog({
  tableName,
  connectionId,
  dialect,
  schema,
  create,
  onSuccess,
}: {
  tableName: string;
  dialect: Dialect;
  connectionId: string;
  schema?: string;
  create?: boolean;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [columns, setColumns] = useState<ColumnOptions[]>([
    {
      name: "",
      type: dialect === "mysql" ? "text" : "TEXT",
      isNullable: false,
      isPrimaryKey: false,
      isUnique: false,
      autoincrement: false,
      default: "",
      check: "",
    },
  ]);
  const [step, setStep] = useState<"form" | "review">("form");

  const handleChange = <K extends keyof ColumnOptions>(
    index: number,
    key: K,
    value: ColumnOptions[K],
  ) => {
    setColumns((prev) => {
      const newCols = [...prev];
      newCols[index] = { ...newCols[index], [key]: value };
      return newCols;
    });
  };

  const addColumn = () => {
    setColumns((prev) => [
      ...prev,
      {
        name: "",
        type: dialect === "mysql" ? "text" : "TEXT",
        isNullable: true,
        isPrimaryKey: false,
        isUnique: false,
        default: "",
        check: "",
        comment: "",
      },
    ]);
    
  };

  const removeColumn = (index: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReview = () => {
    if (columns.some((c) => !c.name || !c.type))
      return alert("All columns must have a name and type");

    setStep("review");
  };

  const handleSubmit = async () => {
    if (create) {
      const result = await createMysqlTableById(connectionId, tableName, columns);
      if (result.success) {
        toast.success(result.message ?? "column created successfuly ");
        onSuccess?.();
      } else {
        toast.error(result.message ?? "failed to create column");
      }
    } else {
      if (dialect === "postgresql") {
        const result = await addPostgresColumnById(
          connectionId,
          columns,
          tableName,
          schema,
        );
        if (result.success) {
          toast.success(result.message ?? "column created successfuly ");
          onSuccess?.();
        } else {
          toast.error(result.message ?? "failed to create column");
        }
      } else if (dialect === "mysql") {
        const result = await addMysqlColumnById(connectionId, columns, tableName);
        if (result.success) {
          toast.success(result.message ?? "column created successfully");
          onSuccess?.();
        } else {
          toast.error(result.message ?? "failed to create column");
        }
      }

      setStep("form");
      setOpen(false);
      setColumns([
        {
          name: "",
          type: "TEXT",
          isNullable: true,
          isPrimaryKey: false,
          isUnique: false,
          default: "",
          check: "",
        },
      ]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild className="bg-primary">
        <div className="border bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 flex p-1 rounded-md cursor-pointer">
          <Plus />
          Add Columns
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl w-full max-h-[calc(100vh-10rem)] overflow-scroll space-y-4">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Add Columns to {tableName}</DialogTitle>
              <DialogDescription>
                Fill in each column, then review SQL
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {columns.map((col, idx) => {
                const showLength = ["VARCHAR", "CHAR", "varchar", "char"].includes(
                  col.type,
                );
                const showPrecision = ["NUMERIC", "DECIMAL"].includes(col.type);
                const showArray = [
                  "INT",
                  "BIGINT",
                  "SMALLINT",
                  "DECIMAL",
                  "NUMERIC",
                  "REAL",
                  "DOUBLE PRECISION",
                  "TEXT",
                  "CHAR",
                  "VARCHAR",
                  "varchar",
                ].includes(col.type);

                return (
                  <div key={idx} className="border p-4 rounded space-y-8">
                    <div className="flex justify-between items-center">
                      <Label>New column</Label>
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
                        onChange={(e) =>
                          handleChange(idx, "name", e.target.value)
                        }
                      />
                      <Select
                        value={col.type}
                        onValueChange={(value) =>
                          handleChange(idx, "type", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Data types" />
                        </SelectTrigger>
                        <SelectContent className="h-[200px]">
                          {(dialect === "postgresql"
                            ? POSTGRES_TYPES
                            : MYSQL_TYPES
                          ).map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {showLength && (
                        <Input
                          type="number"
                          placeholder="Length"
                          value={col.length || ""}
                          onChange={(e) =>
                            handleChange(
                              idx,
                              "length",
                              parseInt(e.target.value),
                            )
                          }
                        />
                      )}
                      {showPrecision && (
                        <>
                          <Input
                            type="number"
                            placeholder="Precision"
                            value={col.precision || ""}
                            onChange={(e) =>
                              handleChange(
                                idx,
                                "precision",
                                parseInt(e.target.value),
                              )
                            }
                          />
                          <Input
                            type="number"
                            placeholder="Scale"
                            value={col.scale || ""}
                            onChange={(e) =>
                              handleChange(
                                idx,
                                "scale",
                                parseInt(e.target.value),
                              )
                            }
                          />
                        </>
                      )}
                      {showArray && dialect === "postgresql" && (
                        <Input
                          type="number"
                          placeholder="Array Dimension"
                          value={col.arrayDimension || ""}
                          onChange={(e) =>
                            handleChange(
                              idx,
                              "arrayDimension",
                              parseInt(e.target.value),
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
                      <Label>auto increment</Label>
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
                );
              })}
              <Button variant="outline" onClick={addColumn}>
                Add Another Column
              </Button>
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReview}>Review SQL</Button>
            </DialogFooter>
          </>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <Label>SQL Preview</Label>
            <pre className="p-3 rounded-md border bg-muted text-sm overflow-x-auto">
              {columns
                .map(
                  (c) =>
                    `ALTER TABLE ${tableName} ADD COLUMN ${buildSQLFragment(
                      c,
                      dialect,
                    )};`,
                )
                .join("\n")}
            </pre>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("form")}>
                Back
              </Button>
              <Button onClick={handleSubmit}>Submit</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
