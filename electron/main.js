const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;

const isDev = !app.isPackaged;
const PORT = 3000;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "TodoPDF Library",
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: isDev
            ? path.join(__dirname, '../public/logo/logo_with_letter.png')
            : path.join(process.resourcesPath, 'public/logo/logo_with_letter.png')
    });

    const startUrl = isDev
        ? (process.env.ELECTRON_START_URL || `http://localhost:${PORT}`)
        : `http://localhost:${PORT}`;

    const loadURLWithRetry = (url, retries = 0) => {
        mainWindow.loadURL(url).catch((err) => {
            if (retries < 30) { // Try for 30 seconds
                console.log(`Server not ready, retrying (${retries + 1})...`);
                setTimeout(() => loadURLWithRetry(url, retries + 1), 1000);
            } else {
                dialog.showErrorBox('Error', 'Failed to connect to the server. Check server.log in data directory.');
            }
        });
    };

    loadURLWithRetry(startUrl);

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

const startServer = () => {
    if (isDev) return;

    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'database.sqlite');
    const storageDir = path.join(userDataPath, 'uploads');
    const serverLogPath = path.join(userDataPath, 'server.log');

    // Create logs stream
    const logStream = fs.createWriteStream(serverLogPath, { flags: 'a' });
    logStream.write(`\n\n[${new Date().toISOString()}] Starting server...\n`);

    const serverPath = path.join(process.resourcesPath, 'standalone', 'server.js');

    if (fs.existsSync(serverPath)) {
        logStream.write(`Server found at: ${serverPath}\n`);

        serverProcess = fork(serverPath, [], {
            env: {
                ...process.env,
                PORT: PORT.toString(),
                DATABASE_URL: `file:${dbPath}`,
                STORAGE_DIR: storageDir,
                NODE_ENV: 'production'
            },
            silent: true // Separate stdout/stderr for logging
        });

        if (serverProcess.stdout) serverProcess.stdout.pipe(logStream);
        if (serverProcess.stderr) serverProcess.stderr.pipe(logStream);

        serverProcess.on('error', (err) => {
            logStream.write(`Server failed to start: ${err}\n`);
            console.error('Server failed:', err);
        });

        serverProcess.on('exit', (code, signal) => {
            logStream.write(`Server exited with code ${code} and signal ${signal}\n`);
        });

        console.log(`Server started on port ${PORT}`);
    } else {
        const msg = `Server file not found at: ${serverPath}`;
        logStream.write(msg + '\n');
        console.error(msg);
        dialog.showErrorBox('Error', msg);
    }
};

app.on('ready', () => {
    startServer();
    createWindow();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
