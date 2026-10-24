// Ambient typing for the `winreg` package.
//
// winreg is CommonJS and does `module.exports = Registry`, i.e. the module IS
// the constructor: a named import (`import { Registry } from 'winreg'`) yields
// `undefined` and every call fails with "Registry is not a constructor". The
// correct shape is a default import (with esModuleInterop) or `import x = require()`,
// so this declaration uses `export =`.
declare module 'winreg' {
  interface RegistryOptions {
    hive?: string;
    key?: string;
    host?: string;
    arch?: 'x86' | 'x64';
  }

  interface RegistryItem {
    name: string;
    type: string;
    value: string | number | Buffer;
  }

  class Registry {
    /** Hive ids: `Registry.HKLM` === 'HKLM', `Registry.HKCU` === 'HKCU', ... */
    static HKLM: string;
    static HKCU: string;
    static HKCR: string;
    static HKU: string;
    static HKCC: string;
    static DEFAULT_VALUE: string;
    static REG_SZ: string;
    static REG_MULTI_SZ: string;
    static REG_EXPAND_SZ: string;
    static REG_DWORD: string;
    static REG_QWORD: string;
    static REG_BINARY: string;
    static REG_NONE: string;

    constructor(options?: RegistryOptions);

    readonly host: string;
    readonly hive: string;
    readonly key: string;
    readonly path: string;
    readonly arch: string | null;

    get(name: string, callback: (error: Error | null, result?: RegistryItem) => void): void;
    set(
      name: string,
      type: string,
      value: string | number | Buffer,
      callback: (error: Error | null) => void
    ): void;
    remove(name: string, callback: (error: Error | null) => void): void;
    create(callback: (error: Error | null) => void): void;
    keyExists(callback: (error: Error | null, exists?: boolean) => void): void;
    valueExists(name: string, callback: (error: Error | null, exists?: boolean) => void): void;
    values(callback: (error: Error | null, items?: RegistryItem[]) => void): void;
    erase(callback: (error: Error | null) => void): void;
  }

  export = Registry;
}
