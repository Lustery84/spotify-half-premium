const { ipcRenderer } = require('electron');

try {
    window.ipcRenderer = ipcRenderer;
} catch (e) {
    const { contextBridge } = require('electron');
    contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);
}
