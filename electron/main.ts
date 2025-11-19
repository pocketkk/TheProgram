/**
 * Electron Main Process
 * The Program - Desktop Application
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { PythonBackendManager } from './python-manager';

// Global references
let mainWindow: BrowserWindow | null = null;
const pythonBackend = new PythonBackendManager(8000);

// In true production (packaged), app.isPackaged will be true
// For testing built frontend, set NODE_ENV=production
const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

/**
 * Create the main application window
 */
function createWindow(): void {
  console.log('[Electron] Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,  // Security: disable Node.js in renderer
      contextIsolation: true,   // Security: isolate renderer context
      sandbox: true,            // Security: enable sandbox
    },
    title: 'The Program - Astrology Desktop',
    backgroundColor: '#1a1a1a',
    show: false,  // Don't show until ready
  });

  // Show window when ready to avoid visual flash
  mainWindow.once('ready-to-show', () => {
    console.log('[Electron] Window ready to show');
    mainWindow?.show();
  });

  // Load the React frontend
  if (isDev) {
    // Development: load from Vite dev server
    const frontendUrl = 'http://localhost:3001';
    console.log(`[Electron] Loading frontend from dev server: ${frontendUrl}`);
    mainWindow.loadURL(frontendUrl);

    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    // Path from dist/electron/ to frontend/dist/
    const indexPath = path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html');
    console.log(`[Electron] Loading frontend from: ${indexPath}`);
    mainWindow.loadFile(indexPath);
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    console.log('[Electron] Window closed');
    mainWindow = null;
  });
}

/**
 * Initialize the application
 */
async function initializeApp(): Promise<void> {
  console.log('[Electron] Initializing application...');
  console.log(`[Electron] Mode: ${isDev ? 'development' : 'production'}`);
  console.log(`[Electron] User data: ${app.getPath('userData')}`);

  try {
    // Start Python backend first
    await pythonBackend.start();
    console.log(`[Electron] Backend running at: ${pythonBackend.getUrl()}`);

    // Create the main window
    createWindow();

    console.log('[Electron] Application initialized successfully');
  } catch (err) {
    console.error('[Electron] Failed to initialize:', err);
    app.quit();
  }
}

/**
 * Shutdown the application gracefully
 */
async function shutdownApp(): Promise<void> {
  console.log('[Electron] Shutting down...');

  try {
    // Stop Python backend
    await pythonBackend.stop();
    console.log('[Electron] Backend stopped');
  } catch (err) {
    console.error('[Electron] Error during shutdown:', err);
  }

  // Close all windows
  BrowserWindow.getAllWindows().forEach((win) => win.close());
}

// =============================================================================
// App Lifecycle Events
// =============================================================================

// App ready - first launch
app.on('ready', async () => {
  console.log('[Electron] App ready event');
  await initializeApp();
});

// All windows closed
app.on('window-all-closed', async () => {
  console.log('[Electron] All windows closed');
  // On macOS, apps stay active until explicitly quit
  if (process.platform !== 'darwin') {
    await shutdownApp();
    app.quit();
  }
});

// App activated (macOS)
app.on('activate', () => {
  console.log('[Electron] App activated');
  // Recreate window if none exist (macOS behavior)
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Before quit - cleanup
app.on('before-quit', async (event) => {
  console.log('[Electron] Before quit event');

  // Prevent quit until cleanup is done
  if (pythonBackend.isRunning()) {
    event.preventDefault();
    await shutdownApp();
    app.quit();
  }
});

// Will quit - final cleanup
app.on('will-quit', () => {
  console.log('[Electron] Will quit event');
});

// =============================================================================
// IPC Handlers - Communication with Renderer Process
// =============================================================================

ipcMain.handle('get-api-url', () => {
  return pythonBackend.getUrl() + '/api';
});

ipcMain.handle('is-dev', () => {
  return isDev;
});

ipcMain.handle('get-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

// =============================================================================
// Error Handling
// =============================================================================

process.on('uncaughtException', (error) => {
  console.error('[Electron] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Electron] Unhandled rejection at:', promise, 'reason:', reason);
});

console.log('[Electron] Main process loaded');
