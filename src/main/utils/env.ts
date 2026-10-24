// Environment utilities
import { app } from 'electron';

/**
 * Whether the app is running from source (`electron .` + Vite dev server).
 *
 * This MUST NOT depend on an environment variable: the packaged app is started
 * by Windows with a clean environment, so a variable that only exists at build
 * time (`VITE_APP_VERSION`) reads as `undefined` at runtime and would wrongly
 * classify the shipped build as "dev". A wrong `isDev` makes the window try to
 * load `http://localhost:5173`, fail, and exit without ever showing anything.
 *
 * `app.isPackaged` is false from source and true in a shipped build. Outside
 * Electron (unit tests) `electron` resolves to the binary path and `app` is
 * undefined, which is also treated as "from source".
 */
export const isDev = app?.isPackaged !== true;

export const isWindows = process.platform === 'win32';
export const isMac = process.platform === 'darwin';
export const isLinux = process.platform === 'linux';

export function getAppVersion(): string {
  return process.env.VITE_APP_VERSION || '1.0.0-alpha.1';
}

export function getElectronVersion(): string {
  return process.versions.electron;
}
