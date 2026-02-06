"use client";

import Dexie, { type Table } from "dexie";
import type { Connection } from "@/types/connection";

export class MyDbStudioDexie extends Dexie {
  connections!: Table<Connection, string>;

  constructor() {
    super("mydbportal-studio");
    this.version(1).stores({
      connections:
        "id, name, type, host, protocol, search, port, user, database, filepath",
    });
  }
}

export const dexieDb = new MyDbStudioDexie();
