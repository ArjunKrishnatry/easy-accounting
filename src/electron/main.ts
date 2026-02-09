import {app, BrowserWindow} from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import {isDev} from './util.js';
import http from 'http';

let backendProcess: ChildProcess | null = null;

function startBackend() {
    let backendExecutable: string;
    let cwd: string;

    if (isDev()) {
        // In development, use Python with uvicorn
        const backendPath = path.join(process.cwd(), 'backend');
        const pythonPath = path.join(backendPath, '.venv', 'bin', 'python');

        console.log('Starting backend in dev mode from:', backendPath);

        backendProcess = spawn(pythonPath, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], {
            cwd: backendPath,
            stdio: ['pipe', 'pipe', 'pipe']
        });
    } else {
        // In production, use the bundled executable
        const backendPath = path.join(process.resourcesPath, 'backend');
        backendExecutable = path.join(backendPath, 'backend_server');
        cwd = backendPath;

        console.log('Starting bundled backend from:', backendExecutable);

        backendProcess = spawn(backendExecutable, [], {
            cwd: cwd,
            stdio: ['pipe', 'pipe', 'pipe']
        });
    }

    backendProcess.stdout?.on('data', (data) => {
        console.log(`Backend: ${data}`);
    });

    backendProcess.stderr?.on('data', (data) => {
        console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('error', (err) => {
        console.error('Failed to start backend:', err);
    });

    backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
}

function stopBackend() {
    if (backendProcess) {
        backendProcess.kill();
        backendProcess = null;
    }
}

function waitForBackend(maxAttempts = 30, interval = 500): Promise<boolean> {
    return new Promise((resolve) => {
        let attempts = 0;

        const checkHealth = () => {
            attempts++;
            const req = http.get('http://127.0.0.1:8000/health', (res) => {
                if (res.statusCode === 200) {
                    console.log('Backend is ready!');
                    resolve(true);
                } else {
                    retry();
                }
            });

            req.on('error', () => {
                retry();
            });

            req.setTimeout(1000, () => {
                req.destroy();
                retry();
            });
        };

        const retry = () => {
            if (attempts < maxAttempts) {
                setTimeout(checkHealth, interval);
            } else {
                console.error('Backend failed to start after', maxAttempts, 'attempts');
                resolve(false);
            }
        };

        checkHealth();
    });
}

app.on("ready", async () => {
    // Start the backend
    startBackend();

    // Wait for backend to be ready before creating window
    const backendReady = await waitForBackend();

    if (!backendReady) {
        console.error('Failed to connect to backend server');
        // Still create window but user will see connection errors
    }

    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    if(isDev()){
        mainWindow.loadURL('http://localhost:5123/');
    }
    else{
        mainWindow.loadFile(path.join(app.getAppPath(), 'dist-react', 'index.html'));
    }
});

app.on('window-all-closed', () => {
    stopBackend();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopBackend();
});
