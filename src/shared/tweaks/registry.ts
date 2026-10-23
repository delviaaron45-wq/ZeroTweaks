// Registry helper with proper error handling
// The ambient `declare module 'winreg'` lives in ./winreg.d.ts, which the
// tsconfig already picks up via the `src/shared/**/*` include, so no triple
// slash reference is needed here.
import { Registry } from 'winreg';
import { promisify } from 'util';

// Registry helper with proper error handling
export class RegistryManager {
  private static hives = {
    HKLM: '\\\\?\\HKLM',
    HKCU: '\\\\?\\HKCU',
    HKCR: '\\\\?\\HKCR',
    HKU: '\\\\?\\HKU',
    HKCC: '\\\\?\\HKCC',
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
    } catch (error: any) {
      if (error.code === 'ENOENT' || error.message?.includes('not found')) {
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
    await remove(name);
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