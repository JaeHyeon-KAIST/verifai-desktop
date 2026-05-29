const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

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
