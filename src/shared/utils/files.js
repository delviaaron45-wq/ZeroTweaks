"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDir = ensureDir;
exports.writeJson = writeJson;
exports.readJson = readJson;
exports.fileExists = fileExists;
exports.getAppDataPath = getAppDataPath;
exports.getBackupDir = getBackupDir;
exports.getLogsDir = getLogsDir;
// File system utilities
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
async function ensureDir(dir) {
    await promises_1.default.mkdir(dir, { recursive: true });
}
async function writeJson(filePath, data) {
    await ensureDir(path_1.default.dirname(filePath));
    await promises_1.default.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}
async function readJson(filePath) {
    try {
        const content = await promises_1.default.readFile(filePath, 'utf8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
async function fileExists(filePath) {
    try {
        await promises_1.default.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
function getAppDataPath(...paths) {
    const appData = process.env.APPDATA || path_1.default.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
    return path_1.default.join(appData, 'ZeroTweaks', ...paths);
}
function getBackupDir() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return getAppDataPath('Backups', timestamp);
}
function getLogsDir() {
    return getAppDataPath('logs');
}
//# sourceMappingURL=files.js.map