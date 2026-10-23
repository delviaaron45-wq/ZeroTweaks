// Main Process Type Declarations
import type { 
  Tweak, 
  TweakState, 
  TweakResult, 
  ApplyOptions,
  Profile, 
  HardwareProfile, 
  BenchmarkResult, 
  Settings, 
  GameProfile, 
  OverlayConfig, 
  JournalEntry, 
  BackupManifest,
  SpiderState 
} from '../../shared/types/all';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      VITE_APP_VERSION: string;
      SIGN_CERT_PATH?: string;
      SIGN_CERT_PASSWORD?: string;
    }
  }
}

export {};