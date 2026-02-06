"use client";

import { truncateMysqlTableById } from "@/app/actions/mysql";
import { truncatePgTableById } from "@/app/actions/postgres";
import { Button } from "@/components/ui/button";
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
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

function TruncateTrigger({
  connectionId,
  connectionType,
  tableName,
  onSuccess,
}: {
  connectionId: string;
  connectionType: "postgresql" | "mysql" | "mongodb";
  tableName: string;
  onSuccess?: () => void;
}) {
  const [input, setInput] = useState<string>("");
  const [confirmed, setConfirmed] = useState<boolean>(false);

  useEffect(() => {
    setConfirmed(input === tableName);
  }, [input, tableName]);

  const handleTruncate = async () => {
    if (connectionType === "mysql") {
      const result = await truncateMysqlTableById(connectionId, tableName);
      if (result.success) {
        toast.success(result.message ?? "Table truncated successfully");
        onSuccess?.();
      } else {
        toast.error(result.message ?? "Failed to truncate table");
      }
    } else if (connectionType === "postgresql") {
      const result = await truncatePgTableById(connectionId, tableName);
      if (result.success) {
        toast.success(result.message ?? "Table truncated successfully");
        onSuccess?.();
      } else {
        toast.error(result.message ?? "Failed to truncate table");
      }
    } else {
      toast.error("Truncate not supported for this database type");
    }
  };

  return (
    <Dialog>
      <DialogTrigger>
        <div className="bg-red-600 hover:bg-red-500 cursor-pointer p-1 px-2 rounded-md text-white">
          Truncate
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-sm">Truncate Table</DialogTitle>
          <DialogDescription>
            Type <span className="text-sm text-red-600">{tableName}</span> to
            confirm truncate. This will <b>remove all rows</b> but keep the
            table.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="tableName"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="col-span-3"
          />
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleTruncate}
            className="bg-red-600 hover:bg-red-500 text-white"
            disabled={!confirmed}
          >
            Truncate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TruncateTrigger;
