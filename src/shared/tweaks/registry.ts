// Registry helper with proper error handling.
//
// winreg is CommonJS and does `module.exports = Registry`, so it must be
// imported as a default: a named import yields `undefined` and every registry
// tweak dies at call time with "Registry is not a constructor".
// The ambient `declare module 'winreg'` lives in ./winreg.d.ts, which the
// tsconfig already picks up via the `src/shared/**/*` include.
import Registry from 'winreg';
import { promisify } from 'util';

/**
 * `reg.exe` exits with code 1 when the key/value does not exist, and winreg
 * rethrows that as `ProcessUncleanExitError` with a *localized* message. The
 * old check only looked for the English "not found", so on a Spanish Windows a
 * missing value made `detect()` throw instead of reporting "not applied".
 *
 * Misuse errors (bad hive/key syntax) also exit with 1 but must stay visible:
 * they are bugs, not a "value is absent" answer.
 */
function isRegistryMiss(error: unknown): boolean {
  const err = error as { code?: string | number; message?: string } | null | undefined;
  if (!err) return false;
  const message = String(err.message ?? '');
  if (/invalid key name|incorrect syntax|nombre de clave no v|sintaxis incorrecta/i.test(message)) {
    return false;
  }
  if (err.code === 'ENOENT') return true;
  return err.code === 1 || /not found|cannot find|no ha podido encontrar/i.test(message);
}

// Registry helper with proper error handling
export class RegistryManager {
  // winreg spawns `reg.exe`, which only understands the plain hive names:
  // the extended-length `\\?\HKLM` form is rejected with "invalid key name".
  private static hives = {
    HKLM: Registry.HKLM,
    HKCU: Registry.HKCU,
    HKCR: Registry.HKCR,
    HKU: Registry.HKU,
    HKCC: Registry.HKCC,
  } as const;

  static getKey(hive: keyof typeof RegistryManager.hives, path: string): Registry {
    return new Registry({
      hive: RegistryManager.hives[hive],
      key: path,
      arch: 'x64', // Force 64-bit view
    });
  }

  static async getValue(hive: keyof typeof RegistryManager.hives, path: string, name: string): Promise<{ value: unknown; type: string; existed: boolean }> {
    const key = RegistryManager.getKey(hive, path);
    const getValue = promisify(key.get.bind(key)) as (name: string) => Promise<{ value: unknown; type: string }>;
    try {
      const result = await getValue(name);
      return { value: result.value, type: result.type, existed: true };
    } catch (error) {
      if (isRegistryMiss(error)) {
        return { value: null, type: 'REG_DWORD', existed: false };
      }
      throw error;
    }
  }

  static async setValue(hive: keyof typeof RegistryManager.hives, path: string, name: string, type: string, value: unknown): Promise<void> {
    const key = RegistryManager.getKey(hive, path);
    const setValue = promisify(key.set.bind(key)) as (name: string, type: string, value: unknown) => Promise<void>;
    await setValue(name, type, value);
  }

  static async createKey(hive: keyof typeof RegistryManager.hives, path: string): Promise<void> {
    const key = RegistryManager.getKey(hive, path);
    const create = promisify(key.create.bind(key)) as () => Promise<void>;
    await create();
  }

  static async deleteValue(hive: keyof typeof RegistryManager.hives, path: string, name: string): Promise<void> {
    const key = RegistryManager.getKey(hive, path);
    const remove = promisify(key.remove.bind(key)) as (name: string) => Promise<void>;
    try {
      await remove(name);
    } catch (error) {
      // Removing a value that is already absent is a no-op, not a failure.
      if (isRegistryMiss(error)) return;
      throw error;
    }
  }

  static async keyExists(hive: keyof typeof RegistryManager.hives, path: string): Promise<boolean> {
    const key = RegistryManager.getKey(hive, path);
    const keyExists = promisify(key.keyExists.bind(key)) as () => Promise<boolean>;
    return keyExists();
  }
}

// Helper to load user hive for HKCU operations under admin
export async function loadUserHive(sid: string): Promise<void> {
  const { execSync } = await import('child_process');
  execSync(`reg load HKU\\${sid}_Temp "C:\\Users\\${sid}\\NTUSER.DAT"`, { stdio: 'ignore' });
}

export async function unloadUserHive(sid: string): Promise<void> {
  const { execSync } = await import('child_process');
  execSync(`reg unload HKU\\${sid}_Temp`, { stdio: 'ignore' });
}

export async function getCurrentUserSid(): Promise<string> {
  const { execSync } = await import('child_process');
  const output = execSync('whoami /user /fo csv', { encoding: 'utf8' });
  const lines = output.trim().split('\n');
  if (lines.length > 1) {
    return lines[1].split(',')[1].replace(/"/g, '');
  }
  throw new Error('Could not get current user SID');
}