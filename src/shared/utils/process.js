"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execAsync = execAsync;
exports.execPowerShell = execPowerShell;
exports.runAsAdmin = runAsAdmin;
// Process execution utilities
const child_process_1 = require("child_process");
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
async function execAsync(command, options = {}) {
    // Use cmd.exe /c for Windows commands
    const { stdout, stderr } = await execFileAsync('cmd.exe', ['/c', command], {
        cwd: options.cwd,
        timeout: options.timeout || 30000,
        windowsHide: true,
        encoding: 'utf8',
    });
    return { stdout, stderr };
}
async function execPowerShell(script, options = {}) {
    const { stdout, stderr } = await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-Command', script
    ], {
        timeout: options.timeout || 30000,
        windowsHide: true,
        encoding: 'utf8',
    });
    return { stdout, stderr };
}
async function runAsAdmin(command) {
    // Use PowerShell Start-Process with -Verb RunAs
    const script = `Start-Process cmd.exe -ArgumentList '/c ${command.replace(/'/g, "''")}' -Verb RunAs -Wait -WindowStyle Hidden`;
    return execPowerShell(script);
}
//# sourceMappingURL=process.js.map