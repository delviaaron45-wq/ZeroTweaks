// In-game settings optimizer.
//
// Reads and writes the per-game configuration files (Unreal Engine
// GameUserSettings.ini for Fortnite/Valorant, video.txt for CS2), always
// backing up the original file before touching it so the change can be
// reverted from the app or from a Zero Danger restore point.
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execPowerShell } from '../../shared/utils/process.js';
import { getAppDataPath, ensureDir } from '../../shared/utils/files.js';
import type { InGameGameConfig, InGameProfile } from '../../shared/types/index.js';
import { logger } from '../utils/logger.js';

export interface IniSection {
  name: string;
  entries: { key: string; value: string; raw: string }[];
}

export interface IniDocument {
  preamble: string[];
  sections: IniSection[];
}

export interface GameProfileDefinition {
  id: InGameProfile;
  name: string;
  description: string;
  /** Values keyed by ini section, then by key. */
  values: Record<string, Record<string, string>>;
  /** Extra notes shown in the UI (honest about what the profile does). */
  notes: string;
}

/**
 * Profiles are expressed per game because every engine uses different keys.
 * Values are conservative on purpose: they never touch resolution, FOV or
 * anything that changes how the game *plays* - only performance settings.
 */
export const GAME_PROFILES: GameProfileDefinition[] = [
  {
    id: 'max_performance',
    name: 'Máximo rendimiento',
    description: 'Desactiva V-Sync, quita límites de FPS y baja la calidad gráfica al mínimo.',
    notes: 'Gana FPS, pierdes calidad visual. Haz una copia de seguridad antes.',
    values: {
      'any': {
        bUseVSync: 'False',
        bUseDynamicResolution: 'False',
        PreferredRefreshRate: '240.000000',
        FrameRateLimit: '240.000000',
        't.MaxFPS': '240.000000',
        'r.ScreenPercentage': '100.000000',
        'r.ShadowQuality': '0',
        'r.TextureQuality': '0',
        'r.ViewDistanceQuality': '0',
        'r.EffectsQuality': '0',
        'r.AntiAliasingMethod': '0',
        'r.PostProcessAAQuality': '0',
        'r.ReflectionQuality': '0',
        'r.FoliageQuality': '0',
        'r.ShadingRate': '0',
        'r.MotionBlurQuality': '0',
        'r.DepthOfFieldQuality': '0',
      },
    },
  },
  {
    id: 'balanced',
    name: 'Equilibrado',
    description: 'V-Sync desactivado, límite según la tasa del monitor y calidad gráfica media.',
    notes: 'El punto de partida recomendado para la mayoría de equipos.',
    values: {
      'any': {
        bUseVSync: 'False',
        bUseDynamicResolution: 'False',
        PreferredRefreshRate: '165.000000',
        FrameRateLimit: '165.000000',
        't.MaxFPS': '165.000000',
        'r.ScreenPercentage': '100.000000',
        'r.ShadowQuality': '1',
        'r.TextureQuality': '2',
        'r.ViewDistanceQuality': '2',
        'r.EffectsQuality': '1',
        'r.AntiAliasingMethod': '1',
        'r.PostProcessAAQuality': '1',
        'r.ReflectionQuality': '1',
        'r.FoliageQuality': '1',
        'r.ShadingRate': '1',
        'r.MotionBlurQuality': '0',
        'r.DepthOfFieldQuality': '0',
      },
    },
  },
  {
    id: 'quality',
    name: 'Calidad',
    description: 'V-Sync activado y calidad gráfica al máximo, con límite de FPS para estabilidad.',
    notes: 'Prioriza el aspecto. Úsalo si no buscas la máxima tasa de frames.',
    values: {
      'any': {
        bUseVSync: 'True',
        bUseDynamicResolution: 'False',
        PreferredRefreshRate: '144.000000',
        FrameRateLimit: '144.000000',
        't.MaxFPS': '144.000000',
        'r.ScreenPercentage': '100.000000',
        'r.ShadowQuality': '3',
        'r.TextureQuality': '3',
        'r.ViewDistanceQuality': '3',
        'r.EffectsQuality': '3',
        'r.AntiAliasingMethod': '3',
        'r.PostProcessAAQuality': '3',
        'r.ReflectionQuality': '3',
        'r.FoliageQuality': '3',
        'r.ShadingRate': '2',
        'r.MotionBlurQuality': '2',
        'r.DepthOfFieldQuality': '2',
      },
    },
  },
];

