// Journal Manager - Transactional logging for safe tweak application
import { getAppDataPath, writeJson, readJson, ensureDir } from '../../shared/utils/files';
import { logger } from '../utils/logger';
import type { JournalEntry, BackupManifest, TweakState } from '../../shared/types/all';
import fs from 'fs/promises';

export class JournalManager {
  private journalPath: string;
  private currentJournal: JournalEntry[] = [];
  private currentManifest: BackupManifest | null = null;

  constructor() {
    this.journalPath = getAppDataPath('journal.json');
  }

  async initialize(manifest: BackupManifest): Promise<void> {
    this.currentManifest = manifest;
    await this.loadJournal();
  }

  async loadJournal(): Promise<void> {
    const journal = await readJson<JournalEntry[]>(this.journalPath);
    this.currentJournal = journal || [];
    if (this.currentJournal.length > 0) {
      logger.info(`Loaded journal with ${this.currentJournal.length} entries`);
    }
  }

  async logEntry(entry: Omit<JournalEntry, 'id' | 'timestamp'>): Promise<JournalEntry> {
    const fullEntry: JournalEntry = {
      ...entry,
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.currentJournal.push(fullEntry);
    await this.flush();

    // Also update manifest journal
    if (this.currentManifest) {
      this.currentManifest.journal = this.currentJournal;
      // Save manifest with updated journal
      const manifestDir = getAppDataPath('Backups', this.currentManifest.id);
      await writeJson(join(manifestDir, 'manifest.json'), this.currentManifest);
    }

    return fullEntry;
  }

  async flush(): Promise<void> {
    await ensureDir(getAppDataPath());
    await writeJson(this.journalPath, this.currentJournal);
  }

  async getPendingEntries(): Promise<JournalEntry[]> {
    return this.currentJournal.filter(e => !e.success);
  }

  async markEntryComplete(entryId: string, success: boolean, error?: string, newState?: TweakState): Promise<void> {
    const entry = this.currentJournal.find(e => e.id === entryId);
    if (entry) {
      entry.success = success;
      if (error) entry.error = error;
      if (newState) entry.newState = newState;
      await this.flush();
    }
  }

  async getJournal(): Promise<JournalEntry[]> {
    return [...this.currentJournal];
  }

  async clearJournal(): Promise<void> {
    this.currentJournal = [];
    await this.flush();
  }

  // Recovery: check if there are incomplete operations on startup
  async checkRecovery(): Promise<{ needsRecovery: boolean; entries: JournalEntry[] }> {
    await this.loadJournal();
    const incomplete = this.currentJournal.filter(e => !e.success);
    return {
      needsRecovery: incomplete.length > 0,
      entries: incomplete,
    };
  }

  // Complete a failed operation
  async recoverEntry(entry: JournalEntry, tweak: { apply: (options?: any) => Promise<any>; revert: (state: TweakState) => Promise<any> }): Promise<boolean> {
    try {
      if (entry.action === 'apply') {
        await tweak.apply({ force: true });
      } else if (entry.action === 'revert') {
        await tweak.revert(entry.previousState);
      }
      await this.markEntryComplete(entry.id, true);
      return true;
    } catch (error: any) {
      await this.markEntryComplete(entry.id, false, error.message);
      return false;
    }
  }

  // Revert all applied tweaks from journal
  async revertAll(tweaksMap: Map<string, { revert: (state: TweakState) => Promise<any> }>): Promise<void> {
    const appliedEntries = this.currentJournal
      .filter(e => e.action === 'apply' && e.success)
      .reverse(); // Reverse order for proper rollback

    for (const entry of appliedEntries) {
      const tweak = tweaksMap.get(entry.tweakId);
      if (tweak) {
        try {
          await tweak.revert(entry.previousState);
          await this.logEntry({
            tweakId: entry.tweakId,
            action: 'revert',
            previousState: entry.newState,
            newState: entry.previousState,
            success: true,
          });
        } catch (error: any) {
          logger.error(`Failed to revert ${entry.tweakId}:`, error);
        }
      }
    }
  }
}

function join(...paths: string[]): string {
  return paths.join('\\').replace(/\\+/g, '\\');
}