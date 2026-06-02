const { app, BrowserWindow, shell, ipcMain, session, desktopCapturer } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev = !app.isPackaged;
const VITE_DEV_URL = process.env.VITE_DEV_URL || 'http://localhost:5173';

// Title-bar mode:
//   "native" (default) — OS-drawn title bar on both macOS and Windows. Safe
//                        cross-platform baseline until we revisit on Windows.
//   "inset"            — macOS hiddenInset chrome, traffic lights sit INSIDE
//                        the sidebar header (Claude Desktop / Linear style).
// Set via env: `TITLEBAR=inset npm run electron:dev` or use the script variant.
const TITLEBAR_MODE = process.env.TITLEBAR === 'inset' ? 'inset' : 'native';
const USE_INSET_TITLEBAR = TITLEBAR_MODE === 'inset' && process.platform === 'darwin';

// Workaround for an Electron 33 GPU-process crash on some Apple Silicon macOS
// configurations (AGXMetalG15X / M1–M3). Force ANGLE to the plain GL backend
// instead of the default Metal backend. Safe on Windows (ignored) and Linux.
if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('use-angle', 'gl');
}

// Minimum visible time for the splash screen. Guarantees the brand moment even
// when the main window loads faster than a human can register the reveal.
const SPLASH_MIN_MS = 1000;

/* ---------------- VerifAI user-test logging (local, no-server) ----------------
   The renderer (src/logger.js) sends JSONL lines over IPC; we append them to a
   per-participant file under userData/verifai-logs and fsync each write so data
   survives a renderer crash. Paths are scoped to LOG_DIR — we never accept an
   arbitrary path from the renderer. */
let _logFh = null;
let _logPath = null;
function logDir() {
  const d = path.join(app.getPath('userData'), 'verifai-logs');
  fs.mkdirSync(d, { recursive: true });
  return d;
}
function sanitizeId(s) {
  return String(s == null || s === '' ? 'anon' : s).replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '_').slice(0, 64);
}
ipcMain.handle('verifai:logStart', (_e, info = {}) => {
  try {
    if (_logFh != null) { try { fs.closeSync(_logFh); } catch (_) {} _logFh = null; }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    _logPath = path.join(logDir(), `${sanitizeId(info.participant_id)}_${stamp}.jsonl`);
    _logFh = fs.openSync(_logPath, 'a');
    return _logPath;
  } catch (e) { console.error('[verifai] logStart failed', e); return null; }
});
ipcMain.handle('verifai:log', (_e, text) => {
  try {
    if (_logFh == null) {
      _logPath = path.join(logDir(), `session-${Date.now()}.jsonl`);
      _logFh = fs.openSync(_logPath, 'a');
    }
    fs.writeSync(_logFh, text);
    fs.fsyncSync(_logFh);
    return true;
  } catch (e) { console.error('[verifai] log write failed', e); return false; }
});
ipcMain.handle('verifai:openLogs', () => {
  try { return shell.openPath(logDir()); } catch (e) { return ''; }
});
// Streamed screen recording → disk. Each ~1s chunk is appended to a single .webm
// fd, so renderer memory stays flat over long sessions and a crash loses ≤1s of video.
let _recFh = null;
let _recPath = null;
ipcMain.handle('verifai:recStart', (_e, info = {}) => {
  try {
    if (_recFh != null) { try { fs.closeSync(_recFh); } catch (_) {} _recFh = null; }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    _recPath = path.join(logDir(), `${sanitizeId(info.participant_id)}_${stamp}.webm`);
    _recFh = fs.openSync(_recPath, 'a');
    return path.basename(_recPath);
  } catch (e) { console.error('[verifai] recStart failed', e); _recFh = null; return null; }
});
ipcMain.handle('verifai:recChunk', (_e, bytes) => {
  try { if (_recFh != null && bytes) { fs.writeSync(_recFh, Buffer.from(bytes)); fs.fsyncSync(_recFh); } return true; }
  catch (e) { console.error('[verifai] recChunk failed', e); return false; }
});
ipcMain.handle('verifai:recStop', () => {
  try { if (_recFh != null) { fs.fsyncSync(_recFh); fs.closeSync(_recFh); } const b = _recPath ? path.basename(_recPath) : null; _recFh = null; _recPath = null; return b; }
  catch (e) { console.error('[verifai] recStop failed', e); _recFh = null; _recPath = null; return null; }
});
app.on('before-quit', () => {
  if (_logFh != null) { try { fs.fsyncSync(_logFh); fs.closeSync(_logFh); } catch (_) {} _logFh = null; }
  _logPath = null;
  if (_recFh != null) { try { fs.fsyncSync(_recFh); fs.closeSync(_recFh); } catch (_) {} _recFh = null; }
  _recPath = null;
});

function createSplash() {
  const splash = new BrowserWindow({
    width: 360,
    height: 360,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    show: false,
    hasShadow: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));
  splash.once('ready-to-show', () => splash.show());
  return splash;
}

function createWindow(splash) {
  const splashOpenedAt = Date.now();

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0a0a0f',
    titleBarStyle: USE_INSET_TITLEBAR ? 'hiddenInset' : 'default',
    // With hiddenInset the app UI draws around the lights. Put them at (16, 18)
    // so they vertically-center inside the sidebar's 56px-tall header.
    trafficLightPosition: USE_INSET_TITLEBAR ? { x: 16, y: 18 } : undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--verifai-titlebar=${TITLEBAR_MODE}`],
    },
  });

  win.once('ready-to-show', () => {
    const elapsed = Date.now() - splashOpenedAt;
    const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
    setTimeout(() => {
      if (splash && !splash.isDestroyed()) splash.close();
      win.show();
    }, wait);
  });

  // Open external links in the system browser, keep in-app links in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (isDev) {
    win.loadURL(VITE_DEV_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  // Auto-grant the primary screen to getDisplayMedia (no source picker) so the
  // renderer can screen-record the session. macOS still requires the one-time
  // Screen Recording permission for this app (System Settings › Privacy).
  try {
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      desktopCapturer.getSources({ types: ['screen'] })
        .then((sources) => callback(sources[0] ? { video: sources[0] } : {}))
        .catch(() => callback({}));
    });
  } catch (e) { console.error('[verifai] display-media handler setup failed', e); }

  const splash = createSplash();
  createWindow(splash);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const s = createSplash();
      createWindow(s);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
