export declare function ensureDir(dir: string): Promise<void>;
export declare function writeJson<T>(filePath: string, data: T): Promise<void>;
export declare function readJson<T>(filePath: string): Promise<T | null>;
export declare function fileExists(filePath: string): Promise<boolean>;
export declare function getAppDataPath(...paths: string[]): string;
export declare function getBackupDir(): string;
export declare function getLogsDir(): string;
//# sourceMappingURL=files.d.ts.map