// winreg.d.ts
declare module 'winreg' {
  export interface RegistryOptions {
    hive?: string;
    key?: string;
    host?: string;
    arch?: 'x86' | 'x64';
  }

  export interface RegistryItem {
    name: string;
    type: string;
    value: string | number | Buffer;
  }

  export class Registry {
    constructor(options: RegistryOptions);
    get(name: string, callback: (error: Error | null, result: RegistryItem) => void): void;
    set(name: string, type: string, value: string | number | Buffer, callback: (error: Error | null) => void): void;
    remove(name: string, callback: (error: Error | null) => void): void;
    create(callback: (error: Error | null) => void): void;
    keyExists(callback: (error: Error | null, exists: boolean) => void): void;
    values(callback: (error: Error | null, items: RegistryItem[]) => void): void;
    erase(callback: (error: Error | null) => void): void;
  }
}