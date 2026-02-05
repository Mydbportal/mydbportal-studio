import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import React from "react";
import { CreateTableDialog } from "./CreateTableDialog";
import { ConnectionSummary } from "@/types/connection";
import { CreateSchemaDialog } from "./createSchema";

function SchemaOptions({
  connection,
  connectionId,
  schema,
}: {
  connection: ConnectionSummary;
  connectionId: string;
  schema?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer bg-primary h-6 text-white rounded-md">
        <Plus />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="flex flex-col  py-4 px-1  w-60">
          {connection.type === "postgresql" && (
            <CreateSchemaDialog connectionId={connectionId} />
          )}

          <CreateTableDialog
            connectionId={connectionId}
            connectionType={connection.type}
            schema={schema}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SchemaOptions;
