// Main window creation
import { BrowserWindow, screen, nativeTheme } from 'electron';
import { join } from 'path';
import { isDev } from '../utils/env';
import { logger } from '../utils/logger';

/**
 * Content Security Policy for the renderer. In dev mode the Vite HMR client
 * needs `unsafe-eval` / `unsafe-inline`, otherwise the policy is strict.
 */
function buildCsp(): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...(isDev ? ["'unsafe-inline'", "'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", ...(isDev ? ['ws://localhost:5173', 'http://localhost:5173'] : [])],
    'media-src': ["'self'", 'data:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

export async function createMainWindow(): Promise<BrowserWindow> {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const window = new BrowserWindow({
    width: Math.min(1400, width - 100),
    height: Math.min(900, height - 100),
    minWidth: 1000,
    minHeight: 700,
    x: Math.floor((width - 1400) / 2),
    y: Math.floor((height - 900) / 2),
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#08090d',
      symbolColor: '#3b82f6',
      height: 36,
    },
    backgroundColor: '#08090d',
    webPreferences: {
      preload: join(__dirname, '../../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      spellcheck: false,
    },
    icon: join(__dirname, '../../../resources/icons/icon.png'),
    trafficLightPosition: { x: 12, y: 12 },
  });

  // Electron only emits "Electron Security Warning (Insecure Content-Security-Policy)"
  // while `eval` is allowed in the renderer, i.e. when the document has no CSP or
  // one that keeps `unsafe-eval`. Serving an explicit policy (strict in the built
  // app, permissive for the Vite dev server) is what silences it.
  const csp = buildCsp();
  const isAppUrl = (url: string) =>
    isDev
      ? /^https?:\/\/localhost:5173/.test(url) || /^ws:\/\/localhost:5173/.test(url)
      : url.startsWith('file://');

  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    if (!isAppUrl(details.url)) {
      callback({});
      return;
    }
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  // Theme handling
  const updateTheme = () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    window.webContents.send('theme:changed', theme);
  };
  nativeTheme.on('updated', updateTheme);
  updateTheme();

  // Handlers MUST be attached before the first load: `ready-to-show` is
  // emitted on the first paint, which can happen while `loadFile` is still
  // pending. Subscribing after the load races with that event and, when it is
  // missed, the window stays invisible forever while the app keeps running.
  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      logger.warn(`[renderer] ${message} (${sourceId}:${line})`);
    } else if (process.env.ZT_SMOKE) {
      logger.info(`[renderer] ${message} (${sourceId}:${line})`);
    }
  });

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // Sub-frame failures are noise; only the main document matters here.
    if (isMainFrame && errorCode !== -3) {
      logger.error(`Renderer failed to load: ${errorCode} - ${errorDescription} (${validatedURL})`);
    }
  });

  window.webContents.on('render-process-gone', (_event, details) => {
    logger.error(`Renderer process gone: ${details.reason}`, details);
  });

  window.once('ready-to-show', () => {
    window.show();
    logger.info('Main window shown');
  });

  // Load URL
  if (isDev) {
    try {
      await window.loadURL('http://localhost:5173');
      window.webContents.openDevTools({ mode: 'detach' });
    } catch (err) {
      // No dev server running: fall back to the last build instead of dying.
      logger.warn('Vite dev server not reachable, loading the built renderer', err);
      await window.loadFile(join(__dirname, '../../renderer/index.html'));
    }
  } else {
    await window.loadFile(join(__dirname, '../../renderer/index.html'));
  }

  // Safety net: if the first paint already happened before the listener was
  // attached (fast asar loads), show the window anyway. `backgroundColor` is
  // set above, so this never flashes white.
  if (!window.isVisible()) {
    window.show();
    logger.info('Main window shown (after load fallback)');
  }

  // Handle window events
  window.on('closed', () => {
    logger.info('Main window closed');
  });

  window.on('minimize', () => {
    // Optionally hide to tray instead
  });

  return window;
}