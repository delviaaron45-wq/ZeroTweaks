import { Registry } from 'winreg';
export declare class RegistryManager {
    private static hives;
    static getKey(hive: keyof typeof RegistryManager.hives, path: string): Registry;
    static getValue(hive: keyof typeof RegistryManager.hives, path: string, name: string): Promise<{
        value: unknown;
        type: string;
        existed: boolean;
    }>;
    static setValue(hive: keyof typeof RegistryManager.hives, path: string, name: string, type: string, value: unknown): Promise<void>;
    static createKey(hive: keyof typeof RegistryManager.hives, path: string): Promise<void>;
    static deleteValue(hive: keyof typeof RegistryManager.hives, path: string, name: string): Promise<void>;
    static keyExists(hive: keyof typeof RegistryManager.hives, path: string): Promise<boolean>;
}
export declare function loadUserHive(sid: string): Promise<void>;
export declare function unloadUserHive(sid: string): Promise<void>;
export declare function getCurrentUserSid(): Promise<string>;
//# sourceMappingURL=registry.d.ts.map