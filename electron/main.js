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
    const versionFilePath = path.join(userDataPath, '.db_version');
    const currentVersion = app.getVersion(); // reads from package.json "version"

    const logStreamInit = fs.createWriteStream(path.join(userDataPath, 'server.log'), { flags: 'a' });

    // Check if DB needs to be created or updated
    const existingVersion = fs.existsSync(versionFilePath)
        ? fs.readFileSync(versionFilePath, 'utf-8').trim()
        : null;

    const needsDbInit = !fs.existsSync(dbPath);
    const needsDbUpdate = existingVersion !== currentVersion && fs.existsSync(dbPath);

    if (needsDbInit || needsDbUpdate) {
        logStreamInit.write(`[${new Date().toISOString()}] DB init/update needed. ` +
            `Current: ${currentVersion}, Previous: ${existingVersion || 'none'}, ` +
            `DB exists: ${!needsDbInit}\n`);

        try {
            const templateDbPath = isDev
                ? path.join(__dirname, '../prisma/template.db')
                : path.join(process.resourcesPath, 'database/template.db');

            if (fs.existsSync(templateDbPath)) {
                // Backup old DB before replacing (in case of version update)
                if (needsDbUpdate) {
                    const backupPath = path.join(userDataPath, `database_backup_${existingVersion}.sqlite`);
                    try {
                        fs.copyFileSync(dbPath, backupPath);
                        logStreamInit.write(`Old DB backed up to: ${backupPath}\n`);
                    } catch (e) {
                        logStreamInit.write(`Warning: Could not backup old DB: ${e.message}\n`);
                    }
                }

                fs.copyFileSync(templateDbPath, dbPath);
                fs.writeFileSync(versionFilePath, currentVersion, 'utf-8');
                logStreamInit.write(`Database initialized from template (v${currentVersion})\n`);
            } else {
                logStreamInit.write(`ERROR: Template database not found at ${templateDbPath}\n`);
            }
        } catch (error) {
            logStreamInit.write(`ERROR initializing database: ${error.message}\n`);
        }
    }
    const storageDir = path.join(userDataPath, 'uploads');
    const serverLogPath = path.join(userDataPath, 'server.log');

    // Create logs stream
    const logStream = fs.createWriteStream(serverLogPath, { flags: 'a' });
    logStream.write(`\n\n[${new Date().toISOString()}] Starting server...\n`);

    const serverPath = path.join(process.resourcesPath, 'standalone', 'server.js');

    if (fs.existsSync(serverPath)) {
        logStream.write(`Server found at: ${serverPath}\n`);

        // Prisma SQLite requires "file:" prefix (NOT "file:///")
        const databaseUrl = `file:${dbPath.replace(/\\/g, '/')}`;
        logStream.write(`DATABASE_URL: ${databaseUrl}\n`);

        serverProcess = fork(serverPath, [], {
            env: {
                ...process.env,
                PORT: PORT.toString(),
                DATABASE_URL: databaseUrl,
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
