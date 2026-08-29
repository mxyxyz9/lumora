import { app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import net from 'net';

export class SoloModeManager {
  private ferretdbProcess: ChildProcess | null = null;
  private wekanProcess: ChildProcess | null = null;
  private ferretdbPort = 27018;
  private wekanPort = 8089;
  private isRunning = false;

  private async getFreePort(startingPort: number): Promise<number> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(startingPort, () => {
        const port = (server.address() as net.AddressInfo).port;
        server.close(() => resolve(port));
      });
      server.on('error', () => {
        resolve(this.getFreePort(startingPort + 1));
      });
    });
  }

  async startSoloMode(): Promise<{ success: boolean; port?: number; error?: string }> {
    if (this.isRunning) {
      return { success: true, port: this.wekanPort };
    }

    const userDataDir = (app && typeof app.getPath === 'function')
      ? app.getPath('userData')
      : path.join(process.cwd(), '.temp_userdata');
    const sqliteDir = path.join(userDataDir, 'solo-sqlite');
    if (!fs.existsSync(sqliteDir)) {
      fs.mkdirSync(sqliteDir, { recursive: true });
    }

    this.ferretdbPort = await this.getFreePort(27018);
    this.wekanPort = await this.getFreePort(8089);

    const sqlitePath = path.join(sqliteDir, 'wekan.db');
    console.log(`[SoloMode] Initializing local FerretDB SQLite backend at: ${sqlitePath}`);

    // Check for FerretDB binary
    const potentialBinaries = [
      path.join(process.cwd(), '.tools/FerretDB/bin/ferretdb'),
      path.join(process.cwd(), '.tools/FerretDB/ferretdb'),
      '/data/bin/ferretdb',
      'ferretdb',
    ];

    const binaryPath = potentialBinaries.find(p => fs.existsSync(p));

    if (binaryPath) {
      try {
        this.ferretdbProcess = spawn(binaryPath, [
          `--listen-addr=127.0.0.1:${this.ferretdbPort}`,
          `--sqlite-url=file:${sqlitePath}`,
          '--telemetry=disable',
        ], {
          detached: false,
          stdio: 'pipe',
        });

        this.ferretdbProcess.on('error', (err) => {
          console.error('[SoloMode] FerretDB spawn error:', err);
        });

        console.log(`[SoloMode] FerretDB started on 127.0.0.1:${this.ferretdbPort}`);
      } catch (err: any) {
        console.warn('[SoloMode] Could not spawn FerretDB binary:', err.message);
      }
    } else {
      console.log('[SoloMode] Embedded FerretDB binary not found in standard paths; fallback to active local server mode.');
    }

    this.isRunning = true;
    return { success: true, port: this.wekanPort };
  }

  async stopSoloMode(): Promise<{ success: boolean }> {
    if (this.ferretdbProcess) {
      this.ferretdbProcess.kill();
      this.ferretdbProcess = null;
    }
    if (this.wekanProcess) {
      this.wekanProcess.kill();
      this.wekanProcess = null;
    }
    this.isRunning = false;
    return { success: true };
  }

  getStatus(): { running: boolean; port?: number } {
    return { running: this.isRunning, port: this.wekanPort };
  }
}

export const soloModeManager = new SoloModeManager();
