"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConnectionSummary } from "@/types/connection";
import { listConnections, removeConnection } from "@/app/actions/connection";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Database, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ConnectionList({
  currentConnectionId,
}: {
  currentConnectionId: string;
}) {
  const router = useRouter();
  const [connections, setConnections] = useState<ConnectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchConnections = async () => {
      if (!currentConnectionId) setLoading(true);
      try {
        const result = await listConnections();
        if (result.success && result.connections) {
          setConnections(result.connections);
        } else {
          throw new Error(result.message || "Failed to load connections.");
        }
      } catch {
        toast.error("Error loading connections");
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [currentConnectionId]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await removeConnection(id);
      if (!result.success) {
        throw new Error(result.message || "Failed to delete connection.");
      }
      const listResult = await listConnections();
      setConnections(listResult.connections ?? []);
      toast.success("Connection Deleted");

      if (currentConnectionId === id) {
        router.push(window.location.pathname);
      }
    } catch (error) {
      console.error("Error deleting connection:", error);
      toast.error("Error deleting connection");
    } finally {
      setDeletingId(null);
    }
  };

  const formatHost = (host?: string) => {
    if (!host) return "";
    return host.length <= 12
      ? host
      : `${host.substring(0, 6)}...${host.substring(host.length - 6)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">
          No connections saved yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-[240px] max-h-[350px] overflow-y-scroll ">
      {connections.map((conn) => {
        const isActive = currentConnectionId === conn.id;
        const isDeleting = deletingId === conn.id;

        return (
          <div key={conn.id} className="relative group w-[100%]">
            <Link
              href={`?connectionId=${conn.id}`}
              className={`
                block rounded-lg border transition-all duration-200 ease-in-out w-[100%]
                ${
                  isActive
                    ? "bg-primary/10 border-primary/20 shadow-sm ring-1 ring-primary/20"
                    : "bg-card border-border hover:bg-muted/30 hover:border-muted-foreground/20"
                }
                ${isDeleting ? "opacity-50 pointer-events-none" : ""}
              `}
              onClick={(e) => {
                if (isActive) e.preventDefault();
              }}
            >
              <div className="flex items-center justify-between p-4 ">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`
                      flex-shrink-0 p-2 rounded-md transition-colors
                      ${
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "bg-muted/60 text-muted-foreground group-hover:bg-muted"
                      }
                    `}
                  >
                    <Database className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-medium text-sm truncate ${
                        isActive ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {conn.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      <span className="font-medium">{conn.type}</span>
                      {conn.host && (
                        <>
                          <span className="mx-1">•</span>
                          <span>{formatHost(conn.host)}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0 ml-2 h-8 w-8" />
              </div>

              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
              )}
            </Link>

            <div className="absolute top-1/2 right-4 -translate-y-1/2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`
                      h-8 w-8 p-0 transition-all duration-200
                      hover:bg-destructive/10 hover:text-destructive
                      opacity-0 group-hover:opacity-100 focus:opacity-100
                      ${isActive && "opacity-100"}
                    `}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Connection</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the connection{" "}
                      <span className="font-semibold text-foreground">
                        &quot;{conn.name}&quot;
                      </span>
                      ? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(conn.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
    </div>
  );
}