export interface GameConfigBackup {
  gameId: string;
  gameName: string;
  configPath: string;
  backupPath: string;
  createdAt: string;
}

export interface ApplyProfileResult {
  ok: boolean;
  gameId: string;
  profile: InGameProfile;
  configPath: string;
  backupPath?: string;
  changedKeys: string[];
  error?: string;
}

function expandEnv(pathValue: string): string {
  return pathValue
    .replace(/%LOCALAPPDATA%/gi, process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'))
    .replace(/%APPDATA%/gi, process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'))
    .replace(/%PROGRAMFILES(X86)%/gi, process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)')
    .replace(/%PROGRAMFILES%/gi, process.env.ProgramFiles || 'C:\\Program Files')
    .replace(/%USERPROFILE%/gi, os.homedir());
}

export function resolveConfigPath(game: InGameGameConfig): string {
  return expandEnv(game.configPath);
}

/** Parses an Unreal-style .ini file into sections/entries. */
export function parseIni(content: string): IniDocument {
  const preamble: string[] = [];
  const sections: IniSection[] = [];
  let current: IniSection | null = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      if (current) current.entries.push({ key: '', value: '', raw: rawLine });
      continue;
    }
    if (line.startsWith(';') || line.startsWith('#')) {
      if (current) current.entries.push({ key: '', value: '', raw: rawLine });
      else preamble.push(rawLine);
      continue;
    }
    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      current = { name: sectionMatch[1].trim(), entries: [] };
      sections.push(current);
      continue;
    }
    const kv = line.match(/^([^=]+)=(.*)$/);
    if (kv && current) {
      current.entries.push({ key: kv[1].trim(), value: kv[2].trim(), raw: rawLine });
    } else if (current) {
      current.entries.push({ key: '', value: '', raw: rawLine });
    } else {
      preamble.push(rawLine);
    }
  }

  return { preamble, sections };
}

/** Rebuilds an .ini file from a parsed document. */
export function serializeIni(doc: IniDocument): string {
  const lines: string[] = [...doc.preamble];
  for (const section of doc.sections) {
    lines.push(`[${section.name}]`);
    for (const entry of section.entries) {
      lines.push(entry.key ? `${entry.key}=${entry.value}` : entry.raw);
    }
  }
  return lines.join('\r\n') + '\r\n';
}

/**
 * Applies the profile values to the document, creating sections/keys when
 * missing. Returns the list of keys that actually changed.
 */
export function applyValuesToDocument(
  doc: IniDocument,
  values: Record<string, Record<string, string>>,
  sectionOrder: string[]
): string[] {
  const changed: string[] = [];

  for (const sectionName of sectionOrder) {
    const sectionValues = values[sectionName] ?? values['any'];
    if (!sectionValues) continue;

    let section = doc.sections.find(s => s.name === sectionName);
    if (!section) {
      section = { name: sectionName, entries: [] };
      doc.sections.push(section);
    }

    for (const [key, value] of Object.entries(sectionValues)) {
      const existing = section.entries.find(e => e.key.toLowerCase() === key.toLowerCase());
      if (existing) {
        if (existing.value !== value) {
          changed.push(`${sectionName}.${key}: ${existing.value} -> ${value}`);
          existing.value = value;
          existing.raw = `${key}=${value}`;
        }
      } else {
        changed.push(`${sectionName}.${key}: (nuevo) -> ${value}`);
        section.entries.push({ key, value, raw: `${key}=${value}` });
      }
    }
  }

  return changed;
}

function gameBackupDir(): string {
  return getAppDataPath('Backups', 'game-configs');
}

