// Preload runs before the renderer loads. Kept minimal — we only expose a tiny
// read-only platform/titlebar descriptor so the React app can decide whether to
// render its own 40px title bar or let the OS draw one.
const { contextBridge } = require('electron');

const titleBarArg = process.argv.find((a) => a.startsWith('--verifai-titlebar='));
const titleBarMode = titleBarArg ? titleBarArg.split('=')[1] : 'native';

contextBridge.exposeInMainWorld('verifai', {
  platform: process.platform,
  titleBarMode,
  version: process.versions.electron,
});
