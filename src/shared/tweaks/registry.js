"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistryManager = void 0;
exports.loadUserHive = loadUserHive;
exports.unloadUserHive = unloadUserHive;
exports.getCurrentUserSid = getCurrentUserSid;
const winreg_1 = require("winreg");
const util_1 = require("util");
// Registry helper with proper error handling
class RegistryManager {
    static hives = {
        HKLM: '\\\\?\\HKLM',
        HKCU: '\\\\?\\HKCU',
        HKCR: '\\\\?\\HKCR',
        HKU: '\\\\?\\HKU',
        HKCC: '\\\\?\\HKCC',
    };
    static getKey(hive, path) {
        return new winreg_1.Registry({
            hive: RegistryManager.hives[hive],
            key: path,
            arch: 'x64', // Force 64-bit view
        });
    }
    static async getValue(hive, path, name) {
        const key = RegistryManager.getKey(hive, path);
        const getValue = (0, util_1.promisify)(key.get.bind(key));
        try {
            const result = await getValue(name);
            return { value: result.value, type: result.type, existed: true };
        }
        catch (error) {
            if (error.code === 'ENOENT' || error.message?.includes('not found')) {
                return { value: null, type: 'REG_DWORD', existed: false };
            }
            throw error;
        }
    }
    static async setValue(hive, path, name, type, value) {
        const key = RegistryManager.getKey(hive, path);
        const setValue = (0, util_1.promisify)(key.set.bind(key));
        await setValue(name, type, value);
    }
    static async createKey(hive, path) {
        const key = RegistryManager.getKey(hive, path);
        const create = (0, util_1.promisify)(key.create.bind(key));
        await create();
    }
    static async deleteValue(hive, path, name) {
        const key = RegistryManager.getKey(hive, path);
        const remove = (0, util_1.promisify)(key.remove.bind(key));
        await remove(name);
    }
    static async keyExists(hive, path) {
        const key = RegistryManager.getKey(hive, path);
        const keyExists = (0, util_1.promisify)(key.keyExists.bind(key));
        return keyExists();
    }
}
exports.RegistryManager = RegistryManager;
// Helper to load user hive for HKCU operations under admin
async function loadUserHive(sid) {
    const { execSync } = await import('child_process');
    execSync(`reg load HKU\\${sid}_Temp "C:\\Users\\${sid}\\NTUSER.DAT"`, { stdio: 'ignore' });
}
async function unloadUserHive(sid) {
    const { execSync } = await import('child_process');
    execSync(`reg unload HKU\\${sid}_Temp`, { stdio: 'ignore' });
}
async function getCurrentUserSid() {
    const { execSync } = await import('child_process');
    const output = execSync('whoami /user /fo csv', { encoding: 'utf8' });
    const lines = output.trim().split('\n');
    if (lines.length > 1) {
        return lines[1].split(',')[1].replace(/"/g, '');
    }
    throw new Error('Could not get current user SID');
}
//# sourceMappingURL=registry.js.map