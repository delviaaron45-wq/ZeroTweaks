// Known heavy software detection.
//
// A small, curated database of programs that are known to eat RAM/CPU or to
// interfere with games, plus live measurement of what each one is actually
// using right now. Nothing is disabled without an explicit user action, and
// disabling the autostart keeps a backup of the original Run entry.
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';
import type { HeavyApp, HeavyAppKind, HeavySoftwareReport } from '../../shared/types/insights.js';

interface KnownApp {
  id: string;
  name: string;
  process: string;
  kind: HeavyAppKind;
  reason: string;
  alternative: string;
}

/**
 * The database is intentionally conservative: only programs that are widely
 * known to interfere with games are listed.
 */
export const KNOWN_HEAVY_APPS: KnownApp[] = [
  {
    id: 'icue',
    name: 'Corsair iCUE',
    process: 'iCUE',
    kind: 'rgb',
    reason: 'El control de RGB/ventiladores de Corsair mantiene varios servicios activos y se actualiza en segundo plano.',
    alternative: 'Deja que el BIOS o los ventiladores de la caja funcionen en modo directo y desactiva el arranque automático de iCUE.',
  },
  {
    id: 'armoury_crate',
    name: 'ASUS Armoury Crate / Aura',
    process: 'ArmouryCrate',
    kind: 'rgb',
    reason: 'Armoury Crate instala servicios de RGB y micro-control que consumen CPU y RAM de forma constante.',
    alternative: 'Usa Armoury Crate solo para configurar y desactiva su arranque automático.',
  },
  {
    id: 'asus_ghelper',
    name: 'ASUS G-Helper',
    process: 'GHelper',
    kind: 'rgb',
    reason: 'G-Helper es ligero, pero sigue vigilando sensores en segundo plano.',
    alternative: 'Desactívalo del arranque y actívalo solo cuando ajustes el portátil.',
  },
  {
    id: 'razer_synapse',
    name: 'Razer Synapse',
    process: 'RazerSynapse',
    kind: 'rgb',
    reason: 'Synapse mantiene el control de dispositivos RGB y de macros siempre activo.',
    alternative: 'Desactiva el arranque automático de Synapse.',
  },
  {
    id: 'logitech_ghub',
    name: 'Logitech G HUB',
    process: 'LGHUB',
    kind: 'rgb',
    reason: 'G HUB carga sus perfiles y efectos RGB de forma permanente.',
    alternative: 'Usa el software básico de Logitech y desactiva el arranque automático de G HUB.',
  },
  {
    id: 'steelseries_gg',
    name: 'SteelSeries GG',
    process: 'SteelSeriesGG',
    kind: 'rgb',
    reason: 'SteelSeries GG mantiene servicios de peripherals activos.',
    alternative: 'Desactiva el arranque automático de SteelSeries GG.',
  },
  {
    id: 'wallpaper_engine',
    name: 'Wallpaper Engine',
    process: 'wallpaper_engine',
    kind: 'other',
    reason: 'Renderiza fondos animados con la GPU y la CPU mientras juegas.',
    alternative: 'Pausa los fondos animados desde el propio Wallpaper Engine.',
  },
  {
    id: 'discord',
    name: 'Discord',
    process: 'Discord',
    kind: 'overlay',
    reason: 'Discord con overlay y captura de pantalla añade DPC y uso de GPU.',
    alternative: 'Desactiva el overlay de Discord o usa la versión sin captura.',
  },
  {
    id: 'nvidia_overlay',
    name: 'NVIDIA Overlay / GeForce Experience',
    process: 'NVIDIA Overlay',
    kind: 'overlay',
    reason: 'El overlay de NVIDIA graba y añade latencia de entrada.',
    alternative: 'Desactiva el overlay en Alt+Z o en el panel de control.',
  },
  {
    id: 'amd_software',
    name: 'AMD Software: Adrenalin Edition',
    process: 'RadeonSoftware',
    kind: 'overlay',
    reason: 'El overlay de AMD y sus recording hooks añaden latencia.',
    alternative: 'Desactiva el overlay en el software de AMD.',
  },
  {
    id: 'obs',
    name: 'OBS Studio (grabando)',
    process: 'obs64',
    kind: 'overlay',
    reason: 'OBS consumiendo CPU/GPU mientras graba deja pocos recursos para el juego.',
    alternative: 'Detén la grabación antes de jugar si no la necesitas.',
  },
  {
    id: 'xcloud',
    name: 'Xbox Game Bar / Game Bar',
    process: 'GameBar',
    kind: 'overlay',
    reason: 'La barra de juegos de Xbox mantiene processos en segundo plano.',
    alternative: 'Desactiva "Grabar con Game Bar" en Ajustes > Game Bar.',
  },
  {
    id: 'defender_antivirus',
    name: 'Windows Defender (análisis en segundo plano)',
    process: 'MsMpEng',
    kind: 'antivirus',
    reason: 'Los análisis programados de Defender consumen CPU y disco mientras juegas.',
    alternative: 'Deja el análisis programado para cuando no juegas, no lo desactives.',
  },
  {
    id: 'norton',
    name: 'Norton / McAfee / Kaspersky (suite de terceros)',
    process: 'ccSvcHst',
    kind: 'antivirus',
    reason: 'Las suites de seguridad de terceros inyectan filtros en el juego y pasan el disco y la red.',
    alternative: 'Windows Defender ya cubre lo mismo: desinstala la suite de terceros.',
  },
  {
    id: 'pc_paser',
    name: 'Optimizadores / "game boosters" dudosos',
    process: 'GameBooster',
    kind: 'optimizer',
    reason: 'Los "optimizadores" de pago suelen instalar servicios persistentes que ralentizan el equipo.',
    alternative: 'Desinstálalos: el diagnóstico de ZeroTweaks hace el trabajo con criterio y sin servicios permanentes.',
  },
  {
    id: 'epic_launcher',
    name: 'Epic Games Launcher',
    process: 'EpicGamesLauncher',
    kind: 'launcher',
    reason: 'Los launchers mantienen procesos y actualizaciones en segundo plano.',
    alternative: 'Cierra el launcher antes de jugar (el juego sigue funcionando).',
  },
  {
    id: 'steam_overlay',
    name: 'Steam Overlay',
    process: 'steamwebhelper',
    kind: 'overlay',
    reason: 'El overlay de Steam añade capas de entrada y captura.',
    alternative: 'Desactiva "Overlay de Steam" en los ajustes de Steam.',
  },
];