/** Copies the original config file so the change can be reverted later. */
export async function backupGameConfig(
  game: InGameGameConfig,
  configPath: string
): Promise<string | undefined> {
  try {
    const content = await fs.readFile(configPath, 'utf8');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path.join(gameBackupDir(), stamp);
    await ensureDir(dir);
    const backupPath = path.join(dir, `${game.gameId}.ini`);
    await fs.writeFile(backupPath, content, 'utf8');
    // Sidecar metadata so a Zero Danger restore knows where to put the file back.
    await fs.writeFile(
      path.join(dir, `${game.gameId}.json`),
      JSON.stringify(
        { gameId: game.gameId, gameName: game.name, configPath, createdAt: new Date().toISOString() },
        null,
        2
      ),
      'utf8'
    );
    logger.info(`Game config backup created: ${backupPath}`);
    return backupPath;
  } catch (err) {
    logger.warn(`Could not back up ${configPath}: ${(err as Error).message}`);
    return undefined;
  }
}

/** Lists the in-game config backups that can be restored. */
export async function listGameConfigBackups(): Promise<GameConfigBackup[]> {
  const root = gameBackupDir();
  const stamps = await fs.readdir(root).catch(() => [] as string[]);
  const result: GameConfigBackup[] = [];
  for (const stamp of stamps.sort().reverse()) {
    const files = await fs.readdir(path.join(root, stamp)).catch(() => [] as string[]);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const meta = await fs
        .readFile(path.join(root, stamp, file), 'utf8')
        .then(text => JSON.parse(text) as GameConfigBackup)
        .catch(() => null);
      if (meta) result.push({ ...meta, backupPath: path.join(root, stamp, `${meta.gameId}.ini`) });
    }
  }
  return result;
}

