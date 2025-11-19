"use strict";
/**
 * Electron Preload Script
 * Exposes safe APIs to the renderer process
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods to renderer process
electron_1.contextBridge.exposeInMainWorld('electron', {
    /**
     * Get the backend API URL
     */
    getApiUrl: () => {
        return electron_1.ipcRenderer.invoke('get-api-url');
    },
    /**
     * Check if running in development mode
     */
    isDev: () => {
        return electron_1.ipcRenderer.invoke('is-dev');
    },
    /**
     * Get app version
     */
    getVersion: () => {
        return electron_1.ipcRenderer.invoke('get-version');
    },
    /**
     * Get user data directory path
     */
    getUserDataPath: () => {
        return electron_1.ipcRenderer.invoke('get-user-data-path');
    },
});
// Log preload completion
console.log('[Preload] Context bridge initialized');
//# sourceMappingURL=preload.js.map