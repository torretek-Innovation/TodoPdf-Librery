const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Aquí puedes exponer funciones seguras al frontend
    version: process.versions.electron,
    // Ejemplo: sendNotification: (msg) => ipcRenderer.send('notify', msg)
});
