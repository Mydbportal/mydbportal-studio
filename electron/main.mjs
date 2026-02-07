import { app, BrowserWindow, dialog } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const HOST = "127.0.0.1";
const PORT = 9221;
const APP_URL = `http://${HOST}:${PORT}/studio`;
const SERVER_WAIT_TIMEOUT_MS = 30_000;
const IS_DEV = process.env.ELECTRON_DEV === "1";

let mainWindow = null;
let nextServerProcess = null;
let isQuitting = false;

function waitForServer({
  host,
  port,
  timeoutMs,
  intervalMs = 250,
}) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ host, port });

      socket.once("connect", () => {
        socket.end();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - start >= timeoutMs) {
          reject(
            new Error(
              `Server did not start at ${host}:${port} within ${timeoutMs}ms`,
            ),
          );
          return;
        }
        setTimeout(tryConnect, intervalMs);
      });
    };

    tryConnect();
  });
}

function pipeServerLogs(child) {
  if (!child.stdout || !child.stderr) return;

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[next] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[next] ${chunk}`);
  });
}

function startBundledNextServer() {
  const appPath = app.getAppPath();
  const rootServerEntry = path.join(appPath, "server.js");
  const legacyServerEntry = path.join(appPath, ".next", "standalone", "server.js");
  const serverEntry = fs.existsSync(rootServerEntry)
    ? rootServerEntry
    : legacyServerEntry;

  if (!fs.existsSync(serverEntry)) {
    throw new Error(`Could not find bundled server entry at ${serverEntry}`);
  }

  const serverWorkingDir = path.dirname(serverEntry);

  nextServerProcess = spawn(process.execPath, [serverEntry], {
    cwd: serverWorkingDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOSTNAME: HOST,
      PORT: String(PORT),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  pipeServerLogs(nextServerProcess);

  nextServerProcess.once("exit", (code, signal) => {
    if (isQuitting) return;
    const reason =
      signal != null
        ? `signal ${signal}`
        : `exit code ${code == null ? "unknown" : code}`;
    dialog.showErrorBox(
      "Server Stopped",
      `The bundled web server stopped unexpectedly (${reason}).`,
    );
    app.quit();
  });
}

async function ensureServerReady() {
  if (!IS_DEV) {
    startBundledNextServer();
  }

  await waitForServer({
    host: HOST,
    port: PORT,
    timeoutMs: SERVER_WAIT_TIMEOUT_MS,
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(APP_URL);

  if (IS_DEV) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function stopBundledServer() {
  if (!nextServerProcess || nextServerProcess.killed) return;
  nextServerProcess.kill();
}

app.whenReady().then(async () => {
  try {
    await ensureServerReady();
    createWindow();
  } catch (error) {
    dialog.showErrorBox(
      "Startup Error",
      `Failed to start local server at ${HOST}:${PORT}.\n\n${error.message}`,
    );
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  stopBundledServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
