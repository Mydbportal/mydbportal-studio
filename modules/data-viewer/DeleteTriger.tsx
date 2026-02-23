import { deleteCollectionsEncrypted } from "@/app/actions/mongo";
import { deleteMysqlTableEncrypted } from "@/app/actions/mysql";
import { deletePgTableEncrypted } from "@/app/actions/postgres";
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
import { getConnectionById } from "@/lib/connection-storage";
import type { Connection } from "@/types/connection";

type EncryptedConnection = Connection & {
  encryptedCredentials: string;
};

const toEncryptedConnection = (
  connection: Connection | null,
): EncryptedConnection | null => {
  if (
    connection &&
    typeof connection.encryptedCredentials === "string" &&
    connection.encryptedCredentials.length > 0
  ) {
    return {
      ...connection,
      encryptedCredentials: connection.encryptedCredentials,
    };
  }
  return null;
};

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
  const [table, setTable] = useState<string>("");
  const [confirmed, setConfirmed] = useState<boolean>(false);

  useEffect(() => {
    setConfirmed(table === tableName);
  }, [table, tableName]);
  const handleDelete = async () => {
    const connection = await getConnectionById(connectionId);
    const encryptedConnection = toEncryptedConnection(connection);
    if (!encryptedConnection) {
      toast.error("Connection not found");
      return;
    }
    if (connectionType === "mongodb") {
      const result = await deleteCollectionsEncrypted(
        encryptedConnection,
        tableName,
      );
      if (result.success) {
        toast.success(result.message ?? "collection deleted successdfully");
        onSuccess?.();
      } else {
        toast.error(result.message ?? "Failed to delete collection");
      }
    } else if (connectionType === "mysql") {
      const result = await deleteMysqlTableEncrypted(
        encryptedConnection,
        tableName,
      );
      if (result.success) {
        toast.success(result.message ?? "collection deleted successdfully");
        onSuccess?.();
      } else {
        toast.error(result.message ?? "Failed to delete collection");
      }
    } else if (connectionType === "postgresql") {
      const result = await deletePgTableEncrypted(
        encryptedConnection,
        tableName,
        schema,
      );
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
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="h-6 px-2 text-xs cursor-pointer"
        >
          Drop
        </Button>
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
