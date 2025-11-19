/**
 * Electron Preload Script
 * Exposes safe APIs to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electron', {
  /**
   * Get the backend API URL
   */
  getApiUrl: (): Promise<string> => {
    return ipcRenderer.invoke('get-api-url');
  },

  /**
   * Check if running in development mode
   */
  isDev: (): Promise<boolean> => {
    return ipcRenderer.invoke('is-dev');
  },

  /**
   * Get app version
   */
  getVersion: (): Promise<string> => {
    return ipcRenderer.invoke('get-version');
  },

  /**
   * Get user data directory path
   */
  getUserDataPath: (): Promise<string> => {
    return ipcRenderer.invoke('get-user-data-path');
  },
});

// Log preload completion
console.log('[Preload] Context bridge initialized');
