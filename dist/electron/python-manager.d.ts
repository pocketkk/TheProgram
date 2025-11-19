/**
 * Python Backend Subprocess Manager
 * Handles spawning, monitoring, and terminating the FastAPI backend
 */
export declare class PythonBackendManager {
    private process;
    private readonly isDev;
    private readonly port;
    private startupTimeout;
    constructor(port?: number);
    /**
     * Start the Python backend subprocess
     */
    start(): Promise<void>;
    /**
     * Stop the Python backend subprocess gracefully
     */
    stop(): Promise<void>;
    /**
     * Check if the backend is running
     */
    isRunning(): boolean;
    /**
     * Get the backend URL
     */
    getUrl(): string;
    /**
     * Clear the startup timeout
     */
    private clearStartupTimeout;
}
//# sourceMappingURL=python-manager.d.ts.map