// Preload runs before the renderer loads. Kept minimal — we only expose a tiny
// read-only platform/titlebar descriptor so the React app can decide whether to
// render its own 40px title bar or let the OS draw one.
const { contextBridge, ipcRenderer } = require('electron');

const titleBarArg = process.argv.find((a) => a.startsWith('--verifai-titlebar='));
const titleBarMode = titleBarArg ? titleBarArg.split('=')[1] : 'native';

contextBridge.exposeInMainWorld('verifai', {
  platform: process.platform,
  titleBarMode,
  version: process.versions.electron,
  // User-test logging bridge (local, no-server). The renderer's src/logger.js
  // opens a per-participant file (logStart), appends JSONL lines (logAppend),
  // and opens the logs folder for the facilitator (openLogs).
  logStart: (info) => ipcRenderer.invoke('verifai:logStart', info),
  logAppend: (text) => ipcRenderer.invoke('verifai:log', text),
  openLogs: () => ipcRenderer.invoke('verifai:openLogs'),
  recStart: (info) => ipcRenderer.invoke('verifai:recStart', info),
  recChunk: (bytes) => ipcRenderer.invoke('verifai:recChunk', bytes),
  recStop: () => ipcRenderer.invoke('verifai:recStop'),
});
