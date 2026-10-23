// Overlay Provider - Manages the performance overlay window
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { zerotweaks } from '../lib/api';
import type { OverlayConfig, OverlayModule } from '../../shared/types/all';

interface OverlayContextType {
  config: OverlayConfig;
  isVisible: boolean;
  showOverlay: () => Promise<void>;
  hideOverlay: () => Promise<void>;
  toggleOverlay: () => Promise<void>;
  updateConfig: (config: Partial<OverlayConfig>) => Promise<void>;
}

const OverlayContext = createContext<OverlayContextType | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<OverlayConfig>({
    enabled: false,
    position: { x: 50, y: 50 },
    scale: 1.0,
    opacity: 0.9,
    clickThrough: true,
    modules: ['cpu', 'ram', 'gpu', 'ping', 'timer'],
    globalHotkey: 'Ctrl+Shift+O',
  });
  const [isVisible, setIsVisible] = useState(false);

  // Load initial config
  useEffect(() => {
    void window.zerotweaks?.overlay?.['overlay:config']?.({}).then((c: OverlayConfig) => {
      if (c) setConfig(c);
    });
  }, []);

  // Listen for overlay updates from main process
  useEffect(() => {
    const unsubscribe = window.zerotweaks?.overlay?.['on:overlayUpdate']?.((data: Partial<OverlayConfig>) => {
      setConfig(prev => ({ ...prev, ...data }));
      setIsVisible(prev => data.enabled ?? prev);
    });
    return unsubscribe;
  }, []);

  const showOverlay = async () => {
    await window.zerotweaks?.overlay?.['overlay:show']?.();
    setIsVisible(true);
    setConfig(prev => ({ ...prev, enabled: true }));
  };

  const hideOverlay = async () => {
    await window.zerotweaks?.overlay?.['overlay:hide']?.();
    setIsVisible(false);
    setConfig(prev => ({ ...prev, enabled: false }));
  };

  const toggleOverlay = async () => {
    if (isVisible) await hideOverlay();
    else await showOverlay();
  };

  const updateConfig = async (newConfig: Partial<OverlayConfig>) => {
    await window.zerotweaks?.overlay?.['overlay:config']?.(newConfig);
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  return (
    <OverlayContext.Provider value={{ config, isVisible, showOverlay, hideOverlay, toggleOverlay, updateConfig }}>
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay() {
  const context = useContext(OverlayContext);
  if (!context) throw new Error('useOverlay must be used within OverlayProvider');
  return context;
}

// Overlay Window Component (renders in separate BrowserWindow)
interface OverlayWindowProps {
  config: OverlayConfig;
  metrics: {
    cpu: { usage: number; temp: number };
    ram: { used: number; total: number };
    gpu: { usage: number; temp: number; vram: number };
    ping: number;
    timer: { current: number; min: number; max: number };
    fps: number;
  };
}

export function OverlayWindow({ config, metrics }: OverlayWindowProps) {
  const { modules, position, scale, opacity, clickThrough } = config;

  if (!config.enabled) return null;

  const moduleComponents: Record<OverlayModule, React.ReactNode> = {
    cpu: (
      <div className="overlay-module">
        <div className="overlay-label">CPU</div>
        <div className="overlay-value">{metrics.cpu.usage.toFixed(1)}%</div>
        <div className="overlay-sub">{metrics.cpu.temp}°C</div>
      </div>
    ),
    ram: (
      <div className="overlay-module">
        <div className="overlay-label">RAM</div>
        <div className="overlay-value">{(metrics.ram.used / 1024).toFixed(1)} GB</div>
        <div className="overlay-sub">of {(metrics.ram.total / 1024).toFixed(0)} GB</div>
      </div>
    ),
    gpu: (
      <div className="overlay-module">
        <div className="overlay-label">GPU</div>
        <div className="overlay-value">{metrics.gpu.usage.toFixed(1)}%</div>
        <div className="overlay-sub">{metrics.gpu.temp}°C • {(metrics.gpu.vram / 1024).toFixed(1)} GB</div>
      </div>
    ),
    ping: (
      <div className="overlay-module">
        <div className="overlay-label">PING</div>
        <div className="overlay-value">{metrics.ping} ms</div>
      </div>
    ),
    timer: (
      <div className="overlay-module">
        <div className="overlay-label">TIMER</div>
        <div className="overlay-value">{(metrics.timer.current / 10000).toFixed(2)} ms</div>
        <div className="overlay-sub">Min: {(metrics.timer.min / 10000).toFixed(2)} ms</div>
      </div>
    ),
    fps: (
      <div className="overlay-module">
        <div className="overlay-label">FPS</div>
        <div className="overlay-value">{metrics.fps}</div>
      </div>
    ),
    temperature: (
      <div className="overlay-module">
        <div className="overlay-label">TEMP</div>
        <div className="overlay-value">CPU: {metrics.cpu.temp}°C</div>
        <div className="overlay-sub">GPU: {metrics.gpu.temp}°C</div>
      </div>
    ),
  };

  return (
    <div
      className="overlay-window"
      style={{
        transform: `scale(${scale})`,
        opacity,
        pointerEvents: clickThrough ? 'none' : 'auto',
      }}
      role="status"
      aria-live="polite"
    >
      <div className="overlay-grid">
        {modules.map(module => moduleComponents[module])}
      </div>
    </div>
  );
}