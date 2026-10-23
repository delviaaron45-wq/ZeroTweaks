export declare function execAsync(command: string, options?: {
    cwd?: string;
    timeout?: number;
}): Promise<{
    stdout: string;
    stderr: string;
}>;
export declare function execPowerShell(script: string, options?: {
    timeout?: number;
}): Promise<{
    stdout: string;
    stderr: string;
}>;
export declare function runAsAdmin(command: string): Promise<{
    stdout: string;
    stderr: string;
}>;
//# sourceMappingURL=process.d.ts.map