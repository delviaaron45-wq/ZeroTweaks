// Overlay Manager - Transparent click-through overlay window
import { BrowserWindow, screen, globalShortcut } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { isDev } from '../utils/env';
import { logger } from '../utils/logger';
import type { OverlayConfig, OverlayModule } from '../../shared/types/all';

export class OverlayManager {
  private overlayWindow: BrowserWindow | null = null;
  private config: OverlayConfig = {
    enabled: false,
    position: { x: 50, y: 50 },
    scale: 1.0,
    opacity: 0.9,
    clickThrough: true,
    modules: ['cpu', 'ram', 'gpu', 'ping', 'timer'],
    globalHotkey: 'Ctrl+Shift+O',
  };

  async initialize(config?: Partial<OverlayConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    await this.createOverlayWindow();
    this.registerGlobalHotkey();
    logger.info('Overlay Manager initialized');
  }

  private async createOverlayWindow(): Promise<void> {
    this.overlayWindow = new BrowserWindow({
      width: 300,
      height: 200,
      x: this.config.position.x,
      y: this.config.position.y,
      show: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      hasShadow: false,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: join(__dirname, '../../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    // Make click-through
    if (this.config.clickThrough) {
      this.overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    }

    // Set opacity
    this.overlayWindow.setOpacity(this.config.opacity);

    // Load overlay content
    if (isDev) {
      await this.overlayWindow.loadURL('http://localhost:5173/overlay');
    } else {
      const overlayHtml = join(__dirname, '../../renderer/overlay.html');
      if (!existsSync(overlayHtml)) {
        logger.warn(`Overlay HTML not found at ${overlayHtml}. The overlay HUD will stay disabled.`);
        this.overlayWindow.destroy();
        this.overlayWindow = null;
        return;
      }
      await this.overlayWindow.loadFile(overlayHtml);
    }

    // Send config to overlay
    this.overlayWindow.webContents.on('did-finish-load', () => {
      this.overlayWindow!.webContents.send('overlay:config', this.config);
    });
  }

  private registerGlobalHotkey(): void {
    const ret = globalShortcut.register(this.config.globalHotkey, () => {
      this.toggle();
    });
    if (!ret) {
      logger.warn(`Failed to register global hotkey: ${this.config.globalHotkey}`);
    }
  }

  async show(): Promise<void> {
    if (this.overlayWindow && !this.overlayWindow.isVisible()) {
      this.overlayWindow.showInactive();
      this.config.enabled = true;
      await this.updateConfig();
    }
  }

  async hide(): Promise<void> {
    if (this.overlayWindow && this.overlayWindow.isVisible()) {
      this.overlayWindow.hide();
      this.config.enabled = false;
      await this.updateConfig();
    }
  }

  async toggle(): Promise<void> {
    if (this.config.enabled) {
      await this.hide();
    } else {
      await this.show();
    }
  }

  async updateConfig(config?: Partial<OverlayConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.overlayWindow) {
      // Update position
      this.overlayWindow.setPosition(this.config.position.x, this.config.position.y);

      // Update scale (zoom)
      this.overlayWindow.webContents.setZoomFactor(this.config.scale);

      // Update opacity
      this.overlayWindow.setOpacity(this.config.opacity);

      // Update click-through
      this.overlayWindow.setIgnoreMouseEvents(this.config.clickThrough, { forward: true });

      // Send config to renderer
      this.overlayWindow.webContents.send('overlay:config', this.config);
    }
  }

  async setModules(modules: OverlayModule[]): Promise<void> {
    this.config.modules = modules;
    await this.updateConfig();
  }

  async setPosition(x: number, y: number): Promise<void> {
    this.config.position = { x, y };
    await this.updateConfig();
  }

  getConfig(): OverlayConfig {
    return { ...this.config };
  }

  isVisible(): boolean {
    return this.config.enabled;
  }

  async destroy(): Promise<void> {
    globalShortcut.unregister(this.config.globalHotkey);
    if (this.overlayWindow) {
      this.overlayWindow.destroy();
      this.overlayWindow = null;
    }
  }
}