/** Restores the most recent backup of a game config. */
export async function revertGameConfig(
  game: InGameGameConfig
): Promise<{ ok: boolean; restoredFrom?: string; error?: string }> {
  const configPath = resolveConfigPath(game);
  try {
    const dir = gameBackupDir();
    const entries = await fs.readdir(dir).catch(() => [] as string[]);
    const stamps = entries.filter(e => e !== 'latest').sort().reverse();
    for (const stamp of stamps) {
      const candidate = path.join(dir, stamp, `${game.gameId}.ini`);
      const content = await fs.readFile(candidate, 'utf8').catch(() => null);
      if (content === null) continue;
      await ensureDir(path.dirname(configPath));
      await fs.writeFile(configPath, content, 'utf8');
      logger.info(`Game config restored from ${candidate}`);
      return { ok: true, restoredFrom: candidate };
    }
    return { ok: false, error: 'No hay copias de seguridad de este juego' };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Applies a profile to a game configuration file.
 * The original file is always backed up before the first write.
 */
export async function applyGameProfile(
  game: InGameGameConfig,
  profileId: InGameProfile
): Promise<ApplyProfileResult> {
  const profile = GAME_PROFILES.find(p => p.id === profileId);
  if (!profile) {
    return { ok: false, gameId: game.gameId, profile: profileId, configPath: '', changedKeys: [], error: 'Perfil desconocido' };
  }
  if (!game.supported) {
    return { ok: false, gameId: game.gameId, profile: profileId, configPath: '', changedKeys: [], error: 'Juego no compatible todavía' };
  }

  const configPath = resolveConfigPath(game);

  try {
    const existing = await fs.readFile(configPath, 'utf8').catch(() => '');
    const backupPath = await backupGameConfig(game, configPath);

    const doc = parseIni(existing);
    const sectionOrder = Object.keys(game.writableKeys ?? {});
    if (sectionOrder.length === 0) sectionOrder.push('/Script/Engine.GameUserSettings', 'SystemSettings');
    const changedKeys = applyValuesToDocument(doc, profile.values, sectionOrder);

    await ensureDir(path.dirname(configPath));
    await fs.writeFile(configPath, serializeIni(doc), 'utf8');

    return {
      ok: true,
      gameId: game.gameId,
      profile: profileId,
      configPath,
      backupPath,
      changedKeys,
    };
  } catch (err) {
    return {
      ok: false,
      gameId: game.gameId,
      profile: profileId,
      configPath,
      changedKeys: [],
      error: (err as Error).message,
    };
  }
}

/**
 * Sets an explicit FPS cap in the game configuration (frame rate limit only,
 * without touching any other setting). The original file is backed up first.
 */
export async function setGameFpsCap(
  game: InGameGameConfig,
  cap: number
): Promise<ApplyProfileResult> {
  const configPath = resolveConfigPath(game);
  try {
    const existing = await fs.readFile(configPath, 'utf8').catch(() => '');
    const backupPath = await backupGameConfig(game, configPath);

    const doc = parseIni(existing);
    const values = {
      '/Script/Engine.GameUserSettings': {
        FrameRateLimit: cap.toFixed(6),
        PreferredRefreshRate: cap.toFixed(6),
      },
      '/Script/Engine.Engine': {
        't.MaxFPS': cap.toFixed(6),
      },
    };
    const changedKeys = applyValuesToDocument(
      doc,
      values,
      Object.keys(game.writableKeys ?? values)
    );

    await ensureDir(path.dirname(configPath));
    await fs.writeFile(configPath, serializeIni(doc), 'utf8');

    return {
      ok: true,
      gameId: game.gameId,
      profile: 'max_performance',
      configPath,
      backupPath,
      changedKeys,
    };
  } catch (err) {
    return {
      ok: false,
      gameId: game.gameId,
      profile: 'max_performance',
      configPath,
      changedKeys: [],
      error: (err as Error).message,
    };
  }
}

/** Reads the current values of the writable keys so the UI can show them. */
export async function readGameConfig(
  game: InGameGameConfig
): Promise<{ ok: boolean; exists: boolean; configPath: string; values: Record<string, string>; error?: string }> {
  const configPath = resolveConfigPath(game);
  try {
    const content = await fs.readFile(configPath, 'utf8');
    const doc = parseIni(content);
    const values: Record<string, string> = {};
    for (const section of doc.sections) {
      for (const entry of section.entries) {
        if (entry.key) values[`${section.name}.${entry.key}`] = entry.value;
      }
    }
    return { ok: true, exists: true, configPath, values };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return { ok: true, exists: false, configPath, values: {} };
    }
    return { ok: false, exists: false, configPath, values: {}, error: (err as Error).message };
  }
}

/**
 * NVIDIA Reflex / AMD Anti-Lag cannot be set from a game ini, they live in
 * the driver control panel. We detect the vendor and tell the user what to do
 * instead of pretending to change it.
 */
export async function detectLatencyTechnology(): Promise<{
  vendor: 'NVIDIA' | 'AMD' | 'Intel' | 'Unknown';
  technology: 'Reflex' | 'Anti-Lag' | 'XeSS' | null;
  available: boolean;
  note: string;
}> {
  try {
    const { stdout } = await execPowerShell(
      `(Get-CimInstance Win32_VideoController | Select-Object -First 1).Name`
    );
    const name = stdout.trim();
    if (/NVIDIA/i.test(name)) {
      return {
        vendor: 'NVIDIA',
        technology: 'Reflex',
        available: true,
        note: 'NVIDIA Reflex: actívalo en el Panel de control de NVIDIA (Gestión de 3D > Configuración global > Reflex).',
      };
    }
    if (/AMD|Radeon/i.test(name)) {
      return {
        vendor: 'AMD',
        technology: 'Anti-Lag',
        available: true,
        note: 'AMD Anti-Lag: actívalo en el software de AMD Adrenalin (Configuración > juegos > Anti-Lag).',
      };
    }
    if (/Intel/i.test(name)) {
      return {
        vendor: 'Intel',
        technology: 'XeSS',
        available: false,
        note: 'Intel XeSS: actívalo dentro del propio juego si es compatible.',
      };
    }
    return {
      vendor: 'Unknown',
      technology: null,
      available: false,
      note: 'No se ha podido detectar la GPU para configurar la tecnología de latencia.',
    };
  } catch {
    return { vendor: 'Unknown', technology: null, available: false, note: 'No se ha podido detectar la GPU.' };
  }
}
