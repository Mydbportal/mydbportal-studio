"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableSchema } from "@/types/connection";
import { insertRowById } from "@/app/actions/data";

export const AddRowDialog = ({
  isOpen,
  onClose,
  schema,
  connectionId,
  tableName,
  Schema,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  schema: TableSchema;
  connectionId: string;
  tableName: string;
  Schema?: string;
  onSuccess?: () => void;
}) => {
  const [newRowData, setNewRowData] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);

  const shouldSkipColumn = (col: any) => {
    const extra = typeof col.extra === "string" ? col.extra.toLowerCase() : "";
    const defaultVal =
      typeof col.defaultValue === "string"
        ? col.defaultValue.toLowerCase()
        : "";

    const isAutoIncrement = extra.includes("auto_increment");
    const isSerialLike = defaultVal.includes("nextval(");
    const isIdentity = defaultVal.includes("identity");

    if (isAutoIncrement || isSerialLike || isIdentity) return true;

    if (typeof col.defaultValue === "string") {
      const v = col.defaultValue.toLowerCase().replace(/\s+/g, "");
      if (
        v.includes("now()") ||
        v.includes("(now())") ||
        v.includes("current_timestamp") ||
        v.includes("(current_timestamp)")
      ) {
        return true;
      }
    }

    return false;
  };

  useEffect(() => {
    if (isOpen) {
      const initialData: Record<string, unknown> = {};

      schema.columns.forEach((col) => {
        // Skip auto-managed timestamp and generated columns
        if (shouldSkipColumn(col)) return;

        if (col.defaultValue !== null && col.defaultValue !== undefined) {
          initialData[col.columnName] = col.defaultValue;
        } else if (col.isNullable) {
          initialData[col.columnName] = null;
        } else {
          switch (col.dataType?.toLowerCase()) {
            case "int":
            case "integer":
            case "bigint":
            case "float":
            case "double":
            case "decimal":
              initialData[col.columnName] = 0;
              break;
            case "boolean":
            case "bool":
              initialData[col.columnName] = false;
              break;
            default:
              initialData[col.columnName] = "";
          }
        }
      });

      setNewRowData(initialData);
    }
  }, [isOpen, schema]);

  const handleFieldChange = (columnName: string, value: unknown) => {
    setNewRowData((prev) => ({ ...prev, [columnName]: value }));
  };

  const buildCleanPayload = () => {
    const cleaned = Object.fromEntries(
      Object.entries(newRowData).filter(([key]) => {
        const col = schema.columns.find((c) => c.columnName === key);
        return col && !shouldSkipColumn(col);
      }),
    );

    return cleaned;
  };

  const handleSubmit = async () => {
    setIsSaving(true);

    try {
      const cleanPayload = buildCleanPayload();
      const result = await insertRowById(
        connectionId,
        tableName,
        cleanPayload,
        Schema,
      );

      if (result.success) {
        toast.success("Row Added", { description: result.message });
        onSuccess?.();
        onClose();
      } else {
        toast.error("Add Row Failed", { description: result.message });
      }
    } catch (err) {
      toast.error("Add Row Error", {
        description: `An error occurred: ${(err as Error).message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Row to “{tableName}”</DialogTitle>
          <DialogDescription>
            Fill in the details for the new row. {Schema}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
          {schema.columns
            .filter((col) => !shouldSkipColumn(col))
            .map((col) => (
              <div
                key={col.columnName}
                className="grid grid-cols-4 items-center gap-4"
              >
                <Label htmlFor={col.columnName} className="text-right">
                  {col.columnName}
                  {!col.isNullable && (
                    <span className="text-destructive">*</span>
                  )}
                </Label>

                <div className="col-span-3">
                  <Input
                    id={col.columnName}
                    value={
                      newRowData[col.columnName] !== null &&
                      newRowData[col.columnName] !== undefined
                        ? String(newRowData[col.columnName])
                        : ""
                    }
                    onChange={(e) =>
                      handleFieldChange(col.columnName, e.target.value)
                    }
                    placeholder={col.dataType}
                    disabled={isSaving}
                  />
                </div>
              </div>
            ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Row"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
