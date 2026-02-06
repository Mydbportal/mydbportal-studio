"use client";
import { createSchemaById } from "@/app/actions/postgres";
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
import { useState } from "react";
import { toast } from "sonner";

export function CreateSchemaDialog({
  connectionId,
  onSuccess,
}: {
  connectionId: string;
  onSuccess?: () => void;
}) {
  const [schema, setSchema] = useState<string>("");
  const handleSubmit = async () => {
    const results = await createSchemaById(connectionId, schema);
    if (results.success) {
      toast.success(results.message ?? "schema created successfully");
      onSuccess?.();
    } else {
      toast.error(results.message ?? "failed to create schema");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer hover:bg-primary/10 p-2 rounded-md">
          Add schema
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Schema</DialogTitle>
          <DialogDescription>Enter schema name.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className=" items-center gap-4">
            <Input
              id="tableName"
              value={schema}
              className="col-span-3"
              onChange={(e) => setSchema(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>
            Create Schema
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
