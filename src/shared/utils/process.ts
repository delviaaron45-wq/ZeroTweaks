// Process execution utilities
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function execAsync(command: string, options: { cwd?: string; timeout?: number } = {}): Promise<{ stdout: string; stderr: string }> {
  // Use cmd.exe /c for Windows commands
  const { stdout, stderr } = await execFileAsync('cmd.exe', ['/c', command], {
    cwd: options.cwd,
    timeout: options.timeout || 30000,
    windowsHide: true,
    encoding: 'utf8',
  });
  return { stdout, stderr };
}

export async function execPowerShell(script: string, options: { timeout?: number } = {}): Promise<{ stdout: string; stderr: string }> {
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

export async function runAsAdmin(command: string): Promise<{ stdout: string; stderr: string }> {
  // Use PowerShell Start-Process with -Verb RunAs
  const script = `Start-Process cmd.exe -ArgumentList '/c ${command.replace(/'/g, "''")}' -Verb RunAs -Wait -WindowStyle Hidden`;
  return execPowerShell(script);
}

/**
 * Run a PowerShell command and parse its stdout as JSON.
 *
 * Some tweaks shell out through `execAsync`, which routes the command through
 * `cmd.exe`. cmd mangles the PowerShell metacharacters (`$_`, `$false`, `{...}`)
 * so instead of executing the query PowerShell just echoes the command back as
 * plain text. Piping that into a bare `JSON.parse` threw
 * `SyntaxError: Unexpected token 'G' ... is not valid JSON` and surfaced as a
 * hard "Failed to load" error in the UI (seen on Debloat).
 *
 * Going through `execPowerShell` avoids the cmd.exe layer, and parsing here is
 * defensive: any non-JSON output returns `fallback` instead of throwing, so a
 * misbehaving probe degrades to a sensible default rather than breaking the
 * whole page.
 */
export async function execPowerShellJson<T>(
  command: string,
  fallback: T,
  options: { timeout?: number } = {}
): Promise<T> {
  try {
    const { stdout } = await execPowerShell(command, options);
    const text = stdout.trim();
    if (!text) return fallback;
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}