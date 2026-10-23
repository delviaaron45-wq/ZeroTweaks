// Game Mode Manager - Automatic game detection and optimization
import { execPowerShell } from '../../shared/utils/process';
import { logger } from '../utils/logger';
import type { GameProfile, GameTweakConfig } from '../../shared/types/all';

export class GameModeManager {
  private activeGame: GameProfile | null = null;
  private originalState: {
    powerPlan: string;
    timerResolution: number;
    gameMode: boolean;
    gameDVR: boolean;
    notifications: boolean;
    suspendedProcesses: string[];
  } | null = null;
  private gameProfiles: Map<string, GameProfile> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    await this.loadGameProfiles();
    logger.info('Game Mode Manager initialized');
  }

  async loadGameProfiles(): Promise<void> {
    // Load from store
    // For now, populate with known games
    this.populateKnownGames();
  }

  private populateKnownGames(): void {
    const knownGames: GameProfile[] = [
      // Steam games
      { id: 'steam_cs2', name: 'Counter-Strike 2', executable: 'cs2.exe', steamId: '730', tweaks: this.getCompetitiveConfig(), autoApply: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'steam_dota2', name: 'Dota 2', executable: 'dota2.exe', steamId: '570', tweaks: this.getCompetitiveConfig(), autoApply: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'steam_tf2', name: 'Team Fortress 2', executable: 'hl2.exe', steamId: '440', tweaks: this.getCompetitiveConfig(), autoApply: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      // Epic games
      { id: 'epic_fortnite', name: 'Fortnite', executable: 'FortniteClient-Win64-Shipping.exe', epicId: 'Fortnite', tweaks: this.getCompetitiveConfig(), autoApply: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      // Riot
      { id: 'riot_valorant', name: 'Valorant', executable: 'VALORANT.exe', tweaks: this.getCompetitiveConfig(), autoApply: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'riot_lol', name: 'League of Legends', executable: 'League of Legends.exe', tweaks: this.getCompetitiveConfig(), autoApply: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      // Battle.net
      { id: 'bnet_ow2', name: 'Overwatch 2', executable: 'Overwatch.exe', tweaks: this.getCompetitiveConfig(), autoApply: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      // Xbox
      { id: 'xbox_gamepass', name: 'Xbox Game Pass Games', executable: 'GamingServices.exe', tweaks: this.getCompetitiveConfig(), autoApply: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];

    for (const game of knownGames) {
      this.gameProfiles.set(game.id, game);
    }
  }

  private getCompetitiveConfig(): GameTweakConfig {
    return {
      powerPlan: 'ultimate',
      timerResolution: 5000, // 0.5ms
      cpuPriority: 'high',
      gameMode: true,
      gameDVR: false,
      notifications: false,
      suspendedProcesses: ['OneDrive.exe', 'SearchIndexer.exe', 'wuauserv', 'SysMain'],
      gpuProfile: {
        common: {
          hags: true,
          gpuPreference: 'high_performance',
          fullscreenOptimizations: false,
          mpo: false,
          vrr: true,
        },
      },
    };
  }

  async startGameMonitoring(): Promise<void> {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(async () => {
      await this.checkRunningGames();
    }, 5000); // Check every 5 seconds

    logger.info('Game monitoring started');
  }

  async stopGameMonitoring(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Game monitoring stopped');
    }
  }

  private async checkRunningGames(): Promise<void> {
    const runningGames = await this.getRunningGameProcesses();

    if (this.activeGame) {
      // Check if active game is still running
      const stillRunning = runningGames.some(g => g.id === this.activeGame!.id);
      if (!stillRunning) {
        await this.onGameExit(this.activeGame);
      }
    } else {
      // Check for new games
      for (const game of runningGames) {
        const profile = this.gameProfiles.get(game.id);
        if (profile && profile.autoApply) {
          await this.onGameLaunch(profile);
          break; // Only handle one game at a time
        }
      }
    }
  }

  private async getRunningGameProcesses(): Promise<{ id: string; executable: string; pid: number }[]> {
    const { stdout } = await execPowerShell(`
      $games = @(
        @{ Id='steam_cs2'; Exe='cs2.exe' },
        @{ Id='steam_dota2'; Exe='dota2.exe' },
        @{ Id='steam_tf2'; Exe='hl2.exe' },
        @{ Id='epic_fortnite'; Exe='FortniteClient-Win64-Shipping.exe' },
        @{ Id='riot_valorant'; Exe='VALORANT.exe' },
        @{ Id='riot_lol'; Exe='League of Legends.exe' },
        @{ Id='bnet_ow2'; Exe='Overwatch.exe' }
      )
      $running = Get-Process | Where-Object { $games.Exe -contains $_.ProcessName } | Select-Object ProcessName, Id
      $running | ForEach-Object {
        $match = $games | Where-Object { $_.Exe -eq $_.ProcessName }
        @{ Id = $match.Id; Executable = $_.ProcessName; Pid = $_.Id }
      } | ConvertTo-Json
    `);
    const result = stdout.trim();
    if (!result) return [];
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  async onGameLaunch(profile: GameProfile): Promise<void> {
    if (this.activeGame) {
      logger.warn(`Game already active: ${this.activeGame.name}, ignoring ${profile.name}`);
      return;
    }

    logger.info(`Game launched: ${profile.name}, applying optimizations...`);

    // Save original state
    this.originalState = await this.captureOriginalState();

    // Apply game optimizations
    await this.applyGameOptimizations(profile.tweaks);

    this.activeGame = profile;

    logger.info(`Optimizations applied for ${profile.name}`);
  }

  async onGameExit(profile: GameProfile): Promise<void> {
    if (!this.activeGame || this.activeGame.id !== profile.id) {
      return;
    }

    logger.info(`Game exited: ${profile.name}, reverting optimizations...`);

    // Revert optimizations
    await this.revertGameOptimizations();

    this.activeGame = null;
    this.originalState = null;

    logger.info(`Optimizations reverted for ${profile.name}`);
  }

  private async captureOriginalState(): Promise<typeof this.originalState> {
    const [powerPlan, timerRes, gameMode, gameDVR, notifications] = await Promise.all([
      execPowerShell('powercfg /getactivescheme').then(r => r.stdout.match(/([a-f0-9-]{36})/)?.[1] || ''),
      this.getCurrentTimerResolution(),
      this.getGameModeState(),
      this.getGameDVRState(),
      this.getNotificationsState(),
    ]);

    return {
      powerPlan,
      timerResolution: timerRes,
      gameMode,
      gameDVR,
      notifications,
      suspendedProcesses: [],
    };
  }

  private async getCurrentTimerResolution(): Promise<number> {
    // Would use native module to call NtQueryTimerResolution
    return 156250; // Default 15.6ms in 100ns units
  }

  private async getGameModeState(): Promise<boolean> {
    const sid = await this.getCurrentUserSid();
    const result = await execPowerShell(`reg query "HKU\\${sid}\\Software\\Microsoft\\GameBar" /v AutoGameModeEnabled 2>nul`);
    return result.stdout.includes('0x1');
  }

  private async getGameDVRState(): Promise<boolean> {
    const sid = await this.getCurrentUserSid();
    const result = await execPowerShell(`reg query "HKU\\${sid}\\System\\GameConfigStore" /v GameDVR_Enabled 2>nul`);
    return result.stdout.includes('0x1');
  }

  private async getNotificationsState(): Promise<boolean> {
    const result = await execPowerShell(`reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" /v NOC_GAME_MODE 2>nul`);
    return !result.stdout.includes('0x1'); // Inverted logic
  }

  private async applyGameOptimizations(config: GameTweakConfig): Promise<void> {
    // 1. Set power plan
    if (config.powerPlan === 'ultimate') {
      await execPowerShell('powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61');
      const { stdout } = await execPowerShell('powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61');
      const match = stdout.match(/([a-f0-9-]{36})/);
      if (match) await execPowerShell(`powercfg /setactive ${match[1]}`);
    } else if (config.powerPlan === 'high') {
      await execPowerShell('powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c');
    }

    // 2. Set timer resolution (via native module)
    // await native.setTimerResolution(config.timerResolution);

    // 3. Enable Game Mode
    if (config.gameMode) {
      const sid = await this.getCurrentUserSid();
      await execPowerShell(`reg add "HKU\\${sid}\\Software\\Microsoft\\GameBar" /v AutoGameModeEnabled /t REG_DWORD /d 1 /f`);
    }

    // 4. Disable GameDVR
    if (!config.gameDVR) {
      const sid = await this.getCurrentUserSid();
      await execPowerShell(`reg add "HKU\\${sid}\\System\\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d 0 /f`);
      await execPowerShell(`reg add "HKU\\${sid}\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 0 /f`);
      await execPowerShell(`reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v AllowGameDVR /t REG_DWORD /d 0 /f`);
    }

    // 5. Silence notifications
    if (!config.notifications) {
      await execPowerShell(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" /v NOC_GAME_MODE /t REG_DWORD /d 1 /f`);
    }

    // 6. Suspend background processes
    for (const proc of config.suspendedProcesses) {
      await execPowerShell(`Get-Process ${proc} -ErrorAction SilentlyContinue | ForEach-Object { $_.PriorityClass = 'Idle' }`);
    }

    // 7. Apply GPU profile (would use native NVAPI/ADLX)
    // await this.applyGpuProfile(config.gpuProfile);
  }

  private async revertGameOptimizations(): Promise<void> {
    if (!this.originalState) return;

    // 1. Restore power plan
    if (this.originalState.powerPlan) {
      await execPowerShell(`powercfg /setactive ${this.originalState.powerPlan}`);
    }

    // 2. Restore timer resolution
    // await native.setTimerResolution(this.originalState.timerResolution);

    // 3. Restore Game Mode
    const sid = await this.getCurrentUserSid();
    await execPowerShell(`reg add "HKU\\${sid}\\Software\\Microsoft\\GameBar" /v AutoGameModeEnabled /t REG_DWORD /d ${this.originalState.gameMode ? 1 : 0} /f`);

    // 4. Restore GameDVR
    await execPowerShell(`reg add "HKU\\${sid}\\System\\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d ${this.originalState.gameDVR ? 1 : 0} /f`);
    await execPowerShell(`reg add "HKU\\${sid}\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d ${this.originalState.gameDVR ? 1 : 0} /f`);
    await execPowerShell(`reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" /v AllowGameDVR /t REG_DWORD /d ${this.originalState.gameDVR ? 1 : 0} /f`);

    // 5. Restore notifications
    await execPowerShell(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" /v NOC_GAME_MODE /t REG_DWORD /d ${this.originalState.notifications ? 0 : 1} /f`);

    // 6. Resume suspended processes
    for (const proc of this.originalState.suspendedProcesses) {
      await execPowerShell(`Get-Process ${proc} -ErrorAction SilentlyContinue | ForEach-Object { $_.PriorityClass = 'Normal' }`);
    }

    // 7. Restore GPU profile
  }

  private async getCurrentUserSid(): Promise<string> {
    const { stdout } = await execPowerShell('whoami /user /fo csv');
    const lines = stdout.trim().split('\n');
    return lines[1]?.split(',')[1]?.replace(/"/g, '') || '';
  }

  getActiveGame(): GameProfile | null {
    return this.activeGame;
  }

  getGameProfiles(): GameProfile[] {
    return Array.from(this.gameProfiles.values());
  }

  async addGameProfile(profile: GameProfile): Promise<void> {
    this.gameProfiles.set(profile.id, profile);
    // Save to store
  }

  async removeGameProfile(id: string): Promise<void> {
    this.gameProfiles.delete(id);
  }
}