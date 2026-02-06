import { deleteCollectionsById } from "@/app/actions/mongo";
import { deleteMysqlTableById } from "@/app/actions/mysql";
import { deletePgTableById } from "@/app/actions/postgres";
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

function DeleteTriger({
  connectionId,
  connectionType,
  tableName,
  schema,
  onSuccess,
}: {
  connectionId: string;
  connectionType: "postgresql" | "mysql" | "mongodb";
  tableName: string;
  schema?: string;
  onSuccess?: () => void;
}) {
  const [table, setTable] = useState<string>();
  const [confirmed, setConfirmed] = useState<boolean>(false);

  useEffect(() => {
    if (table === tableName) {
      setConfirmed(true);
    }
  }, [table, tableName]);
  const handleDelete = async () => {
    if (connectionType === "mongodb") {
      const result = await deleteCollectionsById(connectionId, tableName);
      if (result.success) {
        toast.success(result.message ?? "collection deleted successdfully");
        onSuccess?.();
      } else {
        toast.error(result.message ?? "Failed to delete collection");
      }
    } else if (connectionType === "mysql") {
      const result = await deleteMysqlTableById(connectionId, tableName);
      if (result.success) {
        toast.success(result.message ?? "collection deleted successdfully");
        onSuccess?.();
      } else {
        toast.error(result.message ?? "Failed to delete collection");
      }
    } else if (connectionType === "postgresql") {
      const result = await deletePgTableById(connectionId, tableName, schema);
      if (result.success) {
        toast.success(result.message ?? "collection deleted successdfully");
        onSuccess?.();
      } else {
        toast.error(result.message ?? "Failed to delete collection");
      }
    }
  };
  return (
    <Dialog>
      <DialogTrigger>
        <div className=" px-1 rounded-md text-xs text-white bg-red-600 hover:bg-red-500 cursor-pointer h-5 ">
          Drop
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-sm">Delete collection</DialogTitle>
          <DialogDescription>
            Type <span className="text-sm text-red-600">{tableName}</span> to
            confirm delete
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
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleDelete}
            className="bg-red-600 text-white"
            disabled={confirmed ? false : true}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteTriger;
