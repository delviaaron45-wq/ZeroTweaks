// Profile export / import and cloud sync.
//
// A bundle contains the settings, the custom profiles and the list of applied
// tweaks. The cloud sync is opt-in: nothing leaves the machine until the user
// configures an endpoint. The endpoint is a plain HTTP store (GET / PUT), so it
// works with a private file service, a Nextcloud/WebDAV bridge or a small
// function of your own.
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import { getAppDataPath, writeJson, readJson } from '../../shared/utils/files.js';
import { getAppVersion } from '../utils/env.js';
import type { ProfileBundle, SyncConfig, SyncResult } from '../../shared/types/pro.js';

const SYNC_CONFIG_FILE = 'sync-config.json';

const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: false,
  endpoint: '',
  token: '',
  autoSync: false,
  lastSyncAt: null,
  lastError: null,
};

export async function readSyncConfig(): Promise<SyncConfig> {
  const config = await readJson<SyncConfig>(getAppDataPath(SYNC_CONFIG_FILE));
  return { ...DEFAULT_SYNC_CONFIG, ...(config ?? {}) };
}

export async function writeSyncConfig(config: SyncConfig): Promise<SyncConfig> {
  const merged = { ...DEFAULT_SYNC_CONFIG, ...config };
  await writeJson(getAppDataPath(SYNC_CONFIG_FILE), merged);
  return merged;
}

/** Builds the bundle that is exported / synchronised. */
export async function buildBundle(): Promise<ProfileBundle> {
  const settings = (await readJson<Record<string, unknown>>(getAppDataPath('settings.json'))) ?? {};
  const profiles = (await readJson<ProfileBundle['profiles']>(getAppDataPath('profiles.json'))) ?? [];

  return {
    format: 'zerotweaks-bundle',
    version: 1,
    createdAt: new Date().toISOString(),
    appVersion: getAppVersion(),
    settings,
    profiles,
    selectedTweakIds: [],
    appliedTweakIds: [],
  };
}

/** Writes the bundle to a file on disk (used by the "export to file" button). */
export async function exportBundleToFile(targetPath: string): Promise<{ ok: boolean; path: string; error?: string }> {
  try {
    const bundle = await buildBundle();
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, JSON.stringify(bundle, null, 2), 'utf8');
    return { ok: true, path: targetPath };
  } catch (err) {
    return { ok: false, path: targetPath, error: (err as Error).message };
  }
}

/**
 * Reads a bundle and applies it: the settings are stored and the profiles are
 * merged with the existing ones (same id = overwritten).
 */
export async function importBundleFromFile(sourcePath: string): Promise<{
  ok: boolean;
  bundle?: ProfileBundle;
  profiles: number;
  error?: string;
}> {
  try {
    const content = await fs.readFile(sourcePath, 'utf8');
    const bundle = JSON.parse(content) as ProfileBundle;
    if (bundle?.format !== 'zerotweaks-bundle') {
      return { ok: false, profiles: 0, error: 'El fichero no es un paquete de ZeroTweaks' };
    }

    if (bundle.settings && Object.keys(bundle.settings).length > 0) {
      const current = (await readJson<Record<string, unknown>>(getAppDataPath('settings.json'))) ?? {};
      await writeJson(getAppDataPath('settings.json'), { ...current, ...bundle.settings });
    }

    let profiles = 0;
    if (Array.isArray(bundle.profiles) && bundle.profiles.length > 0) {
      const existing = (await readJson<ProfileBundle['profiles']>(getAppDataPath('profiles.json'))) ?? [];
      const merged = [...existing];
      for (const incoming of bundle.profiles) {
        const index = merged.findIndex(p => p.id === incoming.id);
        if (index >= 0) merged[index] = incoming;
        else merged.push(incoming);
      }
      await writeJson(getAppDataPath('profiles.json'), merged);
      profiles = merged.length;
    }

    return { ok: true, bundle, profiles };
  } catch (err) {
    return { ok: false, profiles: 0, error: (err as Error).message };
  }
}

/** Uploads the bundle to the configured endpoint (PUT). */
export async function uploadBundle(): Promise<SyncResult> {
  const config = await readSyncConfig();
  if (!config.enabled || !config.endpoint) {
    return { ok: false, direction: 'upload', bytes: 0, message: 'La sincronización no está activada', error: 'Sin endpoint configurado' };
  }

  try {
    const bundle = await buildBundle();
    const payload = JSON.stringify(bundle, null, 2);
    const response = await fetch(config.endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
      body: payload,
    });

    if (!response.ok) {
      const message = `El servidor respondió HTTP ${response.status}`;
      await writeSyncConfig({ ...config, lastError: message });
      return { ok: false, direction: 'upload', bytes: payload.length, message, error: message };
    }

    await writeSyncConfig({ ...config, lastSyncAt: new Date().toISOString(), lastError: null });
    logger.info(`Bundle uploaded (${payload.length} bytes) to ${config.endpoint}`);
    return { ok: true, direction: 'upload', bytes: payload.length, message: 'Perfiles sincronizados correctamente' };
  } catch (err) {
    const message = (err as Error).message;
    await writeSyncConfig({ ...config, lastError: message });
    return { ok: false, direction: 'upload', bytes: 0, message: 'No se pudo subir', error: message };
  }
}

/** Downloads the bundle from the configured endpoint (GET) and applies it. */
export async function downloadBundle(): Promise<SyncResult> {
  const config = await readSyncConfig();
  if (!config.enabled || !config.endpoint) {
    return { ok: false, direction: 'download', bytes: 0, message: 'La sincronización no está activada', error: 'Sin endpoint configurado' };
  }

  try {
    const response = await fetch(config.endpoint, {
      method: 'GET',
      headers: config.token ? { Authorization: `Bearer ${config.token}` } : {},
    });

    if (!response.ok) {
      const message = `El servidor respondió HTTP ${response.status}`;
      await writeSyncConfig({ ...config, lastError: message });
      return { ok: false, direction: 'download', bytes: 0, message, error: message };
    }

    const payload = await response.text();
    const bundle = JSON.parse(payload) as ProfileBundle;
    if (bundle?.format !== 'zerotweaks-bundle') {
      throw new Error('El servidor no devolvió un paquete válido');
    }

    // Store the downloaded bundle and apply it through the same code path.
    const tempFile = path.join(getAppDataPath('sync', 'downloaded-bundle.json'));
    await fs.mkdir(path.dirname(tempFile), { recursive: true });
    await fs.writeFile(tempFile, payload, 'utf8');
    const applied = await importBundleFromFile(tempFile);

    await writeSyncConfig({ ...config, lastSyncAt: new Date().toISOString(), lastError: null });
    logger.info(`Bundle downloaded (${payload.length} bytes) from ${config.endpoint}`);
    return {
      ok: applied.ok,
      direction: 'download',
      bytes: payload.length,
      message: applied.ok ? `Perfiles restaurados (${applied.profiles} perfiles)` : 'No se pudieron aplicar',
      error: applied.error,
    };
  } catch (err) {
    const message = (err as Error).message;
    await writeSyncConfig({ ...config, lastError: message });
    return { ok: false, direction: 'download', bytes: 0, message: 'No se pudo descargar', error: message };
  }
}
