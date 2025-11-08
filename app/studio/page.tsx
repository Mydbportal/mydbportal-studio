"use client";
import { DatabaseZap, Moon, PanelLeft, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExplorerSidebar } from "@/modules/data-viewer/ExplorerSidebar";
import { TableViewer } from "@/modules/data-viewer/TableViewer";
import { addConnection } from "@/lib/connection-storage";
import { Connection } from "@/types/connection";
import Image from "next/image";
import Link from "next/link";

export default function StudioLayout() {
  return (
    <Suspense>
      <StudioPage />
    </Suspense>
  );
}
function StudioPage() {
  const { setTheme, theme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      try {
        const decodedString = atob(token);
        const connectionData: Omit<Connection, "id"> =
          JSON.parse(decodedString);

        addConnection(connectionData)
          .then((connections) => {
            toast.success("Connection Added", {
              description: "New connection successfully added from token.",
            });
            router.push(
              "?connectionId=" +
                connections.find(
                  (conn) =>
                    connectionData.database === conn.database &&
                    connectionData.host === conn.host,
                )?.id,
            );
          })
          .catch((error) => {
            toast.error("Failed to Add Connection", {
              description: `Error: ${error.message}`,
            });
          });
      } catch {
        toast.error("Invalid Token", {
          description: "The provided connection token is invalid.",
        });
      }
    }
  }, [router, searchParams]);
  return (
    <TooltipProvider>
      <div className="flex min-h-screen w-full flex-col bg-muted/40 dark:bg-muted/20">
        {/* --- Desktop Sidebar --- */}
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-[260px] flex-col border-r bg-background sm:flex">
          <div className="flex h-[60px] items-center border-b px-6 bg-gray-800">
            <Link className="flex items-center gap-2 font-semibold" href="#">
              <Image
                src="./logo.png"
                alt="portal studio"
                width={20}
                height={20}
              />
              <span className="text-xl font-bold tracking-tighter  text-yellow-200  bg-clip-text ">
                Mydbportal Studio{" "}
                <span className="text-xs text-white/70">v.0.0.1</span>
              </span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <Suspense>
              <ExplorerSidebar />
            </Suspense>
          </div>
        </aside>

        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-[260px]">
          {/* --- Header --- */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="sm:hidden">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="sm:max-w-xs">
                <nav className="grid gap-6 text-lg font-medium">
                  <a
                    className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                    href="#"
                  >
                    <DatabaseZap className="h-5 w-5 transition-all group-hover:scale-110" />
                    <span className="sr-only">MasterDB</span>
                  </a>
                  <ExplorerSidebar />
                </nav>
              </SheetContent>
            </Sheet>

            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <a href="#">Studio</a>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>My Local Connection</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="relative ml-auto flex-1 md:grow-0"></div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle Theme</p>
              </TooltipContent>
            </Tooltip>
          </header>

          <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 min-h-[calc(100vh-100px)]">
            <Suspense>
              <TableViewer />
            </Suspense>
          </main>

          {/* --- Footer --- */}
          <footer className="text-center p-4 text-sm text-muted-foreground">
            © {new Date().getFullYear()} MasterDB{" "}
            <span className="text-muted text-[10px]">beta</span>. All rights
            reserved.
          </footer>
        </div>
      </div>
    </TooltipProvider>
  );
}