export interface HeavySoftwareOptions {
  /** Process names the user never wants to touch. */
  excluded?: string[];
}

/** Reads the live usage of the known heavy applications. */
export async function scanHeavySoftware(options: HeavySoftwareOptions = {}): Promise<HeavySoftwareReport> {
  const excluded = new Set(options.excluded ?? []);

  try {
    const { stdout } = await execPowerShell(`
      $names = @(${KNOWN_HEAVY_APPS.map(a => `'${a.process.replace(/'/g, "''")}'`).join(',')})
      $procs = Get-Process -ErrorAction SilentlyContinue | Where-Object { $names -contains $_.ProcessName }
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

    // CPU time is cumulative since process start, so it is normalised per minute
    // of uptime to obtain a comparable percentage.
    const { stdout: uptimeOut } = await execPowerShell(
      `[math]::Round(((Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime).TotalMinutes, 1)`
    );
    const uptimeMinutes = Math.max(Number(uptimeOut.trim()) || 1, 0.1);

    const apps: HeavyApp[] = [];
    let totalRamMB = 0;
    let totalCpuPercent = 0;

    for (const known of KNOWN_HEAVY_APPS) {
      const match = running.find(p => p.Name.toLowerCase() === known.process.toLowerCase());
      const cpuPercent = match ? Math.min(100, Math.round((match.Cpu / (uptimeMinutes * 60)) * 100 * 4)) : 0;
      const ramMB = match?.RamMB ?? 0;
      if (match) {
        totalRamMB += ramMB;
        totalCpuPercent += cpuPercent;
      }
      apps.push({
        id: known.id,
        name: known.name,
        process: known.process,
        kind: known.kind,
        reason: known.reason,
        alternative: known.alternative,
        running: !!match,
        ramMB,
        cpuPercent,
        startUpDisabled: false,
        excluded: excluded.has(known.process),
      });
    }

    const runningApps = apps.filter(a => a.running && !a.excluded);
    const summary =
      runningApps.length === 0
        ? 'No hay software pesado conocido en ejecución.'
        : `${runningApps.length} aplicación(es) conocidas consumen recursos: ${Math.round(totalRamMB)} MB de RAM en total.`;

    return { apps, totalRamMB: Math.round(totalRamMB), totalCpuPercent, summary };
  } catch (err) {
    logger.warn('heavy software scan failed', err);
    return {
      apps: KNOWN_HEAVY_APPS.map(a => ({
        ...a,
        running: false,
        ramMB: 0,
        cpuPercent: 0,
        startUpDisabled: false,
        excluded: excluded.has(a.process),
      })),
      totalRamMB: 0,
      totalCpuPercent: 0,
      summary: 'No se ha podido medir el software en ejecución.',
    };
  }
}

