// DirectX / shader cache maintenance.
//
// The shader caches are not deleted: they are moved aside to a backup folder so
// the driver can rebuild them from scratch (which is what removes micro
// stutters) and the old ones can be restored if something went wrong.
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';
import { getAppDataPath } from '../../shared/utils/files.js';
import type { ShaderCacheCleanResult, ShaderCacheEntry, ShaderCacheReport } from '../../shared/types/pro.js';

interface CacheDefinition {
  id: string;
  name: string;
  vendor: ShaderCacheEntry['vendor'];
  path: string;
}

/** DirectX, NVIDIA, AMD and Intel shader caches. */
function cacheDefinitions(): CacheDefinition[] {
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const programData = process.env.PROGRAMDATA || 'C:\\ProgramData';

  return [
    { id: 'd3dscache', name: 'DirectX Shader Cache', vendor: 'DirectX', path: path.join(local, 'D3DSCache') },
    { id: 'nvidia-dxcache', name: 'NVIDIA DXCache', vendor: 'NVIDIA', path: path.join(local, 'NVIDIA', 'DXCache') },
    { id: 'nvidia-glcache', name: 'NVIDIA GLCache', vendor: 'NVIDIA', path: path.join(local, 'NVIDIA', 'GLCache') },
    { id: 'nvidia-nvcache', name: 'NVIDIA NV_Cache', vendor: 'NVIDIA', path: path.join(programData, 'NVIDIA Corporation', 'NV_Cache') },
    { id: 'amd-dxcache', name: 'AMD DxCache', vendor: 'AMD', path: path.join(local, 'AMD', 'DxCache') },
    { id: 'amd-dxccache', name: 'AMD DxcCache', vendor: 'AMD', path: path.join(local, 'AMD', 'DxcCache') },
    { id: 'amd-glcache', name: 'AMD GLCache', vendor: 'AMD', path: path.join(local, 'AMD', 'GLCache') },
    { id: 'intel-shadercache', name: 'Intel ShaderCache', vendor: 'Intel', path: path.join(local, 'Intel', 'ShaderCache') },
  ];
}

async function folderSize(folder: string): Promise<{ sizeMB: number; files: number }> {
  let size = 0;
  let files = 0;
  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        try {
          const stat = await fs.stat(full);
          size += stat.size;
          files++;
        } catch {
          /* ignore */
        }
      }
    }
  };
  await walk(folder);
  return { sizeMB: Math.round((size / 1024 / 1024) * 10) / 10, files };
}

export async function scanShaderCaches(): Promise<ShaderCacheReport> {
  const entries: ShaderCacheEntry[] = [];
  let totalSizeMB = 0;
  let totalFiles = 0;

  for (const definition of cacheDefinitions()) {
    const exists = await fs
      .access(definition.path)
      .then(() => true)
      .catch(() => false);
    let sizeMB = 0;
    let fileCount = 0;
    if (exists) {
      const measured = await folderSize(definition.path);
      sizeMB = measured.sizeMB;
      fileCount = measured.files;
    }
    totalSizeMB += sizeMB;
    totalFiles += fileCount;
    entries.push({ ...definition, exists, sizeMB, fileCount });
  }

  return { entries, totalSizeMB: Math.round(totalSizeMB * 10) / 10, totalFiles };
}

/**
 * Moves the shader caches aside so the driver rebuilds them.
 * The original content is kept in the backup folder and can be restored.
 */
export async function cleanShaderCaches(): Promise<ShaderCacheCleanResult> {
  const cleaned: ShaderCacheCleanResult['cleaned'] = [];
  const failed: ShaderCacheCleanResult['failed'] = [];
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupRoot = getAppDataPath('Backups', 'shader-cache', stamp);

  for (const definition of cacheDefinitions()) {
    const exists = await fs
      .access(definition.path)
      .then(() => true)
      .catch(() => false);
    if (!exists) continue;

    try {
      const measured = await folderSize(definition.path);
      const target = path.join(backupRoot, `${definition.id}`);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.rename(definition.path, target);
      // The driver recreates the folder on the next launch.
      await fs.mkdir(definition.path, { recursive: true }).catch(() => {});
      cleaned.push({
        id: definition.id,
        name: definition.name,
        path: definition.path,
        backupPath: target,
        freedMB: measured.sizeMB,
      });
      logger.info(`Shader cache moved aside: ${definition.path} (${measured.sizeMB} MB)`);
    } catch (err) {
      failed.push({ id: definition.id, name: definition.name, error: (err as Error).message });
    }
  }

  return {
    ok: failed.length === 0,
    cleaned,
    failed,
    backupRoot,
    totalFreedMB: Math.round(cleaned.reduce((sum, c) => sum + c.freedMB, 0) * 10) / 10,
  };
}

/** Restores a previous shader cache backup. */
export async function restoreShaderCaches(backupRoot: string): Promise<{ ok: boolean; restored: number; error?: string }> {
  try {
    const definitions = cacheDefinitions();
    const entries = await fs.readdir(backupRoot, { withFileTypes: true });
    let restored = 0;
    for (const entry of entries) {
      const definition = definitions.find(d => d.id === entry.name);
      if (!definition) continue;
      const source = path.join(backupRoot, entry.name);
      await fs.rm(definition.path, { recursive: true, force: true }).catch(() => {});
      await fs.rename(source, definition.path);
      restored++;
    }
    return { ok: true, restored };
  } catch (err) {
    return { ok: false, restored: 0, error: (err as Error).message };
  }
}

/**
 * Lists the game processes that keep the shader cache busy. Cleaning while a
 * game is running would rebuild the cache on the fly and make things worse.
 */
export async function listCacheUsers(): Promise<string[]> {
  try {
    const { stdout } = await execPowerShell(
      `Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match 'Fortnite|VALORANT|cs2|Game|Rocket|Overwatch|apex' } | Select-Object -ExpandProperty ProcessName | Sort-Object -Unique`,
      { timeout: 10000 }
    );
    return stdout
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
