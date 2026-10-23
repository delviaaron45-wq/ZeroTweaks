// Smart game mode.
//
// The app watches which processes are running while a game is active, learns
// which ones are worth pausing and keeps an exclusion list the user can edit.
// Every session records what was actually freed so the user sees the result.
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';
import { KNOWN_HEAVY_APPS } from './heavySoftware.js';
import type { GameSessionRecord, PausableCandidate } from '../../shared/types/insights.js';

/** Processes that are never paused, no matter what the learning says. */
const ALWAYS_EXCLUDE = [
  'explorer',
  'dwm',
  'csrss',
  'wininit',
  'winlogon',
  'services',
  'lsass',
  'svchost',
  'System',
  'audiodg',
  'conhost',
  'RuntimeBroker',
  'ShellExperienceHost',
  'StartMenuExperienceHost',
  'TextInputHost',
  'SearchHost',
  'ApplicationFrameHost',
  'msedgewebview2',
  'GameBar',
  'GameBarPresenceWriter',
];

/** Games we know how to recognise. */
const GAME_PROCESS_PATTERNS = [
  { pattern: 'FortniteClient', name: 'Fortnite' },
  { pattern: 'VALORANT-Win64', name: 'Valorant' },
  { pattern: 'cs2', name: 'Counter-Strike 2' },
  { pattern: 'EpicGamesLauncher', name: 'Epic Games' },
  { pattern: 'steam', name: 'Steam' },
];

interface LearningState {
  /** Process -> number of sessions where it was running with a game. */
  observations: Record<string, number>;
  sessions: number;
  excluded: string[];
  lastSession?: GameSessionRecord;
}

const STATE_FILE = 'game-mode-learning.json';

function statePath(): string {
  const appData = process.env.APPDATA || `${process.env.USERPROFILE || ''}\\AppData\\Roaming`;
  return `${appData}\\ZeroTweaks\\${STATE_FILE}`;
}

async function readState(): Promise<LearningState> {
  try {
    const { stdout } = await execPowerShell(
      `Get-Content '${statePath().replace(/'/g, "''")}' -Raw -ErrorAction SilentlyContinue`
    );
    if (!stdout.trim()) throw new Error('empty');
    return JSON.parse(stdout) as LearningState;
  } catch {
    return { observations: {}, sessions: 0, excluded: [] };
  }
}

async function writeState(state: LearningState): Promise<void> {
  try {
    const json = JSON.stringify(state, null, 2).replace(/'/g, "''");
    await execPowerShell(
      `$p = '${statePath().replace(/'/g, "''")}'; $d = Split-Path $p; if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }; Set-Content -Path $p -Value '${json}' -Encoding UTF8`
    );
  } catch (err) {
    logger.warn('could not persist game mode learning state', err);
  }
}

/** Returns the game that is currently running, if any. */
export async function detectRunningGame(): Promise<{ name: string; process: string } | null> {
  try {
    const { stdout } = await execPowerShell(`
      $procs = Get-Process -ErrorAction SilentlyContinue | Select-Object ProcessName
      $names = @($procs | ForEach-Object { $_.ProcessName })
      $names | ConvertTo-Json
    `, { timeout: 10000 });

    const parsed = JSON.parse(stdout.trim() || '[]');
    const names: string[] = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];

    for (const game of GAME_PROCESS_PATTERNS) {
      if (names.some(n => n.toLowerCase().includes(game.pattern.toLowerCase()))) {
        return { name: game.name, process: game.pattern };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Lists the processes that could be paused while a game runs, marking the ones
 * the learning considers safe to pause.
 */
export async function listPausableCandidates(): Promise<PausableCandidate[]> {
  const state = await readState();
  const excluded = new Set([...state.excluded, ...ALWAYS_EXCLUDE]);

  try {
    const { stdout } = await execPowerShell(`
      $known = @(${KNOWN_HEAVY_APPS.map(a => `'${a.process.replace(/'/g, "''")}'`).join(',')})
      $procs = Get-Process -ErrorAction SilentlyContinue | Where-Object { $known -contains $_.ProcessName }
      $result = @()
      foreach ($p in $procs) {
        $result += @{
          Name = $p.ProcessName
          RamMB = [math]::Round($p.WorkingSet64 / 1MB, 1)
          Cpu = [math]::Round($p.CPU, 1)
        }
      }
      @{ Processes = @($result) } | ConvertTo-Json -Depth 4
    `, { timeout: 15000 });

    const parsed = JSON.parse(stdout.trim());
    const running: { Name: string; RamMB: number; Cpu: number }[] = Array.isArray(parsed.Processes)
      ? parsed.Processes
      : parsed.Processes
        ? [parsed.Processes]
        : [];

    const candidates: PausableCandidate[] = [];
    for (const app of KNOWN_HEAVY_APPS) {
      const match = running.find(p => p.Name.toLowerCase() === app.process.toLowerCase());
      if (!match) continue;
      const observations = state.observations[app.process] ?? 0;
      const isExcluded = excluded.has(app.process);
      const ratio = state.sessions > 0 ? observations / state.sessions : 0;
      candidates.push({
        process: app.process,
        name: app.name,
        ramMB: match.RamMB,
        cpuPercent: 0,
        autoPaused: !isExcluded && ratio >= 0.5,
        excluded: isExcluded,
        reason:
          ratio >= 0.5
            ? `Se ha visto en ${observations} de ${state.sessions} sesiones con el juego en marcha.`
            : 'Aún no hay datos suficientes sobre este programa.',
      });
    }
    return candidates;
  } catch (err) {
    logger.warn('could not list pausable candidates', err);
    return [];
  }
}

/** Records the current session: which heavy apps were running with the game. */
export async function recordSession(paused: string[], freedRamMB: number, freedCpuPercent: number): Promise<GameSessionRecord> {
  const state = await readState();
  state.sessions += 1;
  for (const process of paused) {
    state.observations[process] = (state.observations[process] ?? 0) + 1;
  }
  const record: GameSessionRecord = {
    startedAt: new Date().toISOString(),
    paused,
    closedApps: paused.length,
    freedRamMB: Math.round(freedRamMB),
    freedCpuPercent: Math.round(freedCpuPercent * 10) / 10,
  };
  state.lastSession = record;
  await writeState(state);
  return record;
}

/** Updates the exclusion list. */
export async function setExclusions(excluded: string[]): Promise<string[]> {
  const state = await readState();
  state.excluded = excluded.filter(p => !ALWAYS_EXCLUDE.includes(p));
  await writeState(state);
  return state.excluded;
}

/** Returns the persisted learning state (for transparency in the UI). */
export async function getLearningState(): Promise<LearningState> {
  return readState();
}
