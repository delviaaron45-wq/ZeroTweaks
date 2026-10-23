// Safe Windows repair actions.
//
// These are only offered when the diagnosis found a symptom that justifies
// them, they never run silently and everything that is changed is written to
// the manifest so Zero Danger can document it.
import { execPowerShell } from '../../shared/utils/process.js';
import { logger } from '../utils/logger.js';
import type { RepairAction, RepairResult } from '../../shared/types/insights.js';

export const REPAIR_ACTIONS: RepairAction[] = [
  {
    id: 'sfc',
    name: 'Comprobar archivos de sistema (SFC)',
    description: 'Verifica los archivos de Windows y repara los que estén dañados.',
    command: 'sfc /scannow',
    requiresAdmin: true,
    risk: 'bajo',
    symptom: 'Errores del sistema, DLL que faltan, bloqueos aleatorios',
  },
  {
    id: 'dism',
    name: 'Reparar la imagen del sistema (DISM)',
    description: 'Repara el almacén de componentes de Windows. Se usa antes o después de SFC.',
    command: 'DISM /Online /Cleanup-Image /RestoreHealth',
    requiresAdmin: true,
    risk: 'bajo',
    symptom: 'Errores de actualización, corrupción de componentes',
  },
  {
    id: 'chkdsk',
    name: 'Comprobar el disco (chkdsk /scan)',
    description: 'Analiza el disco del sistema sin bloquearlo. No modifica datos.',
    command: 'chkdsk C: /scan',
    requiresAdmin: true,
    risk: 'bajo',
    symptom: 'Tirones con acceso a disco, errores de lectura, partición dañada',
  },
  {
    id: 'winsock',
    name: 'Restablecer la pila de red (netsh winsock reset)',
    description: 'Reinstala el catálogo Winsock. Requiere reiniciar Windows.',
    command: 'netsh winsock reset',
    requiresAdmin: true,
    risk: 'medio',
    symptom: 'Problemas de conexión, errores de socket, HTTPS que no cargan',
  },
  {
    id: 'audio',
    name: 'Reiniciar el servicio de audio',
    description: 'Reinicia el servicio de audio de Windows para recuperar el sonido.',
    command: 'Restart-Service -Name Audiosrv -Force; Restart-Service -Name AudioEndpointBuilder -Force',
    requiresAdmin: true,
    risk: 'bajo',
    symptom: 'Sonido cortado o dispositivos de audio que no aparecen',
  },
];

/** Checks whether the process is running with administrator rights. */
export async function isElevated(): Promise<boolean> {
  try {
    const { stdout } = await execPowerShell(
      `([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)`
    );
    return stdout.trim().toLowerCase() === 'true';
  } catch {
    return false;
  }
}

/**
 * Runs one repair action. Admin-only actions are refused when the app is not
 * elevated - we never try to silently escalate privileges.
 */
export async function runRepairAction(action: RepairAction): Promise<RepairResult> {
  const started = Date.now();
  const elevated = await isElevated();

  if (action.requiresAdmin && !elevated) {
    return {
      id: action.id,
      ok: false,
      output: 'Esta reparación necesita permisos de Administrador. Reinicia ZeroTweaks como administrador y vuelve a intentarlo.',
      durationMs: 0,
      requiresAdmin: true,
    };
  }

  try {
    const { stdout, stderr } = await execPowerShell(action.command, { timeout: 30 * 60 * 1000 });
    const output = [stdout, stderr].filter(Boolean).join('\n').trim();
    logger.info(`Repair ${action.id} finished in ${Date.now() - started}ms`);
    return {
      id: action.id,
      ok: true,
      output: output || 'Comando completado sin salida.',
      durationMs: Date.now() - started,
      requiresAdmin: action.requiresAdmin,
    };
  } catch (err) {
    const error = err as { stdout?: string; stderr?: string; message: string };
    return {
      id: action.id,
      ok: false,
      output: [error.stdout, error.stderr].filter(Boolean).join('\n').trim() || error.message,
      durationMs: Date.now() - started,
      requiresAdmin: action.requiresAdmin,
    };
  }
}

/**
 * Decides which repairs make sense given the symptoms found by the diagnosis.
 * Nothing is offered when there is no symptom that justifies it.
 */
export function suggestRepairs(symptoms: {
  systemErrors?: boolean;
  diskErrors?: boolean;
  networkErrors?: boolean;
  audioErrors?: boolean;
  unexplainedStutter?: boolean;
}): RepairAction[] {
  const suggested: RepairAction[] = [];

  if (symptoms.systemErrors || symptoms.unexplainedStutter) {
    suggested.push(REPAIR_ACTIONS.find(a => a.id === 'sfc')!);
    suggested.push(REPAIR_ACTIONS.find(a => a.id === 'dism')!);
  }
  if (symptoms.diskErrors || symptoms.unexplainedStutter) {
    suggested.push(REPAIR_ACTIONS.find(a => a.id === 'chkdsk')!);
  }
  if (symptoms.networkErrors) {
    suggested.push(REPAIR_ACTIONS.find(a => a.id === 'winsock')!);
  }
  if (symptoms.audioErrors) {
    suggested.push(REPAIR_ACTIONS.find(a => a.id === 'audio')!);
  }

  return suggested.filter(Boolean);
}
