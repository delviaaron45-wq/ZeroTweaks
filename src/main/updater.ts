// Silent auto-updater.
//
// Flow:
//   1. On startup the remote `version.json` manifest is fetched in the
//      background and compared with the running version.
//   2. When a newer version exists the renderer shows a banner.
//   3. On "Update" the artifact is downloaded to %TEMP%, its SHA-256 is
//      verified and an update script is launched that waits for this process to
//      exit, replaces the installation and starts the app again.
//
// The user data (settings, Zero Danger backups, benchmarks) lives in
// %APPDATA%/ZeroTweaks, outside the installation folder, so it survives the
// replacement untouched.
import { app, BrowserWindow } from 'electron';
import { createHash } from 'crypto';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import os from 'os';
import { logger } from './utils/logger.js';
import { getAppVersion } from './utils/env.js';
import { getAppDataPath } from '../shared/utils/files.js';
import type { UpdateInfo, UpdateManifest, UpdateStatus } from '../shared/types/index.js';

const DOWNLOAD_TIMEOUT_MS = 15 * 60 * 1000;
const UPDATE_FOLDER = path.join(os.tmpdir(), 'ZeroTweaks', 'updates');

export type UpdateStatusListener = (status: UpdateStatus) => void;

/**
 * Compares two dotted versions ("1.2.3" > "1.2.10" is false).
 * Pre-release suffixes are ignored for the comparison.
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) =>
    v
      .trim()
      .replace(/^v/i, '')
      .split(/[-+]/)[0]
      .split('.')
      .map(part => parseInt(part, 10) || 0);

  const a = parse(latest);
  const b = parse(current);
  const length = Math.max(a.length, b.length);

  for (let i = 0; i < length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff > 0) return true;
    if (diff < 0) return false;
  }
  return false;
}

export class UpdateManager {
  private status: UpdateStatus = {
    phase: 'idle',
    percent: 0,
    downloadedBytes: 0,
    totalBytes: 0,
  };
  private listeners: UpdateStatusListener[] = [];
  private info: UpdateInfo | null = null;
  private checking = false;

  onStatus(listener: UpdateStatusListener): () => void {
    this.listeners.push(listener);
    listener(this.status);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(patch: Partial<UpdateStatus>): void {
    this.status = { ...this.status, ...patch };
    for (const listener of this.listeners) {
      try {
        listener(this.status);
      } catch (err) {
        logger.warn('update status listener failed', err);
      }
    }
  }

  getStatus(): UpdateStatus {
    return this.status;
  }

  getInfo(): UpdateInfo | null {
    return this.info;
  }

  /**
   * Fetches the manifest and compares it with the running version.
   * Never throws: a failed check leaves the app exactly as it was.
   */
  async checkForUpdate(manifestUrl: string | undefined): Promise<UpdateInfo> {
    const currentVersion = getAppVersion();
    const info: UpdateInfo = { currentVersion, latestVersion: currentVersion, available: false };

    if (!manifestUrl) {
      this.emit({ phase: 'idle', message: 'No update URL configured' });
      this.info = info;
      return info;
    }

    if (this.checking) return this.info ?? info;
    this.checking = true;
    this.emit({ phase: 'checking', percent: 0, downloadedBytes: 0, totalBytes: 0, error: undefined });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(manifestUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const manifest = (await response.json()) as UpdateManifest;
      if (!manifest?.version || !manifest?.url) {
        throw new Error('Manifest without version or url');
      }

      const available = isNewerVersion(manifest.version, currentVersion);
      this.info = {
        currentVersion,
        latestVersion: manifest.version,
        available,
        url: manifest.url,
        sha256: manifest.sha256,
        notes: manifest.notes,
        publishedAt: manifest.publishedAt,
        mandatory: manifest.mandatory,
      };

      this.emit({
        phase: available ? 'available' : 'up-to-date',
        percent: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        error: undefined,
        message: available ? `Version ${manifest.version} available` : 'Already up to date',
      });
      this.emit({ info: this.info });
      logger.info(
        available
          ? `Update available: ${currentVersion} -> ${manifest.version}`
          : `No update: running ${currentVersion}, latest ${manifest.version}`
      );
      return this.info;
    } catch (err) {
      const message = (err as Error).message;
      logger.warn(`Update check failed: ${message}`);
      this.emit({ phase: 'error', error: message, message: undefined });
      this.info = info;
      return info;
    } finally {
      this.checking = false;
    }
  }

  /**
   * Downloads the artifact, verifies it and installs it.
   * The app is closed by the update script once the replacement is done.
   */
  async downloadAndInstall(): Promise<{ ok: boolean; error?: string }> {
    const info = this.info;
    if (!info?.available || !info.url) {
      return { ok: false, error: 'No hay ninguna actualización pendiente' };
    }

    try {
      await fs.mkdir(UPDATE_FOLDER, { recursive: true });
      const fileName = path.basename(new URL(info.url).pathname) || `update-${info.latestVersion}`;
      const target = path.join(UPDATE_FOLDER, fileName);

      this.emit({ phase: 'downloading', percent: 0, downloadedBytes: 0, totalBytes: 0, error: undefined });

      const { bytesWritten, totalBytes } = await this.download(info.url, target, (downloaded, total) => {
        const percent = total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;
        this.emit({ phase: 'downloading', percent, downloadedBytes: downloaded, totalBytes: total });
      });

      this.emit({
        phase: 'verifying',
        percent: 100,
        downloadedBytes: bytesWritten,
        totalBytes,
      });

      if (info.sha256) {
        const hash = await this.sha256(target);
        if (hash.toLowerCase() !== info.sha256.toLowerCase()) {
          await fs.unlink(target).catch(() => {});
          const message = 'La descarga no coincide con el hash esperado';
          this.emit({ phase: 'error', error: message });
          return { ok: false, error: message };
        }
        logger.info('Update hash verified');
      }

      this.emit({ phase: 'ready', percent: 100, message: 'Listo para instalar' });
      await this.install(target, fileName);

      return { ok: true };
    } catch (err) {
      const message = (err as Error).message;
      logger.error(`Update failed: ${message}`);
      this.emit({ phase: 'error', error: message });
      return { ok: false, error: message };
    }
  }

  private async download(
    url: string,
    target: string,
    onProgress: (downloaded: number, total: number) => void
  ): Promise<{ bytesWritten: number; totalBytes: number }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeout);

    if (!response.ok || !response.body) {
      throw new Error(`Download failed with HTTP ${response.status}`);
    }

    const totalBytes = Number(response.headers.get('content-length') ?? 0);
    const file = createWriteStream(target);
    let downloaded = 0;

    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        downloaded += value.byteLength;
        if (!file.write(value)) {
          await new Promise<void>(resolve => file.once('drain', () => resolve()));
        }
        onProgress(downloaded, totalBytes);
      }
    }

    await new Promise<void>((resolve, reject) => {
      file.end(() => resolve());
      file.on('error', reject);
    });

    return { bytesWritten: downloaded, totalBytes: totalBytes || downloaded };
  }

  private async sha256(filePath: string): Promise<string> {
    const data = await fs.readFile(filePath);
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Launches the update script and closes the app.
   *
   * The script waits for this process to exit before touching the installation
   * folder (Windows locks the running executable), then replaces it and starts
   * the app again. The user data lives in %APPDATA%/ZeroTweaks and is never
   * touched.
   */
  private async install(payloadPath: string, fileName: string): Promise<void> {
    const installDir = path.dirname(app.getPath('exe'));
    const exePath = app.getPath('exe');
    const isArchive = /\.(zip|7z)$/i.test(payloadPath);
    const scriptPath = path.join(UPDATE_FOLDER, 'apply-update.ps1');
    const userDataDir = getAppDataPath();

    const script = `
$ErrorActionPreference = 'Stop'
$payload = '${payloadPath.replace(/'/g, "''")}'
$installDir = '${installDir.replace(/'/g, "''")}'
$exePath = '${exePath.replace(/'/g, "''")}'
$userDataDir = '${userDataDir.replace(/'/g, "''")}'
$pid = ${process.pid}

# Wait for the running application to release the files.
try {
  $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
  if ($proc) { $proc | Wait-Process -Timeout 60 -ErrorAction SilentlyContinue }
} catch {}

Start-Sleep -Seconds 2

# The user data (settings, Zero Danger backups) lives outside the installation
# folder. If it ever ends up inside, it is copied aside and restored.
$userDataInside = $userDataDir.StartsWith($installDir, [System.StringComparison]::OrdinalIgnoreCase)
$backupDir = Join-Path $env:TEMP ('ZeroTweaks\\data-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
if ($userDataInside -and (Test-Path $userDataDir)) {
  New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
  Copy-Item -Path $userDataDir -Destination $backupDir -Recurse -Force
}

if ('${isArchive}') {
  # Portable archive: extract the new build over the installation.
  $staging = Join-Path $env:TEMP ('ZeroTweaks\\stage-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
  if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
  New-Item -ItemType Directory -Path $staging -Force | Out-Null
  Expand-Archive -Path $payload -DestinationPath $staging -Force
  $root = Get-ChildItem $staging -Directory | Select-Object -First 1
  $source = if ($root) { $root.FullName } else { $staging }
  Get-ChildItem -Path $source -Force | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $installDir -Recurse -Force
  }
  Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
} else {
  # Installer: it replaces the files itself.
  Start-Process -FilePath $payload -ArgumentList '/S' -Wait -WindowStyle Hidden
}

if ($userDataInside -and (Test-Path $backupDir)) {
  Copy-Item -Path (Join-Path $backupDir (Split-Path $userDataDir -Leaf)) -Destination $installDir -Recurse -Force
}

Start-Process -FilePath $exePath
Remove-Item -LiteralPath $payload -Force -ErrorAction SilentlyContinue
`;

    try {
      await fs.writeFile(scriptPath, script, 'utf8');
      const child = spawn(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath],
        { detached: true, stdio: 'ignore', windowsHide: true }
      );
      child.unref();
      logger.info(`Update script launched (${fileName}) - closing the app`);
      this.emit({ phase: 'installing', message: 'Instalando y reiniciando...' });

      // Give the renderer a moment to show the "installing" state, then quit.
      setTimeout(() => {
        for (const win of BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) win.destroy();
        }
        app.quit();
      }, 1200);
    } catch (err) {
      const message = (err as Error).message;
      logger.error(`Could not launch the update script: ${message}`);
      this.emit({ phase: 'error', error: message });
    }
  }
}