/** Closes the given processes (used by the "close now" action). */
export async function closeHeavyProcesses(processes: string[]): Promise<{ closed: string[]; failed: string[] }> {
  const closed: string[] = [];
  const failed: string[] = [];
  for (const name of processes) {
    try {
      await execPowerShell(
        `Get-Process -Name '${name.replace(/'/g, "''")}' -ErrorAction SilentlyContinue | Stop-Process -Force`
      );
      closed.push(name);
    } catch {
      failed.push(name);
    }
  }
  return { closed, failed };
}

/** Removes the autostart entries of a program, keeping a backup of them. */
export async function disableAutostart(
  process: string
): Promise<{ ok: boolean; removed: string[]; backupPath?: string; error?: string }> {
  const backupPath = await backupRunEntries(process);
  const removed: string[] = [];

  const { stdout: removedOut } = await execPowerShell(`
    $names = @('${process.replace(/'/g, "''")}')
    $removed = @()
    $paths = @(
      'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run'
    )
    foreach ($p in $paths) {
      if (-not (Test-Path $p)) { continue }
      $item = Get-ItemProperty -Path $p -ErrorAction SilentlyContinue
      if (-not $item) { continue }
      foreach ($prop in $item.PSObject.Properties) {
        if ($prop.Name -like 'PS*') { continue }
        $value = "$($prop.Value)"
        if ($value -match [regex]::Escape($names[0])) {
          Remove-ItemProperty -Path $p -Name $prop.Name -ErrorAction SilentlyContinue
          $removed += "$p :: $($prop.Name)"
        }
      }
    }
    $removed | ConvertTo-Json
  `, { timeout: 15000 }).catch(() => ({ stdout: '' }));

  try {
    const parsed = JSON.parse(removedOut.trim() || '[]');
    if (Array.isArray(parsed)) removed.push(...parsed);
    else if (parsed) removed.push(parsed);
  } catch {
    /* nothing removed */
  }

  return { ok: true, removed, backupPath };
}

/** Writes a backup of the Run entries that point to the given executable. */
async function backupRunEntries(process: string): Promise<string | undefined> {
  try {
    const { stdout } = await execPowerShell(`
      $paths = @(
        'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
        'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
        'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run'
      )
      $result = @{}
      foreach ($p in $paths) {
        if (-not (Test-Path $p)) { continue }
        $item = Get-ItemProperty -Path $p -ErrorAction SilentlyContinue
        if (-not $item) { continue }
        foreach ($prop in $item.PSObject.Properties) {
          if ($prop.Name -like 'PS*') { continue }
          if ("$($prop.Value)" -match '${process.replace(/'/g, "''")}') {
            $result["$p :: $($prop.Name)"] = "$($prop.Value)"
          }
        }
      }
      $result | ConvertTo-Json -Depth 4
    `, { timeout: 15000 });

    const entries = JSON.parse(stdout.trim() || '{}');
    const keys = Object.keys(entries ?? {});
    if (keys.length === 0) return undefined;

    const { getAppDataPath, writeJson } = await import('../../shared/utils/files.js');
    const backupDir = getAppDataPath('Backups', 'autostart');
    const file = `${backupDir}\\${process.replace(/[^a-z0-9]/gi, '_')}.json`;
    await writeJson(file, { process, entries, createdAt: new Date().toISOString() });
    return file;
  } catch (err) {
    logger.warn(`could not backup autostart entries for ${process}`, err);
    return undefined;
  }
}
