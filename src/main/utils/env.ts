// Environment utilities
export const isDev = process.env.NODE_ENV === 'development' || !process.env.VITE_APP_VERSION;

export const isWindows = process.platform === 'win32';
export const isMac = process.platform === 'darwin';
export const isLinux = process.platform === 'linux';

export function getAppVersion(): string {
  return process.env.VITE_APP_VERSION || '1.0.0-alpha.1';
}

export function getElectronVersion(): string {
  return process.versions.electron;
}