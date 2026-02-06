"use client";

import { useEffect, useState } from "react";
import JsonView from "react18-json-view";

import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { jsonPayload } from "@/types/connection";
import { deleteRowById, insertRowById, updateRowById } from "@/app/actions/data";
import { buildFullPath } from "@/lib/helpers/helpers";
import { unsetDocFieldById } from "@/app/actions/mongo";

interface JsonViewerProps {
  data: any;
  connectionId: string;
  tableName: string;
  onRefresh?: () => void;
}

const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  connectionId,
  tableName,
  onRefresh,
}) => {
  const [mounted, SetMounted] = useState(false);

  const handleEdit = async (params: any) => {
    const { indexOrName, newValue, parentPath }: jsonPayload = params;
    const fullPath = await buildFullPath(indexOrName, parentPath);

    const targetDoc = data[parentPath[0]];

    const id = targetDoc ? targetDoc._id : undefined;

    try {
      if (!id) {
        const result = await insertRowById(connectionId, tableName, {
          [fullPath]: newValue,
        });
        if (result.success) {
          toast.success(result.message ?? "Document inserted");
          onRefresh?.();
        } else {
          toast.error(result.message ?? "Failed to insert document");
        }
      } else {
        const result = await updateRowById(connectionId, tableName, "_id", id, {
          [fullPath]: newValue,
        });
        if (result.success) {
          toast.success(result.message);
          onRefresh?.();
        } else {
          toast.error(result.message);
        }
      }
    } catch {
      toast.error("Failed to update document");
    }
  };

  const handleDelete = async (params: any) => {
    const { indexOrName, value, parentPath }: jsonPayload = params;
    const fullPath = await buildFullPath(indexOrName, parentPath);

    const targetDoc = data[parentPath[0]];

    const id = targetDoc ? targetDoc._id : undefined;

    try {
      if (parentPath.length > 1) {
        const result = await unsetDocFieldById(
          connectionId,
          tableName,
          id,
          fullPath,
        );
        if (result.success) {
          toast.success(result.message ?? "Field removed");
          onRefresh?.();
        } else {
          toast.error(result.message ?? "Failed to remove field");
        }
      } else {
        const docId = value?._id;

        if (!docId) {
          throw new Error("no _id present");
        }
        const result = await deleteRowById(connectionId, tableName, "_id", docId);
        if (result.success) {
          toast.success(result.message ?? "Doc deleted successfully");
          onRefresh?.();
        } else {
          toast.error(result.message ?? "Failed to delete doc");
        }
      }
    } catch {
      toast.error("Failed to delete  document");
    }
  };
  useEffect(() => {
    SetMounted(true);
  }, []);

  return (
    <div className="h-full w-full bg-white dark:bg-gray-900 text-black dark:text-white">
      {mounted && (
        <JsonView
          src={data as object}
          editable
          onAdd={handleEdit}
          onEdit={handleEdit}
          onDelete={handleDelete}
          theme="winter-is-coming"
          enableClipboard
        />
      )}
      <Toaster />
    </div>
  );
};

export default JsonViewer;
