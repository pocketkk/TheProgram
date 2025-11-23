/**
 * Python Backend Subprocess Manager
 * Handles spawning, monitoring, and terminating the FastAPI backend
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';
import treeKill from 'tree-kill';

export class PythonBackendManager {
  private process: ChildProcess | null = null;
  private readonly isDev: boolean;
  private readonly port: number;
  private startupTimeout: NodeJS.Timeout | null = null;

  constructor(port: number = 8000) {
    // Match main.ts logic: dev mode only if NOT production AND NOT packaged
    // This allows testing production mode with NODE_ENV=production
    this.isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
    this.port = port;
  }

  /**
   * Start the Python backend subprocess
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[Python] Starting backend (${this.isDev ? 'dev' : 'prod'} mode)...`);

      // Determine Python executable and working directory
      const backendDir = this.isDev
        ? path.join(__dirname, '..', '..', 'backend')
        : path.join(process.resourcesPath, 'backend');

      const pythonPath = this.isDev
        ? path.join(backendDir, 'test_venv', 'bin', 'python3')  // Use venv Python in dev mode
        : path.join(process.resourcesPath, 'backend', 'backend'); // Bundled executable in prod

      const workingDir = backendDir;

      const args = this.isDev
        ? ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', String(this.port)]
        : []; // Bundled executable doesn't need args

      // Generate a random secret key if not present
      const secretKey = process.env.SECRET_KEY || require('crypto').randomBytes(32).toString('hex');

      // Set up environment variables
      const env = {
        ...process.env,
        PYTHONUNBUFFERED: '1',  // Disable Python output buffering
        USER_DATA_DIR: app.getPath('userData'),  // SQLite database location
        PORT: String(this.port),
        APP_ENV: this.isDev ? 'development' : 'production',
        LOG_LEVEL: this.isDev ? 'debug' : 'info',
        SECRET_KEY: secretKey, // Required by backend
        // Explicitly set SQLite path to user data directory to avoid read-only errors in AppImage
        SQLITE_DB_PATH: path.join(app.getPath('userData'), 'data', 'theprogram.db'),
      };

      console.log(`[Python] Executable: ${pythonPath}`);
      console.log(`[Python] Working dir: ${workingDir}`);
      console.log(`[Python] Args: ${args.join(' ')}`);

      // Spawn Python process
      this.process = spawn(pythonPath, args, {
        cwd: workingDir,
        env,
        stdio: ['ignore', 'pipe', 'pipe'], // stdin ignored, stdout/stderr piped
      });

      // Handle stdout
      this.process.stdout?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        console.log(`[Python] ${output}`);

        // Detect successful startup
        if (output.includes('Uvicorn running') || output.includes('Application startup complete')) {
          console.log('[Python] Backend started successfully');
          this.clearStartupTimeout();
          resolve();
        }
      });

      // Handle stderr
      this.process.stderr?.on('data', (data: Buffer) => {
        const error = data.toString().trim();
        console.error(`[Python Error] ${error}`);
      });

      // Handle process exit
      this.process.on('exit', (code, signal) => {
        console.log(`[Python] Process exited with code ${code}, signal ${signal}`);
        this.process = null;
        this.clearStartupTimeout();
      });

      // Handle spawn errors
      this.process.on('error', (err) => {
        console.error('[Python] Failed to start:', err);
        this.clearStartupTimeout();
        reject(err);
      });

      // Startup timeout fallback (5 seconds)
      this.startupTimeout = setTimeout(() => {
        console.log('[Python] Startup timeout - assuming backend is ready');
        resolve();
      }, 5000);
    });
  }

  /**
   * Stop the Python backend subprocess gracefully
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.process || !this.process.pid) {
        console.log('[Python] No process to stop');
        resolve();
        return;
      }

      const pid = this.process.pid;
      console.log(`[Python] Stopping backend (PID ${pid})...`);

      // Use tree-kill to terminate process and all children
      treeKill(pid, 'SIGTERM', (err) => {
        if (err) {
          console.error('[Python] Error during shutdown:', err);
          // Force kill if graceful shutdown fails
          treeKill(pid, 'SIGKILL', () => {
            console.log('[Python] Force killed');
            this.process = null;
            resolve();
          });
        } else {
          console.log('[Python] Stopped successfully');
          this.process = null;
          resolve();
        }
      });

      // Timeout fallback (3 seconds)
      setTimeout(() => {
        if (this.process) {
          console.warn('[Python] Shutdown timeout - forcing kill');
          this.process.kill('SIGKILL');
          this.process = null;
        }
        resolve();
      }, 3000);
    });
  }

  /**
   * Check if the backend is running
   */
  isRunning(): boolean {
    return this.process !== null && this.process.pid !== undefined;
  }

  /**
   * Get the backend URL
   */
  getUrl(): string {
    return `http://localhost:${this.port}`;
  }

  /**
   * Clear the startup timeout
   */
  private clearStartupTimeout(): void {
    if (this.startupTimeout) {
      clearTimeout(this.startupTimeout);
      this.startupTimeout = null;
    }
  }
}